/* Clubs & Roles — student page + request + sidebar/dashboard injection + card overrides */
console.log("[clubs] loading...");
(function () {
  "use strict";
  if (window.__clubsPatchLoaded) { console.log("[clubs] already loaded"); return; }
  window.__clubsPatchLoaded = true;

  function sb() { return window.qmsSupabase || window.supabaseClient; }
  function esc(s) { return window.escHtml ? escHtml(String(s==null?"":s)) : String(s==null?"":s); }

  var ICON = { src:"\uD83C\uDFDB\uFE0F", academic:"\uD83D\uDCDA", sports:"\uD83C\uDFF8",
               cultural:"\uD83C\uDFAD", volunteer:"\uD83E\uDD1D", media:"\uD83D\uDCF0" };
  var STATUS = {
    active:       { label:"Active",           color:"#00ff88" },
    completed:    { label:"Completed",        color:"#9fb0d0" },
    pending_hop:  { label:"Waiting for HOP",  color:"#ffb800" },
    pending_dean: { label:"Waiting for Dean", color:"#a855f7" },
    rejected:     { label:"Rejected",         color:"#ff3860" },
    resigned:     { label:"Resigned",         color:"#666" }
  };

  var cachedClubs = null;
  var currentSemester = null;

  async function loadClubsAndSemester() {
    if (cachedClubs && currentSemester) return;
    var res = await Promise.all([
      sb().from("clubs").select("id,name,category,base_points,club_roles(id,title,bonus_points,level)").eq("active", true).order("name"),
      sb().from("semesters").select("code,label").eq("is_current", true).maybeSingle()
    ]);
    if (res[0].error) throw res[0].error;
    cachedClubs = res[0].data || [];
    currentSemester = res[1].data || { code:"UNKNOWN", label:"Unknown semester" };
  }

  async function mountStudentClubs() {
    var el = document.getElementById("main-content");
    if (!el) return;
    var u = window.QMS && QMS.state && QMS.state.user;
    if (!u || u.role !== "student") return;

    el.innerHTML = '<div class="page-anim"><div class="page-title">Clubs &amp; Roles</div><p>Loading...</p></div>';

    try { await loadClubsAndSemester(); }
    catch (e) {
      console.error("[clubs]", e);
      el.innerHTML = '<div class="page-anim"><div class="page-title">Clubs &amp; Roles</div><p style="color:#ff2d7a;">Failed to load clubs.</p></div>';
      return;
    }

    var resp = await sb()
      .from("student_clubs")
      .select("id,semester,points,status,joined_at,requested_at,hop_approved_at,dean_approved_at,rejection_reason,notes,clubs(name,category),club_roles(title)")
      .eq("student_id", u.id)
      .order("requested_at", { ascending: false, nullsFirst: false });

    if (resp.error) {
      console.error("[clubs]", resp.error);
      el.innerHTML = '<div class="page-anim"><div class="page-title">Clubs &amp; Roles</div><p style="color:#ff2d7a;">Failed to load memberships.</p></div>';
      return;
    }

    var rows = resp.data || [];
    var counted = rows.filter(function(r){ return r.status==="active" || r.status==="completed"; });
    var clubTotal = counted.reduce(function(a,r){ return a + (r.points||0); }, 0);
    var baseTotal = Number(u.points||0);
    var grand = baseTotal + clubTotal;
    var cap = Number(u.club_points_cap_lifetime || u.club_points_cap || 0) || null;

    var cards = ''
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:22px;">'
      +   '<div style="padding:18px 20px;border:1px solid rgba(0,245,255,0.25);border-radius:12px;background:rgba(0,245,255,0.05);">'
      +     '<div style="font-size:11px;letter-spacing:1.5px;opacity:0.6;">CLUB POINTS</div>'
      +     '<div style="font-size:30px;font-weight:700;color:#00f5ff;">' + clubTotal + (cap ? ' <span style="font-size:14px;opacity:0.5;">/ ' + cap + '</span>' : '') + '</div>'
      +     '<div style="font-size:12px;opacity:0.6;margin-top:4px;">' + counted.length + ' active membership' + (counted.length===1?'':'s') + '</div>'
      +   '</div>'
      +   '<div style="padding:18px 20px;border:1px solid rgba(255,255,255,0.12);border-radius:12px;background:rgba(255,255,255,0.03);">'
      +     '<div style="font-size:11px;letter-spacing:1.5px;opacity:0.6;">TOTAL RISE POINTS</div>'
      +     '<div style="font-size:30px;font-weight:700;">' + grand + '</div>'
      +     '<div style="font-size:12px;opacity:0.6;margin-top:4px;">' + baseTotal + ' earned + ' + clubTotal + ' from clubs</div>'
      +   '</div>'
      + '</div>';

    var body = rows.length ? rows.map(function(r){
      var cName = (r.clubs && r.clubs.name) || "Unknown club";
      var cCat  = (r.clubs && r.clubs.category) || "academic";
      var role  = (r.club_roles && r.club_roles.title) || "Member";
      var b = STATUS[r.status] || { label:r.status, color:"#999" };
      var counts = r.status==="active" || r.status==="completed";
      var pts = counts ? '<span style="color:#00f5ff;font-weight:700;">+' + r.points + ' pts</span>'
                       : '<span style="opacity:0.4;">' + (r.status.indexOf("pending")===0 ? "pending" : "\u2014") + '</span>';
      var audit = [];
      if (r.requested_at) audit.push("Requested " + new Date(r.requested_at).toLocaleDateString());
      if (r.hop_approved_at) audit.push("HOP " + new Date(r.hop_approved_at).toLocaleDateString());
      if (r.dean_approved_at) audit.push("Dean " + new Date(r.dean_approved_at).toLocaleDateString());
      if (r.rejection_reason) audit.push("Rejected: " + esc(r.rejection_reason));
      return ''
        + '<div style="display:flex;align-items:center;gap:14px;padding:14px 16px;border:1px solid rgba(255,255,255,0.08);border-radius:10px;margin-bottom:10px;background:rgba(255,255,255,0.02);">'
        +   '<div style="font-size:26px;">' + (ICON[cCat]||"\u2B50") + '</div>'
        +   '<div style="flex:1;min-width:0;">'
        +     '<div style="font-weight:600;">' + esc(cName) + '</div>'
        +     '<div style="opacity:0.7;font-size:13px;">' + esc(role) + ' \u00B7 ' + esc(r.semester) + '</div>'
        +     '<div style="font-size:11px;margin-top:4px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">'
        +       '<span style="padding:2px 8px;border-radius:10px;border:1px solid ' + b.color + '33;background:' + b.color + '15;color:' + b.color + ';font-size:10px;font-weight:600;letter-spacing:0.5px;">' + b.label.toUpperCase() + '</span>'
        +       (audit.length ? '<span style="opacity:0.5;">' + audit.join(" \u00B7 ") + '</span>' : '')
        +     '</div>'
        +   '</div>'
        +   '<div style="text-align:right;">' + pts + '</div>'
        + '</div>';
    }).join("") : '<p style="opacity:0.6;">No club memberships yet.</p>';

    el.innerHTML = ''
      + '<div class="page-anim">'
      +   '<div style="display:flex;justify-content:space-between;align-items:center;">'
      +     '<div class="page-title">Clubs &amp; Roles</div>'
      +     '<button id="clubs-request-btn" style="padding:10px 16px;border:1px solid rgba(0,245,255,0.4);background:rgba(0,245,255,0.08);color:#00f5ff;border-radius:8px;cursor:pointer;font-weight:600;">+ Request to join a club</button>'
      +   '</div>'
      +   cards
      +   '<div style="font-size:14px;opacity:0.7;letter-spacing:1px;margin-top:6px;margin-bottom:10px;">MEMBERSHIPS</div>'
      +   body
      + '</div>';

    var btn = document.getElementById("clubs-request-btn");
    if (btn) btn.onclick = openRequestModal;
  }

  function openRequestModal() {
    var old = document.getElementById("clubs-request-modal");
    if (old) old.remove();
    var clubOptions = cachedClubs.map(function(c){ return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join("");
    var modal = document.createElement("div");
    modal.id = "clubs-request-modal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;";
    modal.innerHTML = ''
      + '<div style="max-width:520px;width:100%;background:#0a0e1a;border:1px solid rgba(0,245,255,0.3);border-radius:14px;padding:24px;color:#e6ecff;">'
      +   '<div style="font-size:18px;font-weight:700;margin-bottom:4px;">Request to join a club</div>'
      +   '<div style="font-size:12px;opacity:0.6;margin-bottom:18px;">Semester: <b>' + esc(currentSemester.label) + '</b> (' + esc(currentSemester.code) + ')</div>'
      +   '<label style="display:block;font-size:11px;opacity:0.7;margin-bottom:6px;letter-spacing:1px;">CLUB</label>'
      +   '<select id="clubs-req-club" style="width:100%;padding:10px;background:#12182a;border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#e6ecff;margin-bottom:14px;">'
      +     '<option value="">\u2014 Select a club \u2014</option>' + clubOptions
      +   '</select>'
      +   '<label style="display:block;font-size:11px;opacity:0.7;margin-bottom:6px;letter-spacing:1px;">ROLE</label>'
      +   '<select id="clubs-req-role" style="width:100%;padding:10px;background:#12182a;border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#e6ecff;margin-bottom:14px;" disabled>'
      +     '<option value="">\u2014 Pick a club first \u2014</option>'
      +   '</select>'
      +   '<label style="display:block;font-size:11px;opacity:0.7;margin-bottom:6px;letter-spacing:1px;">WHY DO YOU WANT THIS ROLE?</label>'
      +   '<textarea id="clubs-req-notes" rows="3" placeholder="Short reason (optional)" style="width:100%;padding:10px;background:#12182a;border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#e6ecff;resize:vertical;margin-bottom:18px;font-family:inherit;"></textarea>'
      +   '<div id="clubs-req-error" style="color:#ff3860;font-size:13px;min-height:18px;margin-bottom:10px;"></div>'
      +   '<div style="display:flex;gap:10px;justify-content:flex-end;">'
      +     '<button id="clubs-req-cancel" style="padding:10px 18px;background:transparent;border:1px solid rgba(255,255,255,0.2);border-radius:8px;color:#e6ecff;cursor:pointer;">Cancel</button>'
      +     '<button id="clubs-req-submit" style="padding:10px 18px;background:#00f5ff;border:none;border-radius:8px;color:#001;font-weight:700;cursor:pointer;">Submit request</button>'
      +   '</div>'
      + '</div>';
    document.body.appendChild(modal);

    var clubSel = modal.querySelector("#clubs-req-club");
    var roleSel = modal.querySelector("#clubs-req-role");
    var errEl   = modal.querySelector("#clubs-req-error");
    var submitBtn = modal.querySelector("#clubs-req-submit");

    clubSel.onchange = function() {
      var club = cachedClubs.filter(function(c){ return c.id === clubSel.value; })[0];
      if (!club) { roleSel.disabled = true; roleSel.innerHTML = '<option value="">\u2014 Pick a club first \u2014</option>'; return; }
      roleSel.disabled = false;
      roleSel.innerHTML = '<option value="">\u2014 Select a role \u2014</option>' +
        (club.club_roles || []).sort(function(a,b){ return (a.level||1) - (b.level||1); })
          .map(function(r){ return '<option value="' + r.id + '">' + esc(r.title) + ' (+' + r.bonus_points + ' bonus)</option>'; }).join("");
    };
    modal.querySelector("#clubs-req-cancel").onclick = function(){ modal.remove(); };
    modal.onclick = function(e){ if (e.target === modal) modal.remove(); };

    submitBtn.onclick = async function() {
      errEl.textContent = "";
      var clubId = clubSel.value, roleId = roleSel.value;
      var notes = modal.querySelector("#clubs-req-notes").value.trim();
      if (!clubId) { errEl.textContent = "Pick a club."; return; }
      if (!roleId) { errEl.textContent = "Pick a role."; return; }
      var u = window.QMS.state.user;
      submitBtn.disabled = true; submitBtn.textContent = "Submitting...";
      var resp = await sb().from("student_clubs").insert({
        student_id: u.id, club_id: clubId, role_id: roleId,
        semester: currentSemester.code, points: 0, status: "pending_hop",
        requested_by: u.id, requested_at: new Date().toISOString(),
        notes: notes || null
      });
      submitBtn.disabled = false; submitBtn.textContent = "Submit request";
      if (resp.error) {
        console.error("[clubs request]", resp.error);
        errEl.textContent = resp.error.message.indexOf("duplicate") >= 0
          ? "You already have a request or membership for this club this semester."
          : ("Failed: " + resp.error.message);
        return;
      }
      if (window.QMS && QMS.showToast) QMS.showToast("Request submitted - waiting for HOP approval.", "success");
      modal.remove();
      mountStudentClubs();
    };
  }

  window.mountStudentClubs = mountStudentClubs;

  function wrapNavigate() {
    if (typeof window.navigate !== "function" || window.__clubsNavWrapped) return;
    var orig = window.navigate;
    window.navigate = function (route) {
      if (route === "student-clubs") { try { return mountStudentClubs(); } catch (e) { console.error(e); } }
      return orig.apply(this, arguments);
    };
    window.__clubsNavWrapped = true;
  }

  function injectNavItem() {
    var u = window.QMS && QMS.state && QMS.state.user;
    if (!u || u.role !== "student") return;
    var nav = document.querySelector(".sidebar-inner") || document.querySelector("aside.sidebar");
    if (!nav || nav.querySelector('[data-section="student-clubs"]')) return;
    var el = document.createElement("div");
    el.className = "sidebar-item";
    el.setAttribute("data-section", "student-clubs");
    el.innerHTML = '<span class="si-icon">\uD83C\uDFDB\uFE0F</span><span>Clubs &amp; Roles</span>';
    el.onclick = function(){
      if (typeof window.closeSidebar === "function") { try { window.closeSidebar(); } catch(e){} }
      window.navigate("student-clubs");
    };
    var items = Array.prototype.slice.call(nav.querySelectorAll(".sidebar-item"));
    var anchor = null;
    for (var i = 0; i < items.length; i++) {
      if (/submit\s*evaluation/i.test(items[i].textContent)) { anchor = items[i]; break; }
    }
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(el, anchor.nextSibling);
    else nav.appendChild(el);
  }

  function injectDashboardCard_DISABLED() { return; /* disabled to fix flash */ }
  function injectDashboardCard() { return; /* no-op */ }
  function injectDashboardCard_orig() {
    var u = window.QMS && QMS.state && QMS.state.user;
    if (!u || u.role !== "student") return;
    if (document.querySelector('[data-clubs-dashboard-card]')) return;
    var anyCard = document.querySelector(".sd-cat-card");
    if (!anyCard || !anyCard.parentElement) return;
    var grid = anyCard.parentElement;
    var clubPts = Number(u.club_points || 0);
    var cap = Number(u.club_points_cap_lifetime || u.club_points_cap || 1716);
    var pct = cap > 0 ? Math.min(100, (clubPts / cap) * 100) : 0;

    var card = document.createElement("div");
    card.className = "sd-cat-card";
    card.setAttribute("data-clubs-dashboard-card", "1");
    card.style.cssText = "--cat-color:#00e5c0;cursor:pointer;";
    card.innerHTML = ''
      + '<div class="sd-cat-top">'
      +   '<span class="sd-cat-name"><span class="sd-cat-icon-badge">\uD83C\uDFDB\uFE0F</span>Clubs &amp; Roles</span>'
      +   '<span class="sd-cat-pct">' + pct.toFixed(1) + '%</span>'
      + '</div>'
      + '<div class="sd-cat-track"><div class="sd-cat-fill" style="width:' + pct + '%"></div></div>'
      + '<div class="sd-cat-meta">' + clubPts + ' / ' + cap + ' pts</div>';

    var bonusCard = null;
    Array.prototype.forEach.call(grid.querySelectorAll(".sd-cat-card"), function (c) {
      var n = c.querySelector(".sd-cat-name");
      if (n && /^\s*Bonus\s*$/i.test(n.textContent.replace(/\s+/g, " ").trim())) bonusCard = c;
    });
    if (bonusCard) grid.insertBefore(card, bonusCard.nextSibling);
    else grid.appendChild(card);
  }

  // Only override cards the app routes wrong or not at all.
  // Everything else (Attendance, Bonus, Streak, Coursera) uses the app's own handler.
  var CARD_OVERRIDE = {
    "attendance":        "qr-scanner",
    "bonus":             "bonus",
    "streak":            "my-progress",
    "coursera":          "certificates",
    "evaluation":        "evaluation",
    "quiz battle":       "quiz",
    "workshops & talks": "events",
    "competitions":      "events",
    "clubs & roles":     "student-clubs"
  };

  function installCardInterceptor() {
    if (window.__clubsCardInterceptor) return;
    window.__clubsCardInterceptor = true;
    document.addEventListener("click", function (e) {
      var card = e.target && e.target.closest ? e.target.closest(".sd-cat-card") : null;
      if (!card) return;
      var nameEl = card.querySelector(".sd-cat-name");
      if (!nameEl) return;
      var name = nameEl.textContent
        .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u200B-\u200D\uFEFF\uFE0F]/gu, "")
        .replace(/\s+/g, " ").trim().toLowerCase();
      var route = CARD_OVERRIDE[name];
      if (!route) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      if (typeof window.closeSidebar === "function") { try { window.closeSidebar(); } catch(x){} }
      if (typeof window.navigate === "function") window.navigate(route);
    }, true);
  }

  function tick() {
    wrapNavigate();
    injectNavItem();
    injectDashboardCard();
    installCardInterceptor();
  }
  var obs = new MutationObserver(tick);
  function init() {
    tick();
    obs.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  console.log("[clubs] loaded");
})();
/* Topbar icons — one per title, never two */
(function () {
  if (window.__iconFiller) return;
  window.__iconFiller = true;

  var ICONS = {
    "dashboard": "🏠",
    "leaderboard": "🏆",
    "avatar studio": "🧬",
    "events": "🎫",
    "submit evaluation": "📝",
    "clubs & roles": "🏛️",
    "qr scanner": "📷",
    "qr attendance scanner": "📷",
    "academic support": "👥",
    "my progress": "📊",
    "profile card": "🪪",
    "timetable": "⏰",
    "study plan": "🗂️",
    "coursera certificates": "📘",
    "attendance bonus": "🔥",
    "attendance bonus tracker": "🔥",
    "quiz arena": "⚡",
    "quiz battle": "⚡",
    "ai assistant": "🤖",
    "messages": "💬",
    "live chat": "🟢",
    "complaints": "📣",
    "documents": "📂",
    "my profile": "👤",
    "award & recognition": "🏅"
  };

  // Matches any leading emoji (single or multi-codepoint)
  var EMOJI_START = /^[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\uFE0F\u200D]+\s*/u;

  function fix() {
    var el = document.getElementById("topbar-page-title");
    if (!el) return;

    // Clear any leftover data-icon from the old script
    if (el.hasAttribute("data-icon")) el.removeAttribute("data-icon");

    var txt = (el.textContent || "").trim();
    if (!txt) return;

    // Already starts with an emoji? Leave alone.
    if (EMOJI_START.test(txt)) return;

    // Look up our icon
    var key = txt.toLowerCase();
    var icon = ICONS[key];

    if (!icon) {
      var keys = Object.keys(ICONS);
      for (var i = 0; i < keys.length; i++) {
        if (key.indexOf(keys[i]) !== -1 || keys[i].indexOf(key) !== -1) {
          icon = ICONS[keys[i]];
          break;
        }
      }
    }
    if (!icon) icon = "\u2728";

    el.textContent = icon + " " + txt;
  }

  fix();
  new MutationObserver(fix).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["data-icon"] });
  setInterval(fix, 400);
})();