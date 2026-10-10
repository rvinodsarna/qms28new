/* ai-faq-local.js — exposes local FAQ matcher, ai-smart.js calls it before Gemini */
(function () {
  "use strict";
  if (window.__aiFaqLocal) return;
  window.__aiFaqLocal = true;

  var STOP = {
    the:1,a:1,an:1,is:1,are:1,was:1,were:1,be:1,been:1,being:1,
    do:1,does:1,did:1,have:1,has:1,had:1,having:1,
    will:1,would:1,shall:1,should:1,can:1,could:1,may:1,might:1,must:1,
    i:1,me:1,my:1,we:1,our:1,you:1,your:1,he:1,him:1,his:1,
    she:1,her:1,it:1,its:1,they:1,them:1,their:1,
    what:1,which:1,who:1,whom:1,whose:1,where:1,when:1,why:1,how:1,
    this:1,that:1,these:1,those:1,and:1,or:1,but:1,if:1,then:1,
    of:1,in:1,on:1,at:1,to:1,for:1,with:1,by:1,from:1,about:1,
    as:1,into:1,through:1,during:1,before:1,after:1,above:1,below:1,
    up:1,down:1,out:1,off:1,over:1,under:1,again:1,further:1,
    once:1,here:1,there:1,all:1,any:1,both:1,each:1,few:1,
    more:1,most:1,other:1,some:1,such:1,no:1,nor:1,not:1,only:1,
    own:1,same:1,so:1,than:1,too:1,very:1,just:1,also:1
  };

  function sb() { return window.qmsSupabase || window.supabaseClient; }

  function tokenize(s) {
    if (!s) return [];
    return String(s).toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/)
      .filter(function (t) { return t.length > 1 && !STOP[t]; });
  }

  var faqs = [];
  var idf = {};
  var faqTokenSets = [];
  var loaded = false;
  var loading = null;

  async function loadFaqs() {
    if (loaded) return faqs;
    if (loading) return loading;
    loading = (async function () {
      try {
        var cached = localStorage.getItem("ai_faq_cache_v26");
        if (cached) {
          var parsed = JSON.parse(cached);
          if (parsed && parsed.ts && Date.now() - parsed.ts < 86400000 && parsed.faqs && parsed.faqs.length) {
            faqs = parsed.faqs;
            buildIndex();
            loaded = true;
            console.log("[ai-local] loaded from cache:", faqs.length);
            return faqs;
          }
        }
      } catch (e) {}
      console.log("[ai-local] fetching faqs...");
      var r = await sb().from("faqs").select("id,question,answer,category").range(0, 9999);
      if (r.error) { console.error("[ai-local] fetch error:", r.error); return []; }
      faqs = r.data || [];
      buildIndex();
      loaded = true;
      try { localStorage.setItem("ai_faq_cache_v26", JSON.stringify({ ts: Date.now(), faqs: faqs })); } catch (e) {}
      console.log("[ai-local] loaded", faqs.length, "faqs");
      return faqs;
    })();
    return loading;
  }

  function buildIndex() {
    var df = {};
    var total = faqs.length || 1;
    faqTokenSets = new Array(faqs.length);
    faqs.forEach(function (f, i) {
      var toks = tokenize(f.question);
      if (f.category) toks = toks.concat(tokenize(f.category));
      var seen = {}, unique = [];
      toks.forEach(function (t) {
        if (!seen[t]) { seen[t] = 1; df[t] = (df[t] || 0) + 1; unique.push(t); }
      });
      faqTokenSets[i] = unique;
    });
    idf = {};
    Object.keys(df).forEach(function (t) {
      idf[t] = Math.log((total + 1) / (df[t] + 1)) + 1;
    });
    console.log("[ai-local] index built:", Object.keys(idf).length, "tokens");
  }

  async function matchLocal(question) {
    await loadFaqs();
    if (!faqs.length) return { score: 0, faq: null };
    var qToks = tokenize(question);
    if (!qToks.length) return { score: 0, faq: null };
    var qTotal = 0;
    qToks.forEach(function (t) { qTotal += idf[t] || 1; });
    if (qTotal === 0) return { score: 0, faq: null };
    var bestScore = 0, bestIdx = -1;
    for (var i = 0; i < faqs.length; i++) {
      var set = faqTokenSets[i];
      var matched = 0;
      for (var j = 0; j < qToks.length; j++) {
        if (set.indexOf(qToks[j]) !== -1) matched += idf[qToks[j]] || 1;
      }
      var s = matched / qTotal;
      if (s > bestScore) { bestScore = s; bestIdx = i; }
    }
    return { score: bestScore, faq: bestIdx >= 0 ? faqs[bestIdx] : null };
  }

  // Expose for ai-smart.js to call before hitting Gemini
  window.__aiLocalMatch = matchLocal;

  // Pre-load in background
  loadFaqs().then(function () {
    console.log("[ai-local] matcher exposed as window.__aiLocalMatch");
  });
})();