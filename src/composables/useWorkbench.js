import { reactive, watch } from 'vue';
import { godJsonParse } from '../utils/godJsonParse';
import { DEFAULT_SAMPLE_JSON_STRING } from '../utils/defaultSampleJson';

const CONFIG_KEY = 'json_workbench_settings_v4';
const LAYOUT_KEY = 'json_workbench_layout_v4';
const CACHE_KEY  = 'json_workbench_cache_v1';
const LAST_KEY   = 'json_workbench_last_input';
const MAX_CACHE  = 10;

const defaultSettings = {
  arrayCopyMode: 'forEach',
  optionalChaining: false,
  showMethodsInAutocomplete: true,
  layoutMode: 'split', // 'split' | 'tab'
  splitPosition: 'left', // 'left' | 'bottom' | 'right'
  showDockInToolbar: false, // show Left/Bottom/Right dock buttons in the top bar
  persistCache: true,   // persist last JSON + history across reloads
  loadSampleJson: true, // load starter template when empty
};

// ─── Global State Singleton ───────────────────────────────────────────────────
const state = reactive({
  settings: { ...defaultSettings },
  parsedData: null,
  rootVarName: 'data',
  currentView: 'tree',     // 'tree' | 'flow' | 'console' | 'mapper'
  jsonInputText: '',
  jsonError: null,          // plain string (old compat)
  jsonParseResult: null,    // full godJsonParse result object
  consoleHistory: [],
  consoleInputDraft: '',
  inputPanelVisible: true,  // toggle hide/show JSON input
  jsonCache: [],            // [{ id, label, text, preview, timestamp }]
  isSampleTemplate: false,  // tracks whether active editor content is the starter template
});

// Load persisted settings
try {
  const saved = localStorage.getItem(CONFIG_KEY);
  if (saved) {
    Object.assign(state.settings, JSON.parse(saved));
    if (!['left', 'bottom', 'right'].includes(state.settings.splitPosition)) {
      state.settings.splitPosition = 'left';
    }
  }
} catch (e) { /* ignore */ }

// Load JSON cache
try {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) state.jsonCache = JSON.parse(cached);
} catch (e) { /* ignore */ }

// Auto-persist settings
watch(
  () => ({ ...state.settings }),
  (s) => { try { localStorage.setItem(CONFIG_KEY, JSON.stringify(s)); } catch (e) {} },
  { deep: true }
);

// Auto-persist JSON cache (only when enabled)
watch(
  () => [...state.jsonCache],
  (c) => {
    if (state.settings.persistCache) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch (e) {}
    }
  },
  { deep: true }
);

// ─── Cache helpers ────────────────────────────────────────────────────────────
let cacheUid = Date.now();

function makePreview(text) {
  try {
    const obj = JSON.parse(text);
    if (Array.isArray(obj)) return `Array[${obj.length}]`;
    if (typeof obj === 'object' && obj !== null) {
      const keys = Object.keys(obj);
      return keys.length <= 3 ? `{ ${keys.join(', ')} }` : `{ ${keys.slice(0, 3).join(', ')}, … } (${keys.length} keys)`;
    }
    return String(obj).slice(0, 40);
  } catch { return text.slice(0, 40) + '…'; }
}

function makeLabel(text) {
  try {
    const obj = JSON.parse(text);
    if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
      const keys = Object.keys(obj);
      // Try to find a name-like field
      const nameKey = keys.find(k => /^(name|title|id|type|label)$/i.test(k));
      if (nameKey) return `${nameKey}: ${String(obj[nameKey]).slice(0, 24)}`;
      return keys.slice(0, 2).join(', ');
    }
    if (Array.isArray(obj)) return `Array[${obj.length}]`;
    return String(obj).slice(0, 24);
  } catch { return 'Untitled'; }
}

