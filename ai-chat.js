/* ai-chat.js — QMS RISE AI Chat (FAQ + Gemini fallback) */
(function () {
  "use strict";
  if (window.__aiChatMounted) return;
  window.__aiChatMounted = true;

  var LS_HISTORY = "qms.aiChat.history.v2";
  var MAX_HISTORY = 60;
  var MAX_SUGG = 4;
  var THRESHOLD = 0.4;

  var STOP = {};
  "a an and or the is are was were be been being to of in on at for with by from as it this that these those i you he she we they me him her us them my your his its our their what when where why how do does did can could should would will".split(" ").forEach(function(w){ STOP[w]=1; });

  var faqs = [];
  var tokenIndex = {};
  var bigramIndex = {};
  var history = [];
  var isOpen = false;
  var isTyping = false;
  var isRec = false;
  var recog = null;
  var panel, msgList, input, sendBtn, launcher, micBtn, suggWrap;

  function tokenize(s) {
    return (s || "").toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(function(w){ return w.length > 1 && !STOP[w]; });
  }
  function bigrams(toks) {
    var out = [];
    for (var i = 0; i < toks.length - 1; i++) out.push(toks[i] + " " + toks[i+1]);
    return out;
  }
  function buildIndex() {
    tokenIndex = {};
    bigramIndex = {};
    faqs.forEach(function(f, i){
      var txt = (f.question||"") + " " + (f.answer||"") + " " + (f.category||"") + " " + ((f.keywords||[]).join(" "));
      var toks = tokenize(txt);
      var seen = {};
      toks.forEach(function(t){
        if (seen[t]) return; seen[t] = 1;
        if (!tokenIndex[t]) tokenIndex[t] = {};
        tokenIndex[t][i] = 1;
      });
      bigrams(toks).forEach(function(b){
        if (!bigramIndex[b]) bigramIndex[b] = {};
        bigramIndex[b][i] = 1;
      });
    });
  }
  function scoreFaq(query, idx) {
    var f = faqs[idx];
    var qToks = tokenize(query);
    if (!qToks.length) return 0;
    var fToks = tokenize((f.question||"") + " " + (f.answer||"") + " " + ((f.keywords||[]).join(" ")));
    var fSet = {};
    fToks.forEach(function(t){ fSet[t]=1; });
    var qUniq = {}, qArr = [];
    qToks.forEach(function(t){ if (!qUniq[t]) { qUniq[t]=1; qArr.push(t); } });
    var hit = 0;
    qArr.forEach(function(t){ if (fSet[t]) hit++; });
    var tokenScore = hit / qArr.length;

    var qBig = bigrams(qToks);
    var fBig = {};
    bigrams(fToks).forEach(function(b){ fBig[b]=1; });
    var bigHit = 0;
    qBig.forEach(function(b){ if (fBig[b]) bigHit++; });
    var bigScore = qBig.length ? bigHit / qBig.length : 0;

    var qL = query.toLowerCase().trim();
    var qLF = (f.question||"").toLowerCase();
    var sub = (qLF.indexOf(qL) !== -1 || qL.indexOf(qLF) !== -1) ? 1 : 0;

    return 0.55 * tokenScore + 0.30 * bigScore + 0.15 * sub;
  }
  function findBest(query) {
    if (!faqs.length) return null;
    var qToks = tokenize(query);
    if (!qToks.length) return null;
    var cand = {};
    qToks.forEach(function(t){
      var s = tokenIndex[t];
      if (s) for (var k in s) cand[k] = 1;
    });
    var keys = Object.keys(cand);
    if (!keys.length) { for (var i = 0; i < faqs.length; i++) cand[i] = 1; keys = Object.keys(cand); }
    var bestScore = 0, bestIdx = -1;
    keys.forEach(function(k){
      var s = scoreFaq(query, parseInt(k, 10));
      if (s > bestScore) { bestScore = s; bestIdx = parseInt(k, 10); }
    });
    if (bestScore < THRESHOLD) return null;
    return { score: bestScore, faq: faqs[bestIdx] };
  }
  function topSuggestions(n) {
    if (!faqs.length) return [];
    var seen = {}, out = [];
    var shuffled = faqs.slice().sort(function(){ return Math.random() - 0.5; });
    for (var i = 0; i < shuffled.length && out.length < n; i++) {
      var q = (shuffled[i].question || "").trim();
      if (!q || q.length > 60) continue;
      var k = q.slice(0, 24).toLowerCase();
      if (seen[k]) continue; seen[k] = 1;
      out.push(q);
    }
    return out;
  }

  function loadFaqs() {
    return new Promise(function(resolve){
      var sb = window.qmsSupabase || window.supabase;
      if (sb && sb.from) {
        sb.from("faqs").select("question,answer,category").limit(5000).then(function(r){
          if (!r.error && Array.isArray(r.data) && r.data.length) {
            faqs = r.data; buildIndex();
            console.log("[ai-chat] loaded " + faqs.length + " FAQs from Supabase");
            resolve(); return;
          }
          fetchJson();
        }).catch(function(){ fetchJson(); });
      } else { fetchJson(); }

      function fetchJson() {
        fetch("faqs-1000.json", { cache: "force-cache" }).then(function(r){
          if (!r.ok) throw new Error("no json");
          return r.json();
        }).then(function(data){
          if (Array.isArray(data) && data.length) {
            faqs = data; buildIndex();
            console.log("[ai-chat] loaded " + faqs.length + " FAQs from JSON");
          }
          resolve();
        }).catch(function(){
          console.warn("[ai-chat] no FAQs loaded");
          resolve();
        });
      }
    });
  }

  function loadHistory() {
    try {
      var raw = localStorage.getItem(LS_HISTORY);
      if (raw) history = JSON.parse(raw) || [];
      history = history.slice(-MAX_HISTORY);
    } catch (e) { history = []; }
  }
  function saveHistory() {
    try { localStorage.setItem(LS_HISTORY, JSON.stringify(history.slice(-MAX_HISTORY))); } catch (e) {}
  }

  function esc(s) {
    return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }

  function mount() {
    if (document.getElementById("ai-chat-launcher")) return;

    launcher = document.createElement("button");
    launcher.id = "ai-chat-launcher";
    launcher.className = "ai-chat-launcher";
    launcher.setAttribute("aria-label", "Open AI assistant");
    launcher.innerHTML = '<span aria-hidden="true">&#x1F916;</span><span class="ai-dot"></span>';
    launcher.addEventListener("click", toggle);
    document.body.appendChild(launcher);

    panel = document.createElement("div");
    panel.id = "ai-chat-panel";
    panel.className = "ai-chat-panel";
    panel.innerHTML =
      '<div class="ai-chat-header">' +
        '<div class="ai-chat-avatar">&#x2728;</div>' +
        '<div class="ai-chat-title">' +
          '<h3>QMS Assistant</h3>' +
          '<p>Powered by your knowledge base &middot; <span class="ai-chat-status">Online</span></p>' +
        '</div>' +
        '<div class="ai-chat-header-actions">' +
          '<button class="ai-chat-iconbtn" data-action="clear" title="Clear history">&#x1F5D1;</button>' +
          '<button class="ai-chat-iconbtn" data-action="close" title="Close">&#x2715;</button>' +
        '</div>' +
      '</div>' +
      '<div class="ai-chat-messages" id="ai-chat-messages"></div>' +
      '<div class="ai-suggestions" id="ai-suggestions"></div>' +
      '<div class="ai-chat-composer">' +
        '<button class="ai-chat-mic" id="ai-chat-mic" title="Voice input">&#x1F3A4;</button>' +
        '<textarea class="ai-chat-input" id="ai-chat-input" rows="1" placeholder="Ask anything about QMS..."></textarea>' +
        '<button class="ai-chat-send" id="ai-chat-send" title="Send">&#x27A4;</button>' +
      '</div>';
    document.body.appendChild(panel);

    msgList = panel.querySelector("#ai-chat-messages");
    input = panel.querySelector("#ai-chat-input");
    sendBtn = panel.querySelector("#ai-chat-send");
    micBtn = panel.querySelector("#ai-chat-mic");
    suggWrap = panel.querySelector("#ai-suggestions");

    panel.querySelector('[data-action="close"]').addEventListener("click", close);
    panel.querySelector('[data-action="clear"]').addEventListener("click", clearHistory);

    sendBtn.addEventListener("click", send);
    input.addEventListener("keydown", function(e){
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    });
    input.addEventListener("input", function(){
      input.style.height = "auto";
      input.style.height = Math.min(120, input.scrollHeight) + "px";
    });

    micBtn.addEventListener("click", toggleVoice);
    initVoice();

    document.addEventListener("keydown", function(e){
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); toggle(); }
      if (e.key === "Escape" && isOpen) close();
    });

    renderHistory();
    renderSuggestions();
  }

  function open() { isOpen = true; panel.classList.add("is-open"); setTimeout(function(){ input.focus(); }, 150); scrollBottom(); }
  function close() { isOpen = false; panel.classList.remove("is-open"); }
  function toggle() { if (isOpen) close(); else open(); }

  function scrollBottom() { if (msgList) msgList.scrollTop = msgList.scrollHeight; }

  function renderHistory() {
    if (!msgList) return;
    msgList.innerHTML = "";
    if (!history.length) {
      msgList.innerHTML =
        '<div class="ai-welcome">' +
          '<div class="ai-welcome-icon">&#x1F916;</div>' +
          '<h3>Hi! I am your QMS assistant.</h3>' +
          '<p>Ask me anything about attendance, evaluations, RISE points, CLO attainment, CQI, credits, or any QMS feature.</p>' +
        '</div>';
      return;
    }
    history.forEach(function(m){ addBubble(m.role, m.text, m.source, false); });
  }

  function addBubble(role, text, source, persist) {
    var wrap = document.createElement("div");
    wrap.className = "ai-msg " + (role === "user" ? "user" : "bot");
    var bubble = document.createElement("div");
    bubble.className = "ai-msg-bubble";
    var html = esc(text).replace(/\n/g, "<br/>");
    if (source) html += '<span class="ai-msg-source">' + esc(source) + '</span>';
    bubble.innerHTML = html;
    wrap.appendChild(bubble);
    msgList.appendChild(wrap);
    if (persist) {
      history.push({ role: role, text: text, source: source });
      history = history.slice(-MAX_HISTORY);
      saveHistory();
    }
    scrollBottom();
  }

  function showTyping() {
    var t = document.createElement("div");
    t.className = "ai-msg bot";
    t.id = "ai-typing-indicator";
    t.innerHTML = '<div class="ai-msg-bubble" style="padding:0"><div class="ai-typing"><span></span><span></span><span></span></div></div>';
    msgList.appendChild(t);
    scrollBottom();
  }
  function hideTyping() {
    var t = document.getElementById("ai-typing-indicator");
    if (t) t.remove();
  }

  function renderSuggestions() {
    if (!suggWrap) return;
    var s = topSuggestions(MAX_SUGG);
    if (!s.length) { suggWrap.innerHTML = ""; return; }
    suggWrap.innerHTML = s.map(function(q){
      return '<button class="ai-sugg" data-q="' + esc(q) + '">' + esc(q) + '</button>';
    }).join("");
    Array.prototype.forEach.call(suggWrap.querySelectorAll(".ai-sugg"), function(b){
      b.addEventListener("click", function(){
        input.value = b.dataset.q;
        send();
      });
    });
  }

  function send() {
    if (isTyping) return;
    var text = (input.value || "").trim();
    if (!text) return;
    input.value = "";
    input.style.height = "auto";
    addBubble("user", text, null, true);
    isTyping = true;
    sendBtn.disabled = true;
    showTyping();

    var reply = null, source = null;
    var match = findBest(text);
    if (match) {
      reply = match.faq.answer || match.faq.question || "I found a match but no answer text.";
      source = match.faq.category || "Answer";
    }

    if (!reply && window.__aiLocalMatch) {
      try {
        var local = window.__aiLocalMatch(text);
        if (local && (local.answer || local.text)) {
          reply = local.answer || local.text;
          source = "Answer";
        }
      } catch (e) {}
    }

    var finish = function() {
      if (!reply) {
        reply = "I could not find a specific answer. Try asking about: attendance, QR check-in, evaluations, RISE points, CLO attainment, CQI, credit transfers, or your dashboard.";
      }
      hideTyping();
      addBubble("bot", reply, source, true);
      isTyping = false;
      sendBtn.disabled = false;
      input.focus();
      renderSuggestions();
    };

    if (!reply) {
      askGemini(text).then(function(g){
        if (g) { reply = g; source = "AI"; }
        finish();
      }).catch(function(){ finish(); });
    } else {
      finish();
    }
  }

  function askGemini(text) {
    return new Promise(function(resolve){
      var sb = window.qmsSupabase || window.supabase;
      if (!sb) { resolve(null); return; }
      sb.auth.getSession().then(function(r){
        var token = r && r.data && r.data.session && r.data.session.access_token;
        if (!token) { resolve(null); return; }
        var ctx = faqs.slice(0, 40).map(function(f){ return "Q: " + f.question + "\nA: " + f.answer; }).join("\n\n");
        var payload = {
          model: "gemini-2.5-flash",
          body: {
            contents: [{ role: "user", parts: [{ text:
              "You are a helpful QMS assistant for UNIMY School of CyberSecurity and Data Intelligence (So-CSI). " +
              "Answer concisely using the FAQ context below when relevant. If unsure, say so.\n\n" +
              "FAQ CONTEXT:\n" + ctx + "\n\nUSER QUESTION: " + text
            }] }]
          }
        };
        fetch("/api/gemini-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
          body: JSON.stringify(payload)
        }).then(function(r){
          if (!r.ok) { resolve(null); return; }
          return r.json();
        }).then(function(j){
          if (!j) { resolve(null); return; }
          var cand = j.candidates && j.candidates[0];
          var parts = cand && cand.content && cand.content.parts;
          var out = parts && parts[0] && parts[0].text;
          resolve(out ? out.trim() : null);
        }).catch(function(){ resolve(null); });
      }).catch(function(){ resolve(null); });
    });
  }

  function clearHistory() {
    if (!confirm("Clear chat history?")) return;
    history = [];
    saveHistory();
    renderHistory();
    renderSuggestions();
  }

  function initVoice() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { micBtn.style.display = "none"; return; }
    recog = new SR();
    recog.lang = "en-US";
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    recog.onresult = function(e){
      var t = e.results[0][0].transcript;
      if (t) { input.value = t; send(); }
    };
    recog.onend = function(){ isRec = false; micBtn.classList.remove("is-recording"); };
    recog.onerror = function(){ isRec = false; micBtn.classList.remove("is-recording"); };
  }
  function toggleVoice() {
    if (!recog) return;
    if (isRec) { recog.stop(); isRec = false; micBtn.classList.remove("is-recording"); return; }
    try { recog.start(); isRec = true; micBtn.classList.add("is-recording"); } catch (e) {}
  }

  function start() {
    loadHistory();
    mount();
    loadFaqs().then(function(){
      renderSuggestions();
      console.log("[ai-chat] ready with " + faqs.length + " FAQs");
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  /* ---------- Remove legacy AI drawer from app.js ---------- */
  function killLegacyChat() {
    ['ai-drawer-box','ai-fab-root'].forEach(function(id){
      var el = document.getElementById(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    document.querySelectorAll('[id^="ai-drawer"],[id^="ai-fab"]').forEach(function(el){
      if (el.id !== 'ai-chat-panel' && el.id !== 'ai-chat-launcher') {
        el.style.display = 'none';
      }
    });
  }
  killLegacyChat();
  new MutationObserver(killLegacyChat).observe(document.body, { childList: true, subtree: true });



  /* ============ Student FAQ loader (append) ============ */
  function loadStudentFaqs() {
    return fetch("faqs-students.json", { cache: "force-cache" })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (arr) {
        if (!Array.isArray(arr) || !arr.length) return;
        arr.forEach(function (f) {
          faqs.push({
            question: f.question || "",
            answer:   f.answer   || "",
            category: f.category || "Student",
            keywords: f.keywords || []
          });
        });
        buildIndex();
        console.log("[ai-chat] +" + arr.length + " student FAQs");
        renderSuggestions();
      })
      .catch(function (e) { console.warn("[ai-chat] student FAQs:", e.message); });
  }

  // Kick off the student loader once the main loader resolves
  var __origLoadFaqs = loadFaqs;
  loadFaqs = function () {
    return __origLoadFaqs().then(loadStudentFaqs);
  };

})();


/* Prevent keyboard popup on suggestion click */
(function(){if(window.__noKbOnSuggest)return;window.__noKbOnSuggest=true;function isTouch(){return ('ontouchstart' in window)||(navigator.maxTouchPoints>0);}document.addEventListener('click',function(e){if(!isTouch())return;var chip=e.target&&e.target.closest&&e.target.closest('.ai-chat-suggestions button,.ai-chat-quick-replies button,[class*=suggest] button,[class*=chip]');if(!chip)return;var inp=document.querySelector('.ai-chat-input,#ai-chat-input');if(inp){inp.blur();}var active=document.activeElement;if(active&&active.blur)active.blur();},true);setInterval(function(){var inp=document.querySelector('.ai-chat-input,#ai-chat-input');if(!inp)return;if(inp.__kbFixed)return;inp.__kbFixed=true;inp.addEventListener('focus',function(){if(!isTouch())return;window.__kbOpenTime=Date.now();});},800);})();

/* Prevent keyboard popup on suggestion click */
(function(){if(window.__noKbOnSuggest)return;window.__noKbOnSuggest=true;function isTouch(){return ('ontouchstart' in window)||(navigator.maxTouchPoints>0);}document.addEventListener('click',function(e){if(!isTouch())return;var chip=e.target&&e.target.closest&&e.target.closest('.ai-chat-suggestions button,.ai-chat-quick-replies button,[class*=suggest] button,[class*=chip]');if(!chip)return;var inp=document.querySelector('.ai-chat-input,#ai-chat-input');if(inp){inp.blur();}var active=document.activeElement;if(active&&active.blur)active.blur();},true);setInterval(function(){var inp=document.querySelector('.ai-chat-input,#ai-chat-input');if(!inp)return;if(inp.__kbFixed)return;inp.__kbFixed=true;inp.addEventListener('focus',function(){if(!isTouch())return;window.__kbOpenTime=Date.now();});},800);})();