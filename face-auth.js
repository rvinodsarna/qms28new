/* ============================================================================
 * face-auth.js — Client-side robust face recognition for UNIMY QMS RISE.
 * Uses face-api.js (TensorFlow.js) for detection, 68-point landmarks, and
 * 128-d face descriptors. Includes blink-based liveness detection so a
 * static photo cannot be used to spoof login.
 *
 * Server-side matching + passwordless session issuance is handled by the
 * "face-auth-ops" Supabase Edge Function (enroll / remove / identify).
 * ==========================================================================*/
(function () {
  "use strict";

  const MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/";
  const FACE_FN_URL = `${SUPABASE_URL}/functions/v1/face-auth-ops`;

  let modelsLoaded = false;
  let modelsLoadPromise = null;

  async function loadModels() {
    if (modelsLoaded) return true;
    if (modelsLoadPromise) return modelsLoadPromise;
    modelsLoadPromise = (async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        modelsLoaded = true;
        return true;
      } catch (e) {
        console.error("Face model load failed:", e);
        modelsLoaded = false;
        return false;
      }
    })();
    return modelsLoadPromise;
  }

  // Fast detector for live preview loop (per-frame), full SSD for the
  // final high-quality capture used to compute the stored/compared descriptor.
  const previewDetectorOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
  const captureDetectorOptions = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.6 });

  // ---- Eye Aspect Ratio (EAR) for blink-based liveness -------------------
  // Uses the standard 6-point-per-eye EAR formula on face-api's 68 landmarks.
  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function ear(eye) {
    // eye: array of 6 points [p1..p6] per Soukupová & Čech (2016)
    const a = dist(eye[1], eye[5]);
    const b = dist(eye[2], eye[4]);
    const c = dist(eye[0], eye[3]);
    return (a + b) / (2.0 * c);
  }
  function avgEar(landmarks) {
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    return (ear(leftEye) + ear(rightEye)) / 2;
  }

  async function startCamera(videoEl) {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 480 }, height: { ideal: 360 }, facingMode: "user" },
      audio: false,
    });
    videoEl.srcObject = stream;
    await videoEl.play().catch(() => {});
    return stream;
  }

  function stopCamera(stream) {
    if (!stream) return;
    stream.getTracks().forEach((t) => t.stop());
  }

  /**
   * Runs a liveness-gated capture loop against a <video> element.
   * Requires: a stable single face detected for a few consecutive frames,
   * THEN a blink (EAR dropping below threshold and recovering), THEN
   * `samplesNeeded` stable high-quality descriptor samples post-blink.
   *
   * onStatus(text) is called with human-readable progress messages.
   * onFrame({video, box}) is called each detection tick for optional overlay.
   * Returns { descriptors: number[][] } on success, or throws on abort/timeout.
   */
  async function runLivenessCapture(videoEl, { samplesNeeded = 1, timeoutMs = 25000, onStatus = () => {}, shouldAbort = () => false } = {}) {
    const ok = await loadModels();
    if (!ok) throw new Error("Face recognition models failed to load.");

    const EAR_CLOSED = 0.23;
    const EAR_OPEN = 0.25;
    let blinkState = "waiting_open"; // waiting_open -> waiting_closed -> waiting_reopen -> done (stays done)
    let stableFrames = 0;
    const samples = [];
    const start = Date.now();
    let blinkWaitStart = null;
    let hintShown = false;

    onStatus("Position your face in the frame…");

    while (samples.length < samplesNeeded) {
      if (shouldAbort()) throw new Error("aborted");
      if (Date.now() - start > timeoutMs) throw new Error("Timed out waiting for a clear face. Please try again.");

      const detections = await faceapi
        .detectAllFaces(videoEl, previewDetectorOptions)
        .withFaceLandmarks();

      if (detections.length === 0) {
        stableFrames = 0;
        onStatus("No face detected — center your face in the frame.");
        await new Promise((r) => setTimeout(r, 120));
        continue;
      }
      if (detections.length > 1) {
        stableFrames = 0;
        onStatus("Multiple faces detected — only one person should be in frame.");
        await new Promise((r) => setTimeout(r, 150));
        continue;
      }

      const det = detections[0];
      stableFrames++;
      const e = avgEar(det.landmarks);

      // Liveness only needs to be proven ONCE per session — after that we
      // burst-capture the remaining samples without demanding repeat blinks.
      // Requiring a fresh blink per sample made multi-sample enrollment nearly
      // impossible to complete (blink timing/EAR thresholds are noisy on real
      // webcams), so it would stall indefinitely in "Please blink naturally…".
      if (blinkState === "waiting_open") {
        if (stableFrames >= 5) {
          if (blinkWaitStart === null) blinkWaitStart = Date.now();
          blinkState = e < EAR_CLOSED ? "waiting_open" : "waiting_closed";
          if (blinkState === "waiting_closed") {
            onStatus("Face steady. Please blink naturally…");
          } else if (!hintShown && Date.now() - blinkWaitStart > 8000) {
            hintShown = true;
            onStatus("Still waiting for a blink — try a slower, deliberate blink…");
          }
        } else {
          onStatus("Hold still…");
        }
      } else if (blinkState === "waiting_closed") {
        if (e < EAR_CLOSED) {
          blinkState = "waiting_reopen";
          onStatus("Blink detected — hold still…");
        } else if (!hintShown && blinkWaitStart !== null && Date.now() - blinkWaitStart > 8000) {
          hintShown = true;
          onStatus("Still waiting for a blink — try a slower, deliberate blink…");
        }
      } else if (blinkState === "waiting_reopen") {
        if (e > EAR_OPEN) {
          blinkState = "done";
          onStatus("Liveness verified. Capturing…");
        }
      }

      if (blinkState === "done") {
        // High-quality capture pass using the more accurate SSD detector.
        const full = await faceapi
          .detectSingleFace(videoEl, captureDetectorOptions)
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (full && full.descriptor) {
          samples.push(Array.from(full.descriptor));
          onStatus(`Captured sample ${samples.length}/${samplesNeeded}…`);
          // Stay in "done" — burst-capture remaining samples, no repeat blink needed.
          await new Promise((r) => setTimeout(r, 350));
        }
      }

      await new Promise((r) => setTimeout(r, 90));
    }

    return { descriptors: samples };
  }

  async function callFaceFn(action, payload, accessToken) {
    const headers = { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const res = await fetch(FACE_FN_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ action, ...payload }),
    });
    let json;
    try {
      json = await res.json();
    } catch {
      json = { error: "Unexpected server response." };
    }
    if (!res.ok && !json.error) json.error = `Request failed (${res.status})`;
    return json;
  }

  async function getEnrollmentStatus() {
    try {
      const { data } = await supabaseClient.auth.getSession();
      const user = data?.session?.user;
      if (!user) return { enrolled: false };
      const { data: rows, error } = await supabaseClient
        .from("face_credentials")
        .select("enrolled_at, updated_at, descriptors")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error || !rows) return { enrolled: false };
      const count = Array.isArray(rows.descriptors) ? rows.descriptors.length : 0;
      return { enrolled: true, enrolledAt: rows.enrolled_at, updatedAt: rows.updated_at, count };
    } catch {
      return { enrolled: false };
    }
  }

  async function enroll(descriptors) {
    const { data } = await supabaseClient.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return { error: "Not signed in." };
    return callFaceFn("enroll", { descriptors }, token);
  }

  async function removeEnrollment() {
    const { data } = await supabaseClient.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return { error: "Not signed in." };
    return callFaceFn("remove", {}, token);
  }

  async function identify(descriptor) {
    return callFaceFn("identify", { descriptor });
  }

  window.FaceAuth = {
    loadModels,
    startCamera,
    stopCamera,
    runLivenessCapture,
    getEnrollmentStatus,
    enroll,
    removeEnrollment,
    identify,
  };

  // ==========================================================================
  // Login-screen orchestration: primary face-login panel + password fallback.
  // ==========================================================================
  let loginStream = null;
  let loginAbort = false;
  let loginRunning = false;

  function setRing(color) {
    const ring = document.getElementById("face-login-ring");
    if (ring) ring.style.borderColor = color;
  }

  function setStatus(text) {
    const el = document.getElementById("face-login-status");
    if (el) el.textContent = text;
  }

  function setError(text) {
    const el = document.getElementById("face-login-error");
    if (!el) return;
    if (!text) {
      el.className = "hidden";
      el.innerHTML = "";
      return;
    }
    el.className = "alert alert-error";
    el.innerHTML = `<span>❌</span><span>${text.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]))}</span>`;
  }

  function showRetry(show) {
    const btn = document.getElementById("face-login-retry-btn");
    if (btn) btn.classList.toggle("hidden", !show);
  }

  function teardownLoginCamera() {
    stopCamera(loginStream);
    loginStream = null;
  }

  window.__showPasswordPanel = function () {
    loginAbort = true;
    teardownLoginCamera();
    const fp = document.getElementById("face-login-panel");
    const pp = document.getElementById("password-login-panel");
    if (fp) fp.style.display = "none";
    if (pp) pp.style.display = "";
  };

  window.__showFaceLoginPanel = function () {
    const fp = document.getElementById("face-login-panel");
    const pp = document.getElementById("password-login-panel");
    if (pp) pp.style.display = "none";
    if (fp) fp.style.display = "";
    window.__startFaceLoginFlow();
  };

  window.__retryFaceLogin = function () {
    showRetry(false);
    setError("");
    window.__startFaceLoginFlow();
  };

  window.__startFaceLoginFlow = async function () {
    if (loginRunning) return;
    loginRunning = true;
    loginAbort = false;
    showRetry(false);
    setError("");
    setRing("transparent");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      loginRunning = false;
      window.__showPasswordPanel();
      return;
    }

    const video = document.getElementById("face-login-video");
    if (!video) {
      loginRunning = false;
      return;
    }

    try {
      setStatus("Loading face recognition…");
      const modelsOk = await loadModels();
      if (loginAbort) return;
      if (!modelsOk) {
        setStatus("");
        setError("Face recognition could not load. Please use your password.");
        showRetry(true);
        loginRunning = false;
        return;
      }

      setStatus("Starting camera…");
      try {
        loginStream = await startCamera(video);
      } catch (camErr) {
        if (loginAbort) return;
        setStatus("");
        setError("Camera access unavailable. Please use your password.");
        loginRunning = false;
        return;
      }
      if (loginAbort) {
        teardownLoginCamera();
        return;
      }

      const { descriptors } = await runLivenessCapture(video, {
        samplesNeeded: 1,
        timeoutMs: 25000,
        onStatus: (t) => {
          if (!loginAbort) setStatus(t);
        },
        shouldAbort: () => loginAbort,
      });
      if (loginAbort) {
        teardownLoginCamera();
        return;
      }

      setStatus("Verifying identity…");
      const result = await identify(descriptors[0]);
      teardownLoginCamera();
      if (loginAbort) return;

      if (result && result.matched && result.email && result.token_hash) {
        setRing("var(--success, #2e7d32)");
        setStatus("Identity confirmed. Signing you in…");
        // NOTE: Supabase GoTrue rejects verifyOtp() when both `email` and
        // `token_hash` are supplied together (400 validation_failed: "Only
        // the token_hash and type should be provided"). Only pass token_hash
        // + type for token-hash based verification.
        const { data, error } = await supabaseClient.auth.verifyOtp({
          token_hash: result.token_hash,
          type: "email",
        });
        if (error) {
          console.error("Face login verifyOtp failed:", error);
        }
        if (error || !data?.user) {
          setStatus("");
          setError("Could not complete face sign-in. Please use your password.");
          showRetry(true);
          loginRunning = false;
          return;
        }
        const completion = await window.__completeLoginAfterAuth(data.user);
        if (completion && completion.error) {
          setStatus("");
          setError(completion.error);
          showRetry(true);
        }
        loginRunning = false;
        return;
      }

      setRing("var(--error, #c62828)");
      setStatus("");
      if (result && result.error) {
        setError(result.error);
      } else {
        setError("Face not recognized. Please try again or use your password.");
      }
      showRetry(true);
      loginRunning = false;
    } catch (e) {
      teardownLoginCamera();
      if (loginAbort) {
        loginRunning = false;
        return;
      }
      setStatus("");
      setError(e && e.message ? e.message : "Face login failed. Please try again.");
      showRetry(true);
      loginRunning = false;
    }
  };

  // ==========================================================================
  // Profile settings: self-service enrollment card + guided capture modal.
  // ==========================================================================
  let enrollStream = null;
  let enrollAbort = false;

  function renderEnrollActions(enrolled, count) {
    const box = document.getElementById("face-enroll-actions");
    const line = document.getElementById("face-enroll-status-line");
    if (!box || !line) return;
    if (enrolled) {
      line.textContent = `✅ Face login is set up (${count} sample${count === 1 ? "" : "s"} enrolled).`;
      box.innerHTML =
        '<button class="btn btn-secondary" onclick="__openFaceEnrollModal()">🔄 Update Face Login</button> ' +
        '<button class="btn btn-ghost" onclick="__removeFaceEnrollment()">🗑 Remove</button>';
    } else {
      line.textContent = "Set up face login to sign in without a password.";
      box.innerHTML = '<button class="btn btn-primary" onclick="__openFaceEnrollModal()">📷 Set Up Face Login</button>';
    }
  }

  window.__mountFaceEnrollCard = async function () {
    const line = document.getElementById("face-enroll-status-line");
    if (!line) return;
    try {
      const status = await getEnrollmentStatus();
      renderEnrollActions(!!(status && status.enrolled), (status && status.count) || 0);
    } catch (e) {
      line.textContent = "Could not load face login status.";
    }
  };

  window.__removeFaceEnrollment = function () {
    QMS.confirm("Remove Face Login", "Are you sure you want to remove your enrolled face data?", async () => {
      try {
        const result = await removeEnrollment();
        if (result && result.error) {
          QMS.showToast("Error removing face login: " + result.error, "error");
        } else {
          QMS.showToast("Face login removed", "success");
        }
      } catch (e) {
        QMS.showToast("Error removing face login: " + (e && e.message ? e.message : e), "error");
      }
      window.__mountFaceEnrollCard();
    });
  };

  window.__openFaceEnrollModal = function () {
    enrollAbort = false;
    QMS.showModal(
      '<div class="modal-header"><span class="modal-title">📷 Face Login Setup</span></div>' +
        '<div style="display:flex;justify-content:center;margin-bottom:var(--sp-md);">' +
        '<div style="position:relative;width:220px;height:220px;border-radius:50%;overflow:hidden;background:#000;border:3px solid var(--border);">' +
        '<video id="face-enroll-video" autoplay playsinline muted style="width:100%;height:100%;object-fit:cover;transform:scaleX(-1);"></video>' +
        '<div id="face-enroll-ring" style="position:absolute;inset:0;border-radius:50%;border:3px solid transparent;pointer-events:none;transition:border-color .25s;"></div>' +
        "</div></div>" +
        '<div id="face-enroll-modal-status" style="text-align:center;font-size:13px;color:var(--text-muted);min-height:36px;margin-bottom:var(--sp-md);">Starting camera…</div>' +
        '<div id="face-enroll-modal-error" class="hidden"></div>' +
        '<div class="modal-footer">' +
        '<button class="btn btn-ghost" onclick="__cancelFaceEnrollModal()">Cancel</button>' +
        '<button id="face-enroll-retry-btn" class="btn btn-secondary hidden" onclick="__runFaceEnrollCapture()">↻ Try Again</button>' +
        "</div>",
      "narrow"
    );
    window.__runFaceEnrollCapture();
  };

  window.__cancelFaceEnrollModal = function () {
    enrollAbort = true;
    stopCamera(enrollStream);
    enrollStream = null;
    QMS.closeModal();
  };

  window.__runFaceEnrollCapture = async function () {
    const retryBtn = document.getElementById("face-enroll-retry-btn");
    const statusEl = document.getElementById("face-enroll-modal-status");
    const errEl = document.getElementById("face-enroll-modal-error");
    const ringEl = document.getElementById("face-enroll-ring");
    if (retryBtn) retryBtn.classList.add("hidden");
    if (errEl) {
      errEl.className = "hidden";
      errEl.innerHTML = "";
    }
    if (ringEl) ringEl.style.borderColor = "transparent";

    const setStat = (t) => {
      if (statusEl && !enrollAbort) statusEl.textContent = t;
    };
    const setErr = (t) => {
      if (!errEl) return;
      errEl.className = "alert alert-error";
      errEl.innerHTML = `<span>❌</span><span>${String(t).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]))}</span>`;
    };

    const video = document.getElementById("face-enroll-video");
    if (!video) return;

    try {
      setStat("Loading face recognition…");
      const modelsOk = await loadModels();
      if (enrollAbort) return;
      if (!modelsOk) {
        setErr("Face recognition models failed to load. Check your connection and try again.");
        if (retryBtn) retryBtn.classList.remove("hidden");
        return;
      }

      setStat("Starting camera…");
      try {
        enrollStream = await startCamera(video);
      } catch (camErr) {
        if (enrollAbort) return;
        setErr("Camera access denied or unavailable. Please allow camera access and try again.");
        if (retryBtn) retryBtn.classList.remove("hidden");
        return;
      }
      if (enrollAbort) {
        stopCamera(enrollStream);
        enrollStream = null;
        return;
      }

      const { descriptors } = await runLivenessCapture(video, {
        samplesNeeded: 4,
        timeoutMs: 60000,
        onStatus: setStat,
        shouldAbort: () => enrollAbort,
      });
      stopCamera(enrollStream);
      enrollStream = null;
      if (enrollAbort) return;

      setStat("Saving your face data…");
      const enrollResult = await enroll(descriptors);
      if (enrollResult && enrollResult.error) {
        setErr(enrollResult.error);
        if (retryBtn) retryBtn.classList.remove("hidden");
        return;
      }
      if (ringEl) ringEl.style.borderColor = "var(--success, #2e7d32)";
      setStat("✅ Face login set up successfully!");
      QMS.showToast("Face login set up successfully", "success");
      setTimeout(() => {
        if (!enrollAbort) QMS.closeModal();
        window.__mountFaceEnrollCard();
      }, 1200);
    } catch (e) {
      stopCamera(enrollStream);
      enrollStream = null;
      if (enrollAbort) return;
      setStat("");
      setErr(e && e.message ? e.message : "Enrollment failed. Please try again.");
      if (retryBtn) retryBtn.classList.remove("hidden");
    }
  };
})();
