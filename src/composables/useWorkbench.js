import { reactive, ref, computed, watch } from 'vue';

const CONFIG_KEY = 'json_workbench_settings_v3';
const LAYOUT_KEY = 'json_workbench_layout_v3';

const defaultSettings = {
  arrayCopyMode: 'forEach',
  optionalChaining: false,
  showMethodsInAutocomplete: true,
};

// Global State Singleton
const state = reactive({
  settings: { ...defaultSettings },
  parsedData: null,
  rootVarName: 'data',
  currentView: 'tree',
  jsonInputText: '',
  jsonError: null,
  consoleHistory: [],
});

// Load settings
try {
  const saved = localStorage.getItem(CONFIG_KEY);
  if (saved) {
    Object.assign(state.settings, JSON.parse(saved));
  }
} catch (e) {
  console.warn('Could not read saved settings', e);
}

// Watch settings and persist to localStorage
watch(
  () => state.settings,
  (newSettings) => {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(newSettings));
    } catch (e) {}
  },
  { deep: true }
);

// Helpers
export function useWorkbench() {
  const setJsonInput = (text) => {
    state.jsonInputText = text;
    if (!text.trim()) {
      state.parsedData = null;
      state.jsonError = null;
      return;
    }
    try {
      state.parsedData = JSON.parse(text);
      state.jsonError = null;
    } catch (e) {
      state.parsedData = null;
      state.jsonError = e.message;
    }
  };

  const formatJson = () => {
    if (state.parsedData) {
      state.jsonInputText = JSON.stringify(state.parsedData, null, 2);
    }
  };

  const minifyJson = () => {
    if (state.parsedData) {
      state.jsonInputText = JSON.stringify(state.parsedData);
    }
  };

  const resetJson = () => {
    state.jsonInputText = '';
    state.parsedData = null;
    state.jsonError = null;
  };

  const saveLayout = (layout) => {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  };

  const loadLayout = () => {
    try {
      return JSON.parse(localStorage.getItem(LAYOUT_KEY)) || null;
    } catch (e) {
      return null;
    }
  };
  
  const resetLayout = () => {
    localStorage.removeItem(LAYOUT_KEY);
  }

  return {
    state,
    setJsonInput,
    formatJson,
    minifyJson,
    resetJson,
    saveLayout,
    loadLayout,
    resetLayout,
  };
}
