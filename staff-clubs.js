/* Staff Club Requests queue — HOP approves pending_hop, Dean approves pending_dean, admin both. */
(function () {
  "use strict";
  if (window.__staffClubsLoaded) return;
  window.__staffClubsLoaded = true;

  const STATUS = {
    pending_hop:  { label:"Waiting for HOP",  color:"#ffb800" },
    pending_dean: { label:"Waiting for Dean", color:"#a855f7" },
    active:       { label:"Active",           color:"#00ff88" },
    rejected:     { label:"Rejected",         color:"#ff3860" }
  };
  const esc = (s) => (window.escHtml ? escHtml(String(s==null?"":s)) : String(s==null?"":s));

  async function mountStaffClubs() {
    const el = document.getElementById("main-content");
    if (!el) return;
    const u = window.QMS && QMS.state && QMS.state.user;
    if (!u || !["hop","dean","admin"].includes(u.role)) return;

    el.innerHTML = '<div class="page-anim"><div class="page-title">Club Requests</div><p>Loading…</p></div>';

    const { data: reqs, error } = await (window.qmsSupabase || window.supabaseClient)
      .from("student_clubs")
      .select(`id,student_id,semester,status,points,notes,requested_at,rejection_reason,
               clubs(name,category),club_roles(title,bonus_points)`)
      .in("status", ["pending_hop","pending_dean"])
      .order("requested_at", { ascending: true });

    if (error) {
      console.error("[staff-clubs]", error);
      el.innerHTML = '<div class="page-anim"><div class="page-title">Club Requests</div><p style="color:#ff2d7a;">Failed to load.</p></div>';
      return;
    }

    const actionable = (reqs || []).filter(r => {
      if (u.role === "admin") return true;
      if (u.role === "hop"  && r.status === "pending_hop")  return true;
      if (u.role === "dean" && r.status === "pending_dean") return true;
      return false;
    });

    const ids = [...new Set(actionable.map(r => r.student_id))];
    let studentsById = {};
    if (ids.length) {
      const { data: s } = await (window.qmsSupabase || window.supabaseClient)
        .from("students").select("id,name,programme").in("id", ids);
      (s || []).forEach(x => { studentsById[x.id] = x; });
    }

    const rows = actionable.map(r => {
      const badge = STATUS[r.status] || { label: r.status, color: "#999" };
      const st = studentsById[r.student_id] || { name: "Unknown student", programme: "" };
      const club = r.clubs?.name || "?";
      const role = r.club_roles?.title || "?";
      const bonus = r.club_roles?.bonus_points || 0;
      const date = r.requested_at ? new Date(r.requested_at).toLocaleDateString() : "—";
      const canAct = (u.role === "admin")
                  || (u.role === "hop"  && r.status === "pending_hop")
                  || (u.role === "dean" && r.status === "pending_dean");

      return `
        <div style="display:flex;align-items:flex-start;gap:14px;padding:16px;border:1px solid rgba(255,255,255,0.08);border-radius:10px;margin-bottom:10px;background:rgba(255,255,255,0.02);">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:15px;">${esc(st.name)}</div>
            <div style="font-size:12px;opacity:0.7;margin-top:2px;">${esc(st.programme || "")}</div>
            <div style="font-size:13px;margin-top:8px;">→ <b>${esc(club)}</b> · ${esc(role)} <span style="opacity:0.6;">(+${bonus} bonus)</span> · ${esc(r.semester)}</div>
            ${r.notes ? `<div style="font-size:12px;opacity:0.75;margin-top:8px;padding:8px 10px;border-left:2px solid rgba(0,245,255,0.35);background:rgba(0,245,255,0.03);">${esc(r.notes)}</div>` : ""}
            <div style="font-size:11px;margin-top:8px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
              <span style="padding:2px 8px;border-radius:10px;border:1px solid ${badge.color}33;background:${badge.color}15;color:${badge.color};font-size:10px;font-weight:600;letter-spacing:0.5px;">${badge.label.toUpperCase()}</span>
              <span style="opacity:0.5;">Requested ${date}</span>
            </div>
          </div>
          ${canAct ? `
            <div style="display:flex;flex-direction:column;gap:6px;min-width:100px;">
              <button data-req-approve="${r.id}" style="padding:8px 14px;background:#00ff88;border:none;border-radius:6px;color:#000;font-weight:700;cursor:pointer;font-size:12px;">Approve</button>
              <button data-req-reject="${r.id}"  style="padding:8px 14px;background:transparent;border:1px solid rgba(255,56,96,0.4);color:#ff3860;border-radius:6px;cursor:pointer;font-size:12px;">Reject</button>
            </div>
          ` : `<div style="font-size:11px;opacity:0.5;align-self:center;">Awaiting ${r.status === "pending_hop" ? "HOP" : "Dean"}</div>`}
        </div>`;
    }).join("");

    const title = u.role === "admin" ? "Club Requests — Admin view"
                : u.role === "hop"   ? "Club Requests — HOP queue"
                :                       "Club Requests — Dean approval";
    const stage = u.role === "admin" ? "all stages" : u.role === "hop" ? "HOP stage" : "Dean stage";

    el.innerHTML = `<div class="page-anim">
      <div class="page-title">${title}</div>
      <p style="opacity:0.6;margin-bottom:18px;">${actionable.length} request${actionable.length === 1 ? "" : "s"} at your ${stage}.</p>
      ${actionable.length ? rows : '<p style="opacity:0.6;">Nothing to action right now.</p>'}
    </div>`;

    el.querySelectorAll("[data-req-approve]").forEach(b => b.onclick = () => handleDecision(b.dataset.reqApprove, "approve"));
    el.querySelectorAll("[data-req-reject]").forEach(b  => b.onclick = () => handleDecision(b.dataset.reqReject, "reject"));
  }

  async function handleDecision(reqId, decision) {
    let reason = null;
    if (decision === "reject") {
      reason = prompt("Reason for rejection (optional, shown to student):");
      if (reason === null) return;
    }
    if (!confirm(`${decision === "approve" ? "Approve" : "Reject"} this request?`)) return;

    const { error } = await (window.qmsSupabase || window.supabaseClient).rpc("approve_club_request", {
      req_id: reqId,
      decision: decision,
      reason: reason
    });

    if (error) {
      console.error("[staff-clubs]", error);
      const msg = error.message || "Unknown error";
      if (window.QMS && QMS.showToast) QMS.showToast("Failed: " + msg, "error");
      else alert("Failed: " + msg);
      return;
    }

    if (window.QMS && QMS.showToast) {
      QMS.showToast(decision === "approve" ? "Request approved." : "Request rejected.", "success");
    }
    mountStaffClubs();
  }

  window.mountStaffClubs = mountStaffClubs;

  function wrapNavigate() {
    if (typeof window.navigate !== "function" || window.__staffClubsNavWrapped) return false;
    const orig = window.navigate;
    window.navigate = function (route) {
      if (route === "staff-club-requests") { try { return mountStaffClubs(); } catch (e) { console.error(e); } }
      return orig.apply(this, arguments);
    };
    window.__staffClubsNavWrapped = true;
    return true;
  }
  function injectNavItem() {
    const u = window.QMS && QMS.state && QMS.state.user;
    if (!u || !["hop","dean","admin"].includes(u.role)) return;
    const nav = document.querySelector(".sidebar-inner") || document.querySelector("aside.sidebar");
    if (!nav || nav.querySelector('[data-section="staff-club-requests"]')) return;
    const el = document.createElement("div");
    el.className = "sidebar-item";
    el.setAttribute("data-section", "staff-club-requests");
    el.innerHTML = '<span class="si-icon">📋</span><span>Club Requests</span>';
    el.onclick = () => {
      if (typeof window.closeSidebar === "function") { try { window.closeSidebar(); } catch(e){} }
      window.navigate("staff-club-requests");
    };
    var anchor = nav.querySelector('[data-section="student-management"]');
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(el, anchor.nextSibling);
    } else {
      nav.appendChild(el);
    }
  }
  const obs = new MutationObserver(() => { wrapNavigate(); injectNavItem(); });
  function init() { wrapNavigate(); injectNavItem(); obs.observe(document.body, { childList: true, subtree: true }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
