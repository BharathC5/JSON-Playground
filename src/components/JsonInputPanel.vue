<script setup>
import { useWorkbench } from '../composables/useWorkbench'
import { showToast } from '../composables/useToast'
import { ref, computed, onMounted } from 'vue'

const {
  state, setJsonInput, formatJson, minifyJson, resetJson,
  saveToCache, loadFromCache, removeFromCache, clearCache, restoreLastInput,
} = useWorkbench()

const preRef = ref(null)
const showCacheDropdown = ref(false)

const onInput = (e) => {
  setJsonInput(e.target.value)
}

// Keep highlight layer scroll in sync with textarea
const onScroll = (e) => {
  if (preRef.value) {
    preRef.value.scrollTop = e.target.scrollTop
    preRef.value.scrollLeft = e.target.scrollLeft
  }
}

// Auto-format pasted JSON and auto-save to cache
const onPaste = (e) => {
  const raw = e.clipboardData?.getData('text')
  if (!raw) return
  let formatted
  try {
    const cleaned = raw
      .replace(/^\uFEFF/, '')
      .replace(/[\u00A0\u200B]/g, ' ')
    formatted = JSON.stringify(JSON.parse(cleaned), null, 2)
  } catch {
    return
  }
  e.preventDefault()
  setJsonInput(formatted)
  // Auto-save to history on successful paste
  saveToCache()
  showToast('✓ JSON auto-formatted & cached')
}

const onFormat = () => {
  if (!state.parsedData) return showToast('No valid JSON to format')
  formatJson()
}

const onMinify = () => {
  if (!state.parsedData) return showToast('No valid JSON to minify')
  minifyJson()
}

const onReset = () => resetJson()

const onSaveToCache = () => {
  if (!state.parsedData) return showToast('No valid JSON to save')
  saveToCache()
  showToast('✓ Saved to history')
}

const onLoadCacheEntry = (id) => {
  loadFromCache(id)
  showCacheDropdown.value = false
  showToast('✓ Loaded from history')
}

const onRemoveCacheEntry = (id) => {
  removeFromCache(id)
}

const timeAgo = (ts) => {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

// ─── Lightweight JSON syntax highlighter ──────────────────────────────────────
const highlighted = computed(() => {
  const text = state.jsonInputText
  if (!text) return ''

  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return escaped.replace(
    /("(?:\\u[0-9a-fA-F]{4}|\\[^u]|[^\\"\r\n])*"(?:\s*:)?|true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      if (match.startsWith('"')) {
        return match.endsWith(':')
          ? `<span class="hl-key">${match}</span>`
          : `<span class="hl-str">${match}</span>`
      }
      if (match === 'true' || match === 'false') return `<span class="hl-bool">${match}</span>`
      if (match === 'null') return `<span class="hl-null">${match}</span>`
      return `<span class="hl-num">${match}</span>`
    }
  )
})

// On mount: restore last session's JSON, or fall back to sample
onMounted(() => {
  if (!state.jsonInputText) {
    const restored = restoreLastInput()
    if (!restored) {
      const SAMPLE = {
        totalItems: 2,
        member: [
          { id: '101', type: 'VPMInstance', attributes: { name: 'High-Pressure Turbine', unitOfMeasure: 'EA' } },
          { id: '102', type: 'VPMInstance', attributes: { name: 'Centrifugal Pump', unitOfMeasure: 'EA' } },
        ],
      }
      setJsonInput(JSON.stringify(SAMPLE, null, 2))
    }
  }
})
</script>

<template>
  <section class="panel panel-json">
    <div class="panel-header">
      <span>
        {{ state.parsedData ? (state.rootVarName || 'data').toUpperCase() : 'PASTE JSON' }}
      </span>
      <div class="panel-header-actions">
        <button @click="onFormat" class="btn-small" title="Pretty-print the JSON">Format</button>
        <button @click="onMinify" class="btn-small" title="Minify the JSON">Minify</button>
        <button @click="onReset" class="btn-small btn-danger" title="Clear JSON and start over">Reset</button>
      </div>
    </div>

    <div class="editor-wrap">
      <pre
        ref="preRef"
        class="hl-pre"
        aria-hidden="true"
        v-html="highlighted || ' '"
      ></pre>

      <textarea
        :value="state.jsonInputText"
        @input="onInput"
        @paste="onPaste"
        @scroll="onScroll"
        class="json-textarea"
        spellcheck="false"
        autocorrect="off"
        autocapitalize="off"
        placeholder="Paste JSON payload here..."
      ></textarea>
    </div>

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

    <!-- Click-outside to close dropdown -->
    <div v-if="showCacheDropdown" class="cache-overlay" @click="showCacheDropdown = false"></div>
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

.header-badge {
  font-size: 9px;
  font-weight: 600;
  color: #98c379;
  background: rgba(152, 195, 121, 0.1);
  border-radius: 4px;
  padding: 1px 5px;
  margin-left: 6px;
  letter-spacing: 0.3px;
  vertical-align: middle;
}

/* ─── Editor wrap ──────────────────────────────────────────────────────────── */
.editor-wrap {
  flex: 1 1 auto;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.hl-pre,
.json-textarea {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
  padding: 16px;
  tab-size: 2;
  white-space: pre-wrap;
  word-break: break-all;
  box-sizing: border-box;
  width: 100%;
  margin: 0;
  border: none;
  outline: none;
}

.hl-pre {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  background: var(--bg);
  color: #5c6370;
  z-index: 0;
  height: 100%;
}

.json-textarea {
  position: relative;
  z-index: 1;
  resize: none;
  background: transparent;
  color: transparent;
  caret-color: #abb2bf;
  user-select: text;
  height: 100%;
  overflow: auto;
}

.json-textarea::placeholder {
  color: var(--text-faint);
  opacity: 1;
}

:deep(.hl-key)  { color: #e06c75; }
:deep(.hl-str)  { color: #98c379; }
:deep(.hl-num)  { color: #d19a66; }
:deep(.hl-bool) { color: #56b6c2; }
:deep(.hl-null) { color: #56b6c2; font-style: italic; }

/* ─── Cache / History ──────────────────────────────────────────────────────── */
.cache-dropdown-wrap {
  position: relative;
}

.btn-cache {
  display: flex;
  align-items: center;
  gap: 4px;
}
.btn-cache.active { border-color: var(--accent); color: var(--accent); }

.cache-count {
  background: var(--accent);
  color: var(--bg);
  font-size: 9px;
  font-weight: 700;
  border-radius: 8px;
  padding: 0 5px;
  min-width: 14px;
  text-align: center;
  line-height: 14px;
}


/* ─── Error panel ────────────────────────────────────────────────────────────  */
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
