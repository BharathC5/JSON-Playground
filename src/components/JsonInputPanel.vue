<script setup>
import { useWorkbench } from '../composables/useWorkbench'
import { showToast } from '../composables/useToast'
import { ref, onMounted } from 'vue'

const { state, setJsonInput, formatJson, minifyJson, resetJson } = useWorkbench()

const onInput = (e) => {
  setJsonInput(e.target.value)
}

const onFormat = () => {
  if (!state.parsedData) return showToast('No valid JSON to format')
  formatJson()
}

const onMinify = () => {
  if (!state.parsedData) return showToast('No valid JSON to minify')
  minifyJson()
}

const onReset = () => {
  resetJson()
}

// Initialize with sample data if empty
onMounted(() => {
  if (!state.jsonInputText) {
    const SAMPLE = {
      totalItems: 2,
      member: [
        {
          id: "101",
          type: "VPMInstance",
          attributes: { name: "High-Pressure Turbine", unitOfMeasure: "EA" },
        },
        {
          id: "102",
          type: "VPMInstance",
          attributes: { name: "Centrifugal Pump", unitOfMeasure: "EA" },
        },
      ],
    }
    setJsonInput(JSON.stringify(SAMPLE, null, 2))
  }
})
</script>

<template>
  <section class="panel panel-json">
    <div class="panel-header">
      <span>PASTE JSON</span>
      <div class="panel-header-actions">
        <button @click="onFormat" class="btn-small" title="Pretty-print the JSON">Format</button>
        <button @click="onMinify" class="btn-small" title="Minify the JSON">Minify</button>
        <button @click="onReset" class="btn-small btn-danger" title="Clear JSON and start over">Reset</button>
      </div>
    </div>
    <textarea
      :value="state.jsonInputText"
      @input="onInput"
      class="json-textarea"
      spellcheck="false"
      placeholder="Paste JSON payload here..."
    ></textarea>
    <div v-if="state.jsonError" class="json-error">{{ "JSON Syntax Error: " + state.jsonError }}</div>
  </section>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  position: relative;
  background: var(--bg);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.8px;
  color: var(--text-dim);
  flex-shrink: 0;
  height: 40px;
}

.panel-header-actions {
  display: flex;
  gap: 8px;
}

.json-textarea {
  flex: 1 1 auto;
  min-height: 0;
  resize: none;
  border: none;
  outline: none;
  background: var(--bg);
  color: #abb2bf;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
  padding: 16px;
  tab-size: 2;
  user-select: text;
}

.json-error {
  background: rgba(255, 123, 114, 0.1);
  color: var(--red);
  border-top: 1px solid var(--red);
  padding: 12px 16px;
  font-family: var(--font-mono);
  font-size: 12px;
  white-space: pre-wrap;
  max-height: 120px;
  overflow-y: auto;
  user-select: text;
}
</style>
