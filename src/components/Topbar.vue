<script setup>
import { ref, computed } from 'vue'
import { useWorkbench } from '../composables/useWorkbench'

const props = defineProps({
  inputVisible: Boolean,
  layoutMode: String,
})

const emit = defineEmits(['open-settings', 'toggle-input'])

const { state } = useWorkbench()
const isCustom = ref(!['data', 'item', 'response', 'result'].includes(state.rootVarName))
const customVar = ref(isCustom.value ? state.rootVarName : '')
const rootVarOptions = ['data', 'item', 'response', 'result']
const selectedRoot = ref(isCustom.value ? '__custom__' : state.rootVarName)

const onSelectChange = () => {
  if (selectedRoot.value === '__custom__') {
    isCustom.value = true
    state.rootVarName = customVar.value.trim() || 'data'
  } else {
    isCustom.value = false
    state.rootVarName = selectedRoot.value
  }
}

const onCustomInput = () => {
  const cleaned = customVar.value.replace(/[^A-Za-z0-9_$]/g, '')
  customVar.value = cleaned
  state.rootVarName = cleaned.trim() || 'data'
}

// Only show the hide-input button in split mode
const showToggleBtn = computed(() => props.layoutMode === 'split')
</script>

<template>
  <header class="topbar">
    <div class="topbar-left">
      <div class="logo-mark">
        <svg width="22" height="22" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="tbg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#f83600" />
              <stop offset="100%" stop-color="#f9d423" />
            </linearGradient>
          </defs>
          <path d="M 85 45 Q 60 45, 60 70 L 60 85 Q 60 100, 40 100 Q 60 100, 60 115 L 60 130 Q 60 155, 85 155"
            fill="none" stroke="url(#tbg)" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M 115 45 Q 140 45, 140 70 L 140 85 Q 140 100, 160 100 Q 140 100, 140 115 L 140 130 Q 140 155, 115 155"
            fill="none" stroke="url(#tbg)" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h1>JSON-PlayGround</h1>
    </div>

    <div class="topbar-actions">
      <!-- Hide/Show Input Panel (split mode only) -->
      <button
        v-if="showToggleBtn"
        class="btn-small btn-icon-label"
        :class="{ 'is-active': !inputVisible }"
        @click="emit('toggle-input')"
        :title="inputVisible ? 'Hide JSON Input panel' : 'Show JSON Input panel'"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <template v-if="inputVisible">
            <polyline points="16 18 22 12 16 6"/>
            <polyline points="8 6 2 12 8 18"/>
            <line x1="5" y1="12" x2="19" y2="12" stroke-dasharray="3 3" opacity="0.4"/>
          </template>
          <template v-else>
            <polyline points="8 18 2 12 8 6"/>
            <polyline points="16 6 22 12 16 18"/>
          </template>
        </svg>
        {{ inputVisible ? 'Hide Input' : 'Show Input' }}
      </button>

      <!-- Root Var -->
      <label class="root-var-label">
        Root Var:
        <select v-model="selectedRoot" @change="onSelectChange" class="setting-select">
          <option v-for="opt in rootVarOptions" :key="opt" :value="opt">{{ opt }}</option>
          <option value="__custom__">Custom&hellip;</option>
        </select>
        <input
          v-if="isCustom"
          type="text"
          v-model="customVar"
          @input="onCustomInput"
          class="custom-root-input"
          placeholder="myVar"
        />
      </label>

      <!-- Settings -->
      <button @click="emit('open-settings')" class="btn-small btn-settings" title="Configure settings">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        Settings
      </button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  height: 48px;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-mark {
  display: flex;
  align-items: center;
}

.topbar h1 {
  font-size: 15px;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(90deg, #fff 60%, #f9d423);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 0.3px;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.root-var-label {
  font-size: 12px;
  color: var(--text-dim);
  display: flex;
  align-items: center;
  gap: 6px;
}

.custom-root-input {
  background: var(--bg-panel-alt);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--accent);
  width: 90px;
  outline: none;
}
.custom-root-input:focus {
  border-color: var(--accent);
}

.btn-small {
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--bg-panel-alt);
  color: var(--text-dim);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 12px;
  cursor: pointer;
  font-family: var(--font-ui);
  transition: all 0.15s ease;
  white-space: nowrap;
}

.btn-small:hover {
  border-color: var(--accent);
  color: #fff;
}

.btn-small.is-active {
  border-color: var(--accent);
  background: rgba(88, 166, 255, 0.12);
  color: var(--accent);
}

.btn-settings {
  gap: 5px;
}
</style>
