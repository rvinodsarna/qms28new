// ai-faq.js — sidebar AI Assistant entry point.
// Delegates to openAIAssistant() in app.js. ai-smart.js adds
// Gemini tool-calling so the LLM can query the faqs table
// and live data on demand.
(function () {
  "use strict";

  window.mountAIAssistant = function () {
    if (typeof window.openAIAssistant === "function") {
      window.openAIAssistant();
      return;
    }
    console.warn("[AI] openAIAssistant not loaded yet");
  };

  console.log("[ai-faq] ready");
})();