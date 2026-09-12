import { reactive, watch } from 'vue';
import { godJsonParse } from '../utils/godJsonParse';

const CONFIG_KEY = 'json_workbench_settings_v4';
const LAYOUT_KEY = 'json_workbench_layout_v4';

const defaultSettings = {
  arrayCopyMode: 'forEach',
  optionalChaining: false,
  showMethodsInAutocomplete: true,
  layoutMode: 'split', // 'split' | 'tab'
};

// ─── Global State Singleton ───────────────────────────────────────────────────
const state = reactive({
  settings: { ...defaultSettings },
  parsedData: null,
  rootVarName: 'data',
  currentView: 'tree',     // 'tree' | 'flow' | 'console'
  jsonInputText: '',
  jsonError: null,          // plain string (old compat)
  jsonParseResult: null,    // full godJsonParse result object
  consoleHistory: [],
  consoleInputDraft: '',
  inputPanelVisible: true,  // toggle hide/show JSON input
});

// Load persisted settings
try {
  const saved = localStorage.getItem(CONFIG_KEY);
  if (saved) Object.assign(state.settings, JSON.parse(saved));
} catch (e) { /* ignore */ }

// Auto-persist settings
watch(
  () => ({ ...state.settings }),
  (s) => { try { localStorage.setItem(CONFIG_KEY, JSON.stringify(s)); } catch (e) {} },
  { deep: true }
);

// ─── Composable ───────────────────────────────────────────────────────────────
export function useWorkbench() {

  const setJsonInput = (text) => {
    state.jsonInputText = text;
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

  const formatJson = () => {
    if (state.parsedData) state.jsonInputText = JSON.stringify(state.parsedData, null, 2);
  };

  const minifyJson = () => {
    if (state.parsedData) state.jsonInputText = JSON.stringify(state.parsedData);
  };

  const resetJson = () => {
    state.jsonInputText = '';
    state.parsedData = null;
    state.jsonError = null;
    state.jsonParseResult = null;
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

  return {
    state,
    setJsonInput,
    formatJson,
    minifyJson,
    resetJson,
    saveLayout,
    loadLayout,
    resetLayout,
    toggleInputPanel,
  };
}
