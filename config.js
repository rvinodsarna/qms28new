// QMS RISE v25 - Secure Config + Supabase + AI Helper
// Loads secrets from private GitHub repo and initializes:
// - window.supabase (Supabase client)
// - window.QMS_AI (AI helper with FAQ fallback; extendable to Gemini/OpenAI)

const CONFIG_URL = 'https://raw.githubusercontent.com/rvinodsarna/unimy-qms-config/main/qms-config.json';

let QMS_CONFIG = {
  supabase: { url: '', anonKey: '' },
  gemini: { apiKey: '', model: 'gemini-2.0-flash-exp' },
  openai: { apiKey: '', model: 'gpt-4o-mini' },
  app: { version: '25.0', name: 'UNIMY QMS RISE' }
};

// ---------- AI Helper (FAQ + optional LLMs) ----------

function createAIHelper() {
  let faqs = null;

  async function loadFaqs() {
    if (faqs) return faqs;
    try {
      if (!window.supabase) {
        console.warn('[QMS AI] Supabase not ready, skipping FAQ load');
        faqs = [];
        return faqs;
      }
      const { data, error } = await window.supabase
        .from('faqs')
        .select('question, answer, category');
      if (error) throw error;
      faqs = data || [];
      console.log('[QMS AI] Loaded', faqs.length, 'FAQs');
      return faqs;
    } catch (e) {
      console.error('[QMS AI] Failed to load FAQs:', e);
      faqs = [];
      return [];
    }
  }

  function bestFaqMatch(question, faqs) {
    const q = question.toLowerCase();
    let best = null;
    let bestScore = 0;
    for (const f of faqs || []) {
      const text = (f.question + ' ' + f.answer).toLowerCase();
      const words = q.split(/\s+/).filter(w => w.length > 2);
      const score = words.filter(w => text.includes(w)).length;
      if (score > bestScore) {
        bestScore = score;
        best = f;
      }
    }
    return bestScore > 0 ? best : null;
  }

  async function askAI(question, context = {}) {
    // Future: add Gemini/OpenAI calls here if keys are present.
    // For now, use FAQ fallback.
    const faqsLocal = await loadFaqs();
    const match = bestFaqMatch(question, faqsLocal);
    if (match) {
      return { source: 'faq', text: match.answer, faq: match };
    }

    return {
      source: 'fallback',
      text: "I couldn't find a specific answer. Try asking about login, evaluation, attendance, RISE points, or QMS RISE features."
    };
  }

  return { askAI, loadFaqs, bestFaqMatch };
}

// ---------- Config Loader ----------

async function loadConfig() {
  try {
    console.log('[QMS] Loading secure configuration...');

    const response = await fetch(CONFIG_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const config = await response.json();

    if (!config.supabase?.url || !config.supabase?.anonKey) {
      throw new Error('Invalid config: missing Supabase credentials');
    }

    QMS_CONFIG = config;

    console.log('[QMS] ✅ Configuration loaded');
    console.log('[QMS] Supabase URL:', config.supabase.url);

    // Initialize Supabase client on window.supabase
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      window.supabase = window.supabase.createClient(
        config.supabase.url,
        config.supabase.anonKey
      );
      console.log('[QMS] ✅ Supabase client initialized on window.supabase');
    } else {
      console.error('[QMS] ❌ Supabase CDN not loaded before config.js');
    }

    // Initialize AI helper
    window.QMS_AI = createAIHelper();
    window.askAI = window.QMS_AI.askAI;

    console.log('[QMS] ✅ AI helper initialized');
    return true;

  } catch (error) {
    console.error('[QMS] ❌ Config load failed:', error);

    const errorEl = document.createElement('div');
    errorEl.className = 'alert alert-error';
    errorEl.style.cssText = 'position:fixed;top:20px;right:20px;max-width:400px;z-index:9999;';
    errorEl.innerHTML = `
      <h3>❌ Configuration Error</h3>
      <p>Failed to load configuration: ${error.message}</p>
      <p style="font-size:12px;margin-top:8px;">
        Check that qms-config.json exists in your private GitHub repo.
      </p>
    `;
    document.body.appendChild(errorEl);

    return false;
  }
}

window.QMS_CONFIG = QMS_CONFIG;
window.loadConfig = loadConfig;