// ─── Composable ───────────────────────────────────────────────────────────────
export function useWorkbench() {

  const setJsonInput = (text, isTemplate = false) => {
    state.jsonInputText = text;
    state.isSampleTemplate = isTemplate;
    // Persist last input for restore-on-reload (only if cache enabled)
    if (state.settings.persistCache) {
      if (isTemplate) {
        try { localStorage.removeItem(LAST_KEY); } catch (e) {}
      } else {
        try { localStorage.setItem(LAST_KEY, text); } catch (e) {}
      }
    }

    if (!text.trim()) {
      state.parsedData = null;
      state.jsonError = null;
      state.jsonParseResult = null;
      return;
    }
    const result = godJsonParse(text);
    state.jsonParseResult = result;
    if (result.ok) {
      state.parsedData = result.data;
      state.jsonError = null;
    } else {
      state.parsedData = null;
      // Build rich error string for display
      const parts = [`Line ${result.line}, Col ${result.col}`];
      if (result.path && result.path !== '$') parts.push(`at ${result.path}`);
      parts.push(result.error);
      if (result.snippet) parts.push(result.snippet);
      if (result.pointer) parts.push(result.pointer);
      state.jsonError = parts.join('\n');
    }
  };

  // ─── Cache operations ───────────────────────────────────────────────────────
  const saveToCache = (label, textOverride) => {
    const text = textOverride ?? state.jsonInputText;
    if (!text || !text.trim()) return;
    if (textOverride == null && !state.parsedData) return;
    if (textOverride != null) { try { JSON.parse(text); } catch { return; } }
    // Don't duplicate: remove existing with same text
    state.jsonCache = state.jsonCache.filter(c => c.text !== text);
    state.jsonCache.unshift({
      id: ++cacheUid,
      label: label || makeLabel(text),
      text,
      preview: makePreview(text),
      timestamp: Date.now(),
    });
    // Trim to max
    if (state.jsonCache.length > MAX_CACHE) state.jsonCache.length = MAX_CACHE;
  };

  const loadFromCache = (id) => {
    const entry = state.jsonCache.find(c => c.id === id);
    if (entry) setJsonInput(entry.text);
  };

  const removeFromCache = (id) => {
    state.jsonCache = state.jsonCache.filter(c => c.id !== id);
  };

  const clearCache = () => {
    state.jsonCache = [];
  };

  // Auto-save to cache when valid JSON is parsed (debounced via the paste handler)
  // We only auto-save on explicit paste, not every keystroke — handled in JsonInputPanel

  const formatJson = () => {
    if (state.parsedData) state.jsonInputText = JSON.stringify(state.parsedData, null, 2);
  };

  const minifyJson = () => {
    if (state.parsedData) state.jsonInputText = JSON.stringify(state.parsedData);
  };

  const resetJson = () => {
    state.jsonInputText = '';
    state.isSampleTemplate = false;
    state.parsedData = null;
    state.jsonError = null;
    state.jsonParseResult = null;
    try { localStorage.removeItem(LAST_KEY); } catch (e) {}
  };

  // Restore last session's JSON (only if cache enabled)
  const restoreLastInput = () => {
    if (!state.settings.persistCache) return false;
    try {
      const last = localStorage.getItem(LAST_KEY);
      if (last && last.trim()) {
        if (state.settings.loadSampleJson === false && (last.includes('ORG-2026-001') || last.includes('High-Pressure Turbine'))) {
          try { localStorage.removeItem(LAST_KEY); } catch (e) {}
          return false;
        }
        setJsonInput(last, false);
        return true;
      }
    } catch (e) {}
    return false;
  };

  // Wipe all persisted JSON data (called when user disables cache)
  const wipePersistedData = () => {
    try {
      localStorage.removeItem(LAST_KEY);
      localStorage.removeItem(CACHE_KEY);
    } catch (e) {}
    state.jsonCache = [];
  };

  const saveLayout = (layout) => {
    if (layout === null) {
      localStorage.removeItem(LAYOUT_KEY);
    } else {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
    }
  };

  const loadLayout = () => {
    try { return JSON.parse(localStorage.getItem(LAYOUT_KEY)) || null; }
    catch (e) { return null; }
  };

  const resetLayout = () => localStorage.removeItem(LAYOUT_KEY);

  const toggleInputPanel = () => {
    state.inputPanelVisible = !state.inputPanelVisible;
  };

  const loadDefaultJson = () => {
    setJsonInput(DEFAULT_SAMPLE_JSON_STRING, true);
  };

  return {
    state,
    setJsonInput,
    loadDefaultJson,
    formatJson,
    minifyJson,
    resetJson,
    saveLayout,
    loadLayout,
    resetLayout,
    toggleInputPanel,
    saveToCache,
    loadFromCache,
    removeFromCache,
    clearCache,
    restoreLastInput,
    wipePersistedData,
  };
}
