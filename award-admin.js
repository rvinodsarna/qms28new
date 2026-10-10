/* Award & Recognition — bulk award modal for Dean/HOP */
(function () {
  "use strict";
  if (window.__awardAdmin) return;
  window.__awardAdmin = true;

  function sb(){ return window.qmsSupabase || window.supabaseClient; }
  function esc(s){ return window.escHtml ? escHtml(String(s==null?"":s)) : String(s==null?"":s); }

  var LEVELS = {
    medal: [
      { level: "Gold",          points: 100 },
      { level: "Silver",        points: 75  },
      { level: "Bronze",        points: 50  },
      { level: "Merit",         points: 30  },
      { level: "Participation", points: 10  }
    ],
    award: [
      { level: "Programme",     points: 30  },
      { level: "School",        points: 40  },
      { level: "National",      points: 80  },
      { level: "International", points: 100 }
    ]
  };

  async function matchStudents(emails) {
    if (!emails.length) return { matched: [], notFound: [] };
    var r = await sb().from("students").select("id,email,name").in("email", emails);
    if (r.error) { console.error("[award]", r.error); return { matched: [], notFound: emails }; }
    var found = {};
    (r.data || []).forEach(function(s){ found[s.email.toLowerCase()] = s; });
    var matched = [], notFound = [];
    emails.forEach(function(e){
      var s = found[e];
      if (s) matched.push(s); else notFound.push(e);
    });
    return { matched: matched, notFound: notFound };
  }

  function openModal() {
    var old = document.getElementById("award-modal");
    if (old) old.remove();

    var modal = document.createElement("div");
    modal.id = "award-modal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;";
    modal.innerHTML = ''
      + '<div style="max-width:640px;width:100%;background:#0a0e1a;border:1px solid rgba(0,245,255,0.3);border-radius:14px;padding:24px;color:#e6ecff;max-height:90vh;overflow-y:auto;">'
      +   '<div style="font-size:18px;font-weight:700;margin-bottom:4px;">🏅 Bulk Award — Dean / HOP</div>'
      +   '<div style="font-size:12px;opacity:0.6;margin-bottom:18px;">Award a batch of students (e.g. Dean\'s List). Points go into the Award & Recognition category automatically.</div>'

      +   '<label style="display:block;font-size:11px;opacity:0.7;margin-bottom:6px;letter-spacing:1px;">AWARD TYPE</label>'
      +   '<select id="award-type" style="width:100%;padding:10px;background:#12182a;border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#e6ecff;margin-bottom:14px;">'
      +     '<option value="award">Award (Programme / School / National / International)</option>'
      +     '<option value="medal">Medal (Gold / Silver / Bronze / Merit / Participation)</option>'
      +   '</select>'

      +   '<label style="display:block;font-size:11px;opacity:0.7;margin-bottom:6px;letter-spacing:1px;">AWARD LEVEL</label>'
      +   '<select id="award-level" style="width:100%;padding:10px;background:#12182a;border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#e6ecff;margin-bottom:14px;"></select>'

      +   '<label style="display:block;font-size:11px;opacity:0.7;margin-bottom:6px;letter-spacing:1px;">TITLE</label>'
      +   '<input id="award-title" type="text" placeholder="e.g. Dean\'s List Semester SEPT2026" style="width:100%;padding:10px;background:#12182a;border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#e6ecff;margin-bottom:14px;box-sizing:border-box;">'

      +   '<label style="display:block;font-size:11px;opacity:0.7;margin-bottom:6px;letter-spacing:1px;">STUDENT EMAILS (one per line, or comma-separated)</label>'
      +   '<textarea id="award-emails" rows="6" placeholder="student1@student.unimy.edu.my&#10;student2@student.unimy.edu.my" style="width:100%;padding:10px;background:#12182a;border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#e6ecff;font-family:monospace;font-size:12px;resize:vertical;margin-bottom:10px;box-sizing:border-box;"></textarea>'

      +   '<div id="award-preview" style="font-size:12px;opacity:0.75;min-height:18px;margin-bottom:10px;"></div>'
      +   '<div id="award-error" style="color:#ff3860;font-size:13px;min-height:18px;margin-bottom:10px;"></div>'

      +   '<div style="display:flex;gap:10px;justify-content:flex-end;">'
      +     '<button id="award-cancel" style="padding:10px 18px;background:transparent;border:1px solid rgba(255,255,255,0.2);border-radius:8px;color:#e6ecff;cursor:pointer;">Cancel</button>'
      +     '<button id="award-preview-btn" style="padding:10px 18px;background:rgba(0,245,255,0.15);border:1px solid #00f5ff;border-radius:8px;color:#00f5ff;cursor:pointer;font-weight:600;">Preview</button>'
      +     '<button id="award-submit" style="padding:10px 18px;background:#00f5ff;border:none;border-radius:8px;color:#001;font-weight:700;cursor:pointer;">Award</button>'
      +   '</div>'
      + '</div>';
    document.body.appendChild(modal);

    var typeSel  = modal.querySelector("#award-type");
    var levelSel = modal.querySelector("#award-level");
    var titleEl  = modal.querySelector("#award-title");
    var emailsEl = modal.querySelector("#award-emails");
    var previewEl = modal.querySelector("#award-preview");
    var errEl    = modal.querySelector("#award-error");

    function refreshLevels() {
      var list = LEVELS[typeSel.value] || [];
      levelSel.innerHTML = list.map(function(l){
        return '<option value="' + l.level + '">' + l.level + ' — ' + l.points + ' pts</option>';
      }).join("");
    }
    refreshLevels();
    typeSel.onchange = refreshLevels;

    function parseEmails() {
      return emailsEl.value
        .split(/[\s,;]+/)
        .map(function(s){ return s.trim().toLowerCase(); })
        .filter(function(s){ return s.indexOf("@") !== -1; });
    }

    modal.querySelector("#award-cancel").onclick = function(){ modal.remove(); };
    modal.onclick = function(e){ if (e.target === modal) modal.remove(); };

    modal.querySelector("#award-preview-btn").onclick = async function () {
      var emails = parseEmails();
      if (!emails.length) { previewEl.textContent = "No valid emails found."; return; }
      previewEl.textContent = "Checking " + emails.length + " emails…";
      var r = await matchStudents(emails);
      previewEl.innerHTML = ""
        + "<b>" + r.matched.length + "</b> matched · <b>" + r.notFound.length + "</b> not found"
        + (r.notFound.length ? "<br><span style='color:#ffb800;'>Not found: " + esc(r.notFound.slice(0,5).join(", ")) + (r.notFound.length > 5 ? "…" : "") + "</span>" : "");
    };

    modal.querySelector("#award-submit").onclick = async function () {
      errEl.textContent = "";
      var emails = parseEmails();
      var title = titleEl.value.trim();
      if (!title) { errEl.textContent = "Title is required."; return; }
      if (!emails.length) { errEl.textContent = "No valid emails found."; return; }

      var submitBtn = modal.querySelector("#award-submit");
      submitBtn.disabled = true;
      submitBtn.textContent = "Awarding…";

      var r = await sb().rpc("create_award_batch", {
        p_type: typeSel.value,
        p_level: levelSel.value,
        p_title: title,
        p_student_emails: emails,
        p_notes: null
      });

      submitBtn.disabled = false;
      submitBtn.textContent = "Award";

      if (r.error) {
        console.error("[award]", r.error);
        errEl.textContent = "Failed: " + r.error.message;
        return;
      }

      var res = r.data || {};
      var msg = "✅ Awarded " + res.points_per_student + " pts to " + res.matched + " students.";
      if (res.not_found && res.not_found.length) msg += " (" + res.not_found.length + " emails not found)";
      if (window.QMS && QMS.showToast) QMS.showToast(msg, "success");

      modal.remove();

      // Refresh So-CSI panel + My Progress
      if (typeof window.navigate === "function") window.navigate("dashboard");
    };
  }

  // Inject the button into the HOP/Dean stats panel
  function injectButton() {
    var u = window.QMS && QMS.state && QMS.state.user;
    if (!u || (u.role !== "dean" && u.role !== "hop" && u.role !== "admin")) return;
    if (document.getElementById("award-open-btn")) return;

    var panel = document.querySelector("[data-hop-stats]");
    if (!panel) return;

    var header = panel.querySelector("div[style*='justify-content:space-between']");
    if (!header) return;

    var btn = document.createElement("button");
    btn.id = "award-open-btn";
    btn.type = "button";
    btn.style.cssText = "padding:8px 14px;background:rgba(255,184,0,0.15);border:1px solid #ffb800;border-radius:8px;color:#ffb800;cursor:pointer;font-weight:600;font-size:12px;";
    btn.innerHTML = "🏅 Bulk Award";
    btn.onclick = openModal;
    header.appendChild(btn);
  }

  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(function(){ scheduled = false; injectButton(); }, 800);
  }

  var obs = new MutationObserver(schedule);
  function init() { schedule(); obs.observe(document.body, { childList: true, subtree: true }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  if (typeof window.navigate === "function" && !window.__awardNav) {
    var orig = window.navigate;
    window.navigate = function (r) {
      var x = orig.apply(this, arguments);
      setTimeout(injectButton, 700);
      setTimeout(injectButton, 1500);
      return x;
    };
    window.__awardNav = true;
  }

  console.log("[award-admin] loaded");
})();