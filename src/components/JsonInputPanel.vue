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
    <div v-if="state.jsonError" class="json-error">
      <div class="err-title">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        JSON Syntax Error
        <span v-if="state.jsonParseResult?.stagesRun?.length" class="stages-badge">
          Auto-fixed: {{ state.jsonParseResult.stagesRun.join(', ') }}
        </span>
      </div>
      <pre class="err-body">{{ state.jsonError }}</pre>
    </div>
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
  background: rgba(255, 123, 114, 0.08);
  border-top: 1px solid rgba(255, 123, 114, 0.4);
  font-family: var(--font-mono);
  font-size: 12px;
  user-select: text;
  flex-shrink: 0;
}

.err-title {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 14px 8px;
  color: var(--red);
  font-weight: 600;
  font-size: 12px;
  font-family: var(--font-ui);
  border-bottom: 1px solid rgba(255,123,114,0.2);
}

.stages-badge {
  margin-left: auto;
  font-size: 10px;
  font-weight: 500;
  background: rgba(126, 231, 135, 0.1);
  border: 1px solid var(--green);
  color: var(--green);
  border-radius: 4px;
  padding: 1px 6px;
  font-family: var(--font-mono);
}

.err-body {
  margin: 0;
  padding: 10px 14px;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--red);
  max-height: 150px;
  overflow-y: auto;
  opacity: 0.9;
}

</style>
