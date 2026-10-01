// ai-faq.js
// FAQ-based AI Assistant override for QMS RISE v25
// Uses window.supabaseClient (created by config.js) and window.QMS_READY.
// Falls back to window.askAI / window.QMS_AI when available.

(function () {
  "use strict";

  // ─────────────────────────────────────────────────────────────
  // Wait for the shared Supabase client created by config.js.
  // Handles the case where this script runs before config.js finishes.
  // ─────────────────────────────────────────────────────────────
  async function waitForSupabaseClient(timeoutMs) {
    timeoutMs = timeoutMs || 15000;
    const started = Date.now();

    while (Date.now() - started < timeoutMs) {
      if (window.supabaseClient) return window.supabaseClient;

      if (window.QMS_READY) {
        try {
          await window.QMS_READY;
        } catch (err) {
          console.error("[AI FAQ] QMS startup failed:", err);
        }
      }

      if (window.supabaseClient) return window.supabaseClient;

      await new Promise(function (resolve) {
        setTimeout(resolve, 100);
      });
    }

    throw new Error("Supabase client was not ready after " + timeoutMs + "ms");
  }

  let faqs = null;

  // ─────────────────────────────────────────────────────────────
  // Load FAQs from Supabase (cached after first successful load)
  // ─────────────────────────────────────────────────────────────
  async function loadFaqs() {
    if (faqs) return faqs;

    try {
      const client = await waitForSupabaseClient();

      const { data, error } = await client
        .from("faqs")
        .select("question, answer, category")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("[AI FAQ] FAQ load:", error.message);
        faqs = [];
        return faqs;
      }

      faqs = data || [];
      console.log("[AI FAQ] Loaded", faqs.length, "FAQs");
      return faqs;
    } catch (e) {
      console.warn("[AI FAQ] FAQ fetch failed:", e && e.message ? e.message : e);
      faqs = [];
      return faqs;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Score a question against every FAQ; return the best match or null.
  // ─────────────────────────────────────────────────────────────
  function bestFaqMatch(question, faqList) {
    if (!faqList || !faqList.length) return null;

    const q = String(question || "").toLowerCase();
    const words = q.split(/\s+/).filter(function (w) { return w.length > 2; });
    if (!words.length) return null;

    let best = null;
    let bestScore = 0;

    for (let i = 0; i < faqList.length; i++) {
      const f = faqList[i];
      const text = ((f.question || "") + " " + (f.answer || "")).toLowerCase();
      let score = 0;
      for (let j = 0; j < words.length; j++) {
        if (text.indexOf(words[j]) !== -1) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        best = f;
      }
    }

    return bestScore > 0 ? best : null;
  }

  // ─────────────────────────────────────────────────────────────
  // Escape HTML for safe rendering inside chat bubbles
  // ─────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ─────────────────────────────────────────────────────────────
  // The AI Assistant UI — overrides any mountAIAssistant from app.js
  // ─────────────────────────────────────────────────────────────
  window.mountAIAssistant = async function () {
    const main = document.getElementById("main-content");
    if (!main) return;

    const faqsLocal = await loadFaqs();

    main.innerHTML =
      '<div class="page-anim" style="max-width:700px;margin:0 auto;">' +
        '<div class="glass-card">' +
          '<div class="page-eyebrow">AI Assistant</div>' +
          '<h2 class="page-title" style="margin-bottom:12px;">Ask anything about QMS RISE</h2>' +

          '<div id="ai-chat-msgs" style="max-height:420px;overflow-y:auto;margin-bottom:12px;padding:8px;">' +
            '<div class="text-muted text-sm text-center">Say hello to your AI assistant!</div>' +
          "</div>" +

          '<div style="display:flex;gap:8px;">' +
            '<input id="ai-chat-input" type="text"' +
            ' placeholder="Ask about login, evaluation, attendance, RISE points…"' +
            ' style="flex:1;padding:8px 10px;border-radius:8px;border:1px solid var(--color-border);background:var(--color-surface);color:var(--color-ink);" />' +
            '<button id="ai-chat-send" class="btn btn-primary">Send</button>' +
          "</div>" +

          '<div id="ai-quick-replies" style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;">' +
            ["What are RISE points?",
             "How do I scan attendance?",
             "How to submit evaluation?",
             "What tier am I?",
             "How does quiz work?"]
              .map(function (q) {
                const safe = q.replace(/"/g, "&quot;");
                return '<button class="btn btn-ghost" style="font-size:12px;" data-q="' + safe + '">' + q + "</button>";
              })
              .join("") +
          "</div>" +
        "</div>" +
      "</div>";

    const chatEl = document.getElementById("ai-chat-msgs");
    const inputEl = document.getElementById("ai-chat-input");
    const sendBtn = document.getElementById("ai-chat-send");
    const quickRepliesEl = document.getElementById("ai-quick-replies");

    const chatHistory = [];

    function renderChat() {
      const msgsHTML = chatHistory.map(function (m) {
        const cls = m.role === "user" ? "sent" : "ai";
        const avatar = m.role === "assistant"
          ? '<div style="width:28px;height:28px;border-radius:50%;' +
            "background:linear-gradient(135deg,var(--color-violet),var(--color-primary));" +
            "display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;margin-right:8px;\">🤖</div>"
          : "";

        return (
          '<div style="display:flex;' +
            (m.role === "user" ? "justify-content:flex-end;" : "") +
            'margin-bottom:8px;">' +
            avatar +
            '<div class="chat-bubble ' + cls + '">' + escapeHtml(m.text) + "</div>" +
          "</div>"
        );
      }).join("");

      chatEl.innerHTML = msgsHTML ||
        '<div class="text-muted text-sm text-center">Say hello to your AI assistant!</div>';
      chatEl.scrollTop = chatEl.scrollHeight;
    }

    function addMessage(role, text) {
      chatHistory.push({ role: role, text: text });
      renderChat();
    }

    async function handleSend() {
      const text = inputEl.value.trim();
      if (!text) return;
      inputEl.value = "";

      addMessage("user", text);

      let replyText =
        "I couldn't find a specific answer. Try asking about login, evaluation, attendance, RISE points, or QMS RISE features.";

      // Prefer the richer AI helper from config.js when present.
      if (typeof window.askAI === "function") {
        try {
          const res = await window.askAI(text, {
            role: (window.QMS && window.QMS.state && window.QMS.state.user && window.QMS.state.user.role) || "student",
            programme: (window.QMS && window.QMS.state && window.QMS.state.user && window.QMS.state.user.programme) || "",
          });
          if (res && res.text) replyText = res.text;
        } catch (err) {
          console.warn("[AI FAQ] askAI failed, falling back to FAQ match:", err);
          const match = bestFaqMatch(text, faqsLocal);
          if (match) replyText = match.answer;
        }
      } else {
        const match = bestFaqMatch(text, faqsLocal);
        if (match) replyText = match.answer;
      }

      addMessage("assistant", replyText);
    }

    sendBtn.addEventListener("click", handleSend);
    inputEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter") handleSend();
    });
    quickRepliesEl.addEventListener("click", function (e) {
      if (e.target.tagName !== "BUTTON") return;
      const q = e.target.getAttribute("data-q");
      if (!q) return;
      inputEl.value = q;
      handleSend();
    });

    renderChat();
  };

  // ─────────────────────────────────────────────────────────────
  // Expose the loader for other modules that need it.
  // ─────────────────────────────────────────────────────────────
  window.loadFaqs = loadFaqs;

  console.log("[AI FAQ] FAQ-based override installed");
})();
