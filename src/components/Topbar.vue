<script setup>
import { ref } from 'vue'
import { useWorkbench } from '../composables/useWorkbench'

const { state } = useWorkbench()
const isCustom = ref(state.rootVarName !== 'data' && state.rootVarName !== 'item' && state.rootVarName !== 'response' && state.rootVarName !== 'result')
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
</script>

<template>
  <header class="topbar">
    <div class="topbar-left">
      <h1>JSON-PlayGround</h1>
      <!-- Removed Architect badge -->
    </div>
    <div class="topbar-actions">
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
      <button @click="$emit('open-settings')" class="btn-small" title="Configure settings">
        ⚙ Settings
      </button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
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

.topbar h1 {
  font-size: 15px;
  font-weight: 700;
  margin: 0;
  color: #fff;
  letter-spacing: 0.5px;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
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
</style>
