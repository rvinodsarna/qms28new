/* ai-smart.js — overrides the AI send handler to call Gemini with tool-calling.
   Bypasses the app's broken FAQ short-circuit that returns random FAQs. */
(function () {
  "use strict";
  if (window.__aiSmartLoaded) return;
  window.__aiSmartLoaded = true;

  function sb(){ return window.qmsSupabase || window.supabaseClient; }
  function user(){ return window.QMS && window.QMS.state && window.QMS.state.user; }
  function esc(s){ return window.escHtml ? window.escHtml(String(s||"")) : String(s||"").replace(/[&<>"']/g, function(c){ return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]; }); }

  var TOOL_DECLS = [
    { name: "search_faqs",
      description: "Search the QMS RISE FAQ knowledge base. ALWAYS call this first for any question about how the app works.",
      parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
    { name: "my_clubs", description: "Current student's club memberships.",
      parameters: { type: "object", properties: {} } },
    { name: "my_rise_points", description: "Current student's RISE points.",
      parameters: { type: "object", properties: {} } },
    { name: "my_evaluations", description: "Current student's evaluations.",
      parameters: { type: "object", properties: {} } },
    { name: "my_attendance", description: "Current student's attendance.",
      parameters: { type: "object", properties: {} } },
    { name: "count_students_by_programme", description: "Count active students by programme. Staff only.",
      parameters: { type: "object", properties: {} } },
    { name: "pending_club_requests", description: "Count pending club approvals. Staff only.",
      parameters: { type: "object", properties: {} } },
    { name: "active_club_memberships", description: "Count active club memberships. Staff only.",
      parameters: { type: "object", properties: {} } }
  ];

  var STOP = {"the":1,"a":1,"an":1,"is":1,"are":1,"to":1,"of":1,"in":1,"on":1,"for":1,"how":1,"what":1,"do":1,"does":1,"i":1,"my":1,"me":1,"can":1,"you":1,"it":1,"and":1,"or":1,"with":1,"about":1,"be":1,"that":1,"this":1,"am":1};

  async function callTool(name, args, u) {
    if (!u) return { error: "Not signed in" };
    var c = sb();
    var staff = ["hop","dean","admin"];
    try {
      if (name === "search_faqs") {
        var q = String(args.query || "").trim();
        if (!q) return { error: "Missing query" };
        var all = await c.from("faqs").select("question,answer,category").limit(2000);
        if (all.error) return { error: all.error.message };
        var faqs = all.data || [];
        var words = q.toLowerCase().split(/\s+/).filter(function(w){ return w.length > 2 && !STOP[w]; });
        var scored = faqs.map(function(f){
          var text = ((f.question||"") + " " + (f.answer||"")).toLowerCase();
          var s = 0;
          words.forEach(function(w){ if (text.indexOf(w) >= 0) s++; });
          return { q: f.question, a: f.answer, cat: f.category, score: s };
        }).filter(function(x){ return x.score > 0; })
          .sort(function(a,b){ return b.score - a.score; })
          .slice(0, 6);
        return { matches: scored, total_faqs: faqs.length };
      }
      if (name === "my_clubs") {
        var r1 = await c.from("student_clubs").select("semester,status,points,clubs(name),club_roles(title)").eq("student_id", u.id);
        return { memberships: r1.data || [] };
      }
      if (name === "my_rise_points") {
        var r2 = await c.from("rise_points").select("type,pts").eq("student_id", u.id);
        var rows = r2.data || [];
        var total = rows.reduce(function(a,x){ return a + (x.pts||0); }, 0);
        var byType = {};
        rows.forEach(function(x){ byType[x.type] = (byType[x.type]||0) + (x.pts||0); });
        return { total: total, by_type: byType };
      }
      if (name === "my_evaluations") {
        var r3 = await c.from("evaluations").select("lecturer_name,subject,score,ts").eq("student_id", u.id).limit(20);
        return { count: (r3.data||[]).length, evaluations: r3.data || [] };
      }
      if (name === "my_attendance") {
        var r4 = await c.from("attendance_logs").select("subject,type,pts,ts").eq("student_id", u.id).order("ts", { ascending: false }).limit(10);
        return { count: (r4.data||[]).length, records: r4.data || [] };
      }
      if (name === "count_students_by_programme") {
        if (staff.indexOf(u.role) === -1) return { error: "Not authorised" };
        var r6 = await c.from("students").select("programme,status").eq("status","active");
        var byProg = {};
        (r6.data||[]).forEach(function(x){ byProg[x.programme] = (byProg[x.programme]||0)+1; });
        return { total: (r6.data||[]).length, by_programme: byProg };
      }
      if (name === "pending_club_requests") {
        if (staff.indexOf(u.role) === -1) return { error: "Not authorised" };
        var r7 = await c.from("student_clubs").select("id", { count: "exact", head: true }).in("status", ["pending_hop","pending_dean"]);
        return { pending: r7.count || 0 };
      }
      if (name === "active_club_memberships") {
        if (staff.indexOf(u.role) === -1) return { error: "Not authorised" };
        var r8 = await c.from("student_clubs").select("id", { count: "exact", head: true }).eq("status","active");
        return { active: r8.count || 0 };
      }
      return { error: "Unknown tool: " + name };
    } catch (e) { return { error: String((e && e.message) || e) }; }
  }

  function findFunctionCall(data) {
    if (!data || !data.candidates || !data.candidates[0]) return null;
    var parts = data.candidates[0].content && data.candidates[0].content.parts;
    if (!parts) return null;
    for (var i = 0; i < parts.length; i++) if (parts[i].functionCall) return parts[i].functionCall;
    return null;
  }

  async function callSmartAI(userText) {
    var u = user();
    var client = sb();
    var sess = await client.auth.getSession();
    var token = sess.data && sess.data.session && sess.data.session.access_token;

    var systemPrompt =
      "You are the friendly AI Assistant inside UNIMY's QMS RISE app. " +
      "Current user: " + (u ? (u.name + " (role: " + u.role + (u.programme ? ", programme: " + u.programme : "") + ")") : "unknown") + ". " +
      "IMPORTANT RULES: " +
      "1. For ANY question about how the app works (features, attendance, evaluations, RISE points, tiers, quiz, clubs, auth, staff roles, developer), you MUST call the search_faqs tool first. " +
      "2. Base your answer strictly on the FAQ text returned. Do not invent features. " +
      "3. For questions about the user's own data (their clubs, points, evaluations, attendance), call the matching data tool. " +
      "4. Keep replies short, warm, WhatsApp-style with one fitting emoji. " +
      "5. Never mention that you are an AI language model.";

    var payload = {
      model: window.GEMINI_MODEL || "gemini-3.8-flash",
      body: {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userText }] }],
        tools: [{ function_declarations: TOOL_DECLS }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 400, thinkingConfig: { thinkingBudget: 0 } }
      }
    };

    var url = (typeof GEMINI_PROXY_URL !== "undefined" && GEMINI_PROXY_URL) || window.GEMINI_PROXY_URL || "/api/gemini-proxy";
    var headers = { "Content-Type": "application/json", "Authorization": "Bearer " + (token || "") };

    var r = await fetch(url, { method: "POST", headers: headers, body: JSON.stringify(payload) });
    var data = await r.json();

    var loops = 0;
    while (loops++ < 4) {
      var call = findFunctionCall(data);
      if (!call) { console.log("[ai-smart] no more tool calls, got final text"); break; }
      console.log("[ai-smart] tool call:", call.name, call.args);
      var result = await callTool(call.name, call.args || {}, u);
      console.log("[ai-smart] tool result:", JSON.stringify(result).slice(0, 300));
      payload.body.contents.push(
        { role: "model", parts: [{ functionCall: call }] },
        { role: "user",  parts: [{ functionResponse: { name: call.name, response: result } }] }
      );
      r = await fetch(url, { method: "POST", headers: headers, body: JSON.stringify(payload) });
      data = await r.json();
      console.log("[ai-smart] round", loops, "response:", JSON.stringify(data).slice(0, 400));
    }

    // Extract final text
    var parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
    var text = parts ? parts.map(function(p){ return p.text || ""; }).filter(Boolean).join("").trim() : "";
    console.log("[ai-smart] final text:", text);
    console.log("[ai-smart] RAW DATA:", JSON.stringify(data).slice(0, 2000));

    // If no text and the last response was still a tool call, force a text-only follow-up
    if (!text) {
      payload.body.tools = undefined;
      payload.body.contents.push({ role: "user", parts: [{ text: "Now answer my original question in 1-3 short sentences using the tool data above. Do not call any more tools." }] });
      r = await fetch(url, { method: "POST", headers: headers, body: JSON.stringify(payload) });
      data = await r.json();
      parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
      text = parts ? parts.map(function(p){ return p.text || ""; }).filter(Boolean).join("").trim() : "";
      console.log("[ai-smart] forced text:", text);
    }

    return text || "I couldn't find that in our FAQ. Try rephrasing, or contact support.";
  }

  function appendBubble(role, text) {
    var msgs = document.getElementById("ai-drawer-msgs");
    if (!msgs) return null;
    var time = new Date().toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" });
    var div = document.createElement("div");
    div.className = "ai-bubble-row " + (role === "user" ? "user" : "");
    var avatar = role === "assistant"
      ? '<div class="ai-drawer-avatar" style="width:26px;height:26px;font-size:13px;">🤖</div>'
      : "";
    var inner = role === "assistant" && text === null
      ? '<div class="typing-indicator-global" style="background:transparent;border:none;padding:0;"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>'
      : '<span class="ai-msg-text">' + esc(text) + '</span>';
    div.innerHTML = avatar + '<div class="ai-bubble ' + (role === "user" ? "user" : "assistant") + '">' + inner +
                    (text === null ? '' : '<div class="msg-time" style="font-size:10px;opacity:0.55;margin-top:3px;">' + time + '</div>') + '</div>';
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div.querySelector(".ai-bubble");
  }

  function installSmartSend() {
    if (!document.getElementById("ai-drawer-msgs")) return;
    if (window.__smartSendInstalled) return;
    window.__smartSendInstalled = true;

    window.sendAIMessage = async function (text) {
      text = String(text || "").trim();
      if (!text) return;
      appendBubble("user", text);
      var typingEl = appendBubble("assistant", null);
      try {
        var answer = null;
        if (typeof window.__aiLocalMatch === "function") {
          try {
            var __local = await window.__aiLocalMatch(text);
            if (__local && __local.faq && __local.score >= 0.4) {
              console.log("[ai-smart] local hit:", __local.faq.question, "(" + __local.score.toFixed(2) + ")");
              answer = __local.faq.answer;
            }
          } catch (__e) { console.warn("[ai-smart] local err:", __e); }
        }
        if (!answer) {
          try {
if (!answer) {
          try {
            var __best = await window.__aiLocalMatch(text);
            if (__best && __best.faq) {
              answer = __best.faq.answer;
              console.log("[ai] local:", __best.faq.question, "(" + __best.score.toFixed(2) + ")");
              if (__best.score < 0.25) {
                answer = "Closest match I found:\n\n" + answer + "\n\nIf that wasn't what you needed, try rephrasing or contact support.";
              }
            }
          } catch (__e) { console.error("[ai] local err:", __e); }
          if (!answer) answer = "I couldn't find a match for that in our FAQ. Try rephrasing, or contact support.";
        }
          } catch (__err) {
            console.warn("[ai-smart] Gemini failed:", __err);
          }
          // If Gemini returned empty or errored, fall back to best local FAQ regardless of score
          if (!answer || (typeof answer === "string" && answer.trim() === "")) {
            try {
              var __best = await window.__aiLocalMatch(text);
              if (__best && __best.faq) {
                console.log("[ai-smart] Gemini empty, using best local FAQ:", __best.faq.question, "(" + __best.score.toFixed(2) + ")");
                answer = __best.faq.answer + "\n\n(Closest FAQ match — let us know if it didn't help.)";
              }
            } catch (__e2) { console.warn("[ai-smart] fallback err:", __e2); }
          }
          if (!answer || (typeof answer === "string" && answer.trim() === "")) {
            answer = "I couldn't find a match right now. Please try rephrasing, or contact support.";
          }
        }
        if (typingEl) {
          typingEl.innerHTML = '<span class="ai-msg-text">' + esc(answer) +
            '</span><div class="msg-time" style="font-size:10px;opacity:0.55;margin-top:3px;">' +
            new Date().toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" }) + '</div>';
        }
      } catch (e) {
        console.error("[ai-smart]", e);
        if (typingEl) typingEl.innerHTML = '<span class="ai-msg-text">Sorry — something went wrong.</span>';
      }
      var msgs = document.getElementById("ai-drawer-msgs");
      if (msgs) msgs.scrollTop = msgs.scrollHeight;
    };

    console.log("[ai-smart] sendAIMessage override installed");
  }

  // Watch for the drawer opening, then install the override
  var obs = new MutationObserver(function () {
    if (document.getElementById("ai-drawer-msgs")) installSmartSend();
    else window.__smartSendInstalled = false;
  });
  function init() {
    obs.observe(document.body, { childList: true, subtree: true });
    if (document.getElementById("ai-drawer-msgs")) installSmartSend();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  console.log("[ai-smart] loaded");
})();