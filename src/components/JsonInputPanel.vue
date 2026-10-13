<script setup>
import { useWorkbench } from '../composables/useWorkbench'
import { showToast } from '../composables/useToast'
import { ref, computed, onMounted, nextTick } from 'vue'
import { DEFAULT_SAMPLE_JSON_STRING } from '../utils/defaultSampleJson'
import { godJsonParse } from '../utils/godJsonParse'

const {
  state, setJsonInput, formatJson, minifyJson, resetJson,
  saveToCache, loadFromCache, removeFromCache, clearCache, restoreLastInput,
} = useWorkbench()

const preRef = ref(null)
const textareaRef = ref(null)
const showCacheDropdown = ref(false)

const selectedText = ref('')
const selectionRange = ref({ start: 0, end: 0 })
const cursorIndex = ref(0)

const onInput = (e) => {
  setJsonInput(e.target.value)
  updateSelection(e)
}

// Keep highlight layer scroll in sync with textarea
const onScroll = (e) => {
  if (preRef.value) {
    preRef.value.scrollTop = e.target.scrollTop
    preRef.value.scrollLeft = e.target.scrollLeft
  }
}

// Track text selection and cursor position
const updateSelection = (e) => {
  const el = e?.target || textareaRef.value
  if (!el) return
  const start = el.selectionStart ?? 0
  const end = el.selectionEnd ?? 0
  cursorIndex.value = start
  selectionRange.value = { start, end }

  if (start !== end) {
    const raw = el.value.substring(start, end)
    selectedText.value = raw.trim()
  } else {
    selectedText.value = ''
  }
}

// Tab & Enter key handling in editor
const onKeyDown = (e) => {
  const el = textareaRef.value || e.target
  if (!el) return

  // 1. Tab key: Indent / Outdent 2 spaces without jumping to buttons
  if (e.key === 'Tab') {
    e.preventDefault()
    const start = el.selectionStart
    const end = el.selectionEnd
    const val = el.value

    if (e.shiftKey) {
      // Shift+Tab: Outdent 2 spaces
      if (start === end) {
        const lineStart = val.lastIndexOf('\n', start - 1) + 1
        const linePrefix = val.substring(lineStart, lineStart + 2)
        let removeCount = 0
        if (linePrefix === '  ') removeCount = 2
        else if (linePrefix.startsWith(' ')) removeCount = 1

        if (removeCount > 0) {
          const newVal = val.substring(0, lineStart) + val.substring(lineStart + removeCount)
          setJsonInput(newVal)
          nextTick(() => {
            el.selectionStart = el.selectionEnd = Math.max(lineStart, start - removeCount)
            updateSelection({ target: el })
          })
        }
      } else {
        const lineStart = val.lastIndexOf('\n', start - 1) + 1
        const lineEnd = val.indexOf('\n', end)
        const effectiveEnd = lineEnd === -1 ? val.length : lineEnd
        const block = val.substring(lineStart, effectiveEnd)
        const lines = block.split('\n')
        let totalRemoved = 0
        let firstLineRemoved = 0

        const newLines = lines.map((line, idx) => {
          let rem = 0
          if (line.startsWith('  ')) rem = 2
          else if (line.startsWith(' ')) rem = 1
          if (idx === 0) firstLineRemoved = rem
          totalRemoved += rem
          return line.substring(rem)
        })

        const newVal = val.substring(0, lineStart) + newLines.join('\n') + val.substring(effectiveEnd)
        setJsonInput(newVal)
        nextTick(() => {
          el.selectionStart = Math.max(lineStart, start - firstLineRemoved)
          el.selectionEnd = Math.max(lineStart, end - totalRemoved)
          updateSelection({ target: el })
        })
      }
    } else {
      // Tab: Indent 2 spaces
      if (start === end) {
        const newVal = val.substring(0, start) + '  ' + val.substring(end)
        setJsonInput(newVal)
        nextTick(() => {
          el.selectionStart = el.selectionEnd = start + 2
          updateSelection({ target: el })
        })
      } else {
        const lineStart = val.lastIndexOf('\n', start - 1) + 1
        const lineEnd = val.indexOf('\n', end)
        const effectiveEnd = lineEnd === -1 ? val.length : lineEnd
        const block = val.substring(lineStart, effectiveEnd)
        const lines = block.split('\n')
        const newLines = lines.map(line => '  ' + line)
        const added = lines.length * 2

        const newVal = val.substring(0, lineStart) + newLines.join('\n') + val.substring(effectiveEnd)
        setJsonInput(newVal)
        nextTick(() => {
          el.selectionStart = start + 2
          el.selectionEnd = end + added
          updateSelection({ target: el })
        })
      }
    }
    return
  }

  // 2. Enter key: Auto-indent to current line level, expanding brackets cleanly
  if (e.key === 'Enter') {
    const start = el.selectionStart
    const end = el.selectionEnd
    const val = el.value

    if (start === end) {
      const lineStart = val.lastIndexOf('\n', start - 1) + 1
      const currentLine = val.substring(lineStart, start)
      const matchIndent = currentLine.match(/^[ \t]*/)
      const indent = matchIndent ? matchIndent[0] : ''

      const trimmedBefore = currentLine.trimEnd()
      const extra = (trimmedBefore.endsWith('{') || trimmedBefore.endsWith('[')) ? '  ' : ''
      const nextChar = val.charAt(start)

      if (extra && (nextChar === '}' || nextChar === ']')) {
        e.preventDefault()
        const insert = '\n' + indent + extra + '\n' + indent
        const newVal = val.substring(0, start) + insert + val.substring(start)
        setJsonInput(newVal)
        nextTick(() => {
          el.selectionStart = el.selectionEnd = start + 1 + indent.length + extra.length
          updateSelection({ target: el })
        })
        return
      }

      if (indent.length > 0 || extra.length > 0) {
        e.preventDefault()
        const insert = '\n' + indent + extra
        const newVal = val.substring(0, start) + insert + val.substring(start)
        setJsonInput(newVal)
        nextTick(() => {
          el.selectionStart = el.selectionEnd = start + insert.length
          updateSelection({ target: el })
        })
        return
      }
    }
  }
}

// Helper: check if editor currently contains the starter sample template
function isCurrentContentTemplate() {
  if (state.isSampleTemplate) return true
  const txt = (state.jsonInputText || '').trim()
  if (!txt) return false
  if (txt === DEFAULT_SAMPLE_JSON_STRING.trim()) return true
  if (txt.includes('ORG-2026-001') && txt.includes('Global Engineering Systems')) return true
  if (txt.includes('High-Pressure Turbine')) return true
  return false
}

// Auto-format pasted JSON and auto-save to cache
const onPaste = (e) => {
  const raw = e.clipboardData?.getData('text')
  if (!raw) return

  const isTemplate = isCurrentContentTemplate()

  const cleaned = raw
    .replace(/^\uFEFF/, '')
    .replace(/[\u00A0\u200B]/g, ' ')

  let formatted = null
  try {
    formatted = JSON.stringify(JSON.parse(cleaned), null, 2)
  } catch {
    const res = godJsonParse(cleaned)
    if (res.ok && res.data !== undefined) {
      formatted = JSON.stringify(res.data, null, 2)
    }
  }

  const toSet = formatted || cleaned

  // When pasting over the sample template, wipe the template and fill with pasted JSON
  if (isTemplate) {
    e.preventDefault()
    setJsonInput(toSet, false)
    saveToCache()
    showToast(formatted ? '✓ Template replaced & auto-formatted' : '✓ Template replaced with pasted JSON')
    return
  }

  // If not template: if whole editor is selected or editor is empty, replace all
  const el = textareaRef.value
  const isAllSelected = el && el.selectionStart === 0 && el.selectionEnd === el.value.length
  const isEmpty = !state.jsonInputText || !state.jsonInputText.trim()

  if (formatted && (isAllSelected || isEmpty)) {
    e.preventDefault()
    setJsonInput(formatted, false)
    saveToCache()
    showToast('✓ JSON auto-formatted & cached')
    return
  }
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
  selectedText.value = ''
}

// ─── Left & Right Bracket Matching ──────────────────────────────────────────
function findBracketMatch(text, pos) {
  if (!text) return null
  let targetIdx = -1
  let char = ''
  if (pos < text.length && '{}[()]'.includes(text[pos])) {
    targetIdx = pos
    char = text[pos]
  } else if (pos > 0 && '{}[()]'.includes(text[pos - 1])) {
    targetIdx = pos - 1
    char = text[pos - 1]
  }
  if (targetIdx === -1) return null

  const pairs = {
    '{': { close: '}', dir: 1 },
    '[': { close: ']', dir: 1 },
    '(': { close: ')', dir: 1 },
    '}': { close: '{', dir: -1 },
    ']': { close: '[', dir: -1 },
    ')': { close: '(', dir: -1 },
  }
  const info = pairs[char]
  if (!info) return null

  let depth = 0
  let inStr = false
  let esc = false
  const dir = info.dir
  const targetChar = info.close

  let i = targetIdx
  while (dir === 1 ? i < text.length : i >= 0) {
    const c = text[i]
    if (c === '"' && !esc) inStr = !inStr
    esc = (c === '\\' && !esc)

    if (!inStr) {
      if (c === char) depth++
      else if (c === targetChar) {
        depth--
        if (depth === 0) {
          return { left: Math.min(targetIdx, i), right: Math.max(targetIdx, i) }
        }
      }
    }
    i += dir
  }
  return null
}

// ─── Case-Matched Recurring Occurrence Finder ───────────────────────────────
// When user selects a key/value (e.g. "E"), also matches left/right paired things (e.g. "/E")
function findOccurrences(text, selText, selStart, selEnd) {
  if (!text || !selText) return []
  const q = selText.trim()
  if (!q) return []

  const cleanQ = q.replace(/^["']|["']$/g, '')
  if (!cleanQ) return []

  // Gather matching variants:
  // e.g. "E" -> matches "E" and "/E"; "/E" -> matches "/E" and "E"
  const variants = new Set([cleanQ])
  if (cleanQ.startsWith('/')) {
    const stripped = cleanQ.slice(1)
    if (stripped) variants.add(stripped)
  } else {
    variants.add('/' + cleanQ)
  }

  const occurrences = []
  const sorted = Array.from(variants).sort((a, b) => b.length - a.length)

  for (const v of sorted) {
    let idx = 0
    while ((idx = text.indexOf(v, idx)) !== -1) {
      const end = idx + v.length
      const overlaps = occurrences.some(o => !(end <= o.start || idx >= o.end))
      if (!overlaps) {
        occurrences.push({
          start: idx,
          end,
          isActive: idx === selStart && end === selEnd,
        })
      }
      idx++
    }
  }

  return occurrences.sort((a, b) => a.start - b.start)
}

const escapeHtml = (str) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

// ─── Robust Tokenizer & Highlighter ──────────────────────────────────────────
const highlighted = computed(() => {
  const text = state.jsonInputText
  if (!text) return ''

  const bracketMatch = findBracketMatch(text, cursorIndex.value)
  const occurrences = (selectedText.value && selectedText.value.length >= 1)
    ? findOccurrences(text, selectedText.value, selectionRange.value.start, selectionRange.value.end)
    : []

  const renderSnippet = (str, strStart) => {
    if (occurrences.length === 0) return escapeHtml(str)

    let out = ''
    let cur = 0
    const strEnd = strStart + str.length

    for (const occ of occurrences) {
      if (occ.end <= strStart || occ.start >= strEnd) continue

      const matchStartInStr = Math.max(0, occ.start - strStart)
      const matchEndInStr = Math.min(str.length, occ.end - strStart)

      if (matchStartInStr > cur) {
        out += escapeHtml(str.substring(cur, matchStartInStr))
      }

      const matchText = str.substring(matchStartInStr, matchEndInStr)
      out += `<mark class="hl-occurrence${occ.isActive ? ' active' : ''}">${escapeHtml(matchText)}</mark>`
      cur = matchEndInStr
    }

    if (cur < str.length) {
      out += escapeHtml(str.substring(cur))
    }
    return out
  }

  const tokenRegex = /("(?:\\u[0-9a-fA-F]{4}|\\[^u]|[^\\"\r\n])*"(?:\s*:)?|true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}[\]]|[:,]|\s+|[^\s"{}[\]:,]+)/g

  let match
  let html = ''

  while ((match = tokenRegex.exec(text)) !== null) {
    const raw = match[0]
    const start = match.index

    if (raw.startsWith('"')) {
      if (raw.endsWith(':')) {
        html += `<span class="hl-key">${renderSnippet(raw, start)}</span>`
      } else {
        html += `<span class="hl-str">${renderSnippet(raw, start)}</span>`
      }
    } else if (raw === 'true' || raw === 'false') {
      html += `<span class="hl-bool">${renderSnippet(raw, start)}</span>`
    } else if (raw === 'null') {
      html += `<span class="hl-null">${renderSnippet(raw, start)}</span>`
    } else if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(raw)) {
      html += `<span class="hl-num">${renderSnippet(raw, start)}</span>`
    } else if ('{}[()]'.includes(raw) && raw.length === 1) {
      const isMatched = bracketMatch && (start === bracketMatch.left || start === bracketMatch.right)
      html += `<span class="hl-bracket${isMatched ? ' hl-bracket-match' : ''}">${renderSnippet(raw, start)}</span>`
    } else if (raw === ':' || raw === ',') {
      html += `<span class="hl-punct">${escapeHtml(raw)}</span>`
    } else {
      html += renderSnippet(raw, start)
    }
  }

  return html
})

// On mount: restore last session's JSON, or fall back to sample if enabled
onMounted(() => {
  if (!state.jsonInputText) {
    const restored = restoreLastInput()
    if (!restored) {
      if (state.settings.loadSampleJson !== false) {
        setJsonInput(DEFAULT_SAMPLE_JSON_STRING, true)
      }
    } else if (state.jsonInputText.includes('High-Pressure Turbine')) {
      if (state.settings.loadSampleJson !== false) {
        setJsonInput(DEFAULT_SAMPLE_JSON_STRING, true)
      } else {
        resetJson()
      }
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
        ref="textareaRef"
        :value="state.jsonInputText"
        @input="onInput"
        @paste="onPaste"
        @scroll="onScroll"
        @keydown="onKeyDown"
        @select="updateSelection"
        @keyup="updateSelection"
        @mouseup="updateSelection"
        @click="updateSelection"
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
  letter-spacing: 0px;
  font-variant-ligatures: none;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.hl-pre {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
  background: var(--bg);
  color: #abb2bf;
  z-index: 0;
  height: 100%;
}

.json-textarea {
  position: relative;
  z-index: 1;
  resize: none;
  background: transparent;
  color: transparent;
  caret-color: #58a6ff;
  user-select: text !important;
  -webkit-user-select: text !important;
  height: 100%;
  overflow: auto;
}

/* Translucent selection so colored syntax underneath is 100% visible */
.json-textarea::selection {
  background: rgba(88, 166, 255, 0.35) !important;
  color: transparent !important;
}

.json-textarea::-moz-selection {
  background: rgba(88, 166, 255, 0.35) !important;
  color: transparent !important;
}

.json-textarea::placeholder {
  color: var(--text-faint);
  opacity: 1;
}

/* Syntax colors */
:deep(.hl-key)     { color: #e06c75; font-weight: 600; }
:deep(.hl-str)     { color: #98c379; }
:deep(.hl-num)     { color: #d19a66; }
:deep(.hl-bool)    { color: #56b6c2; font-weight: 600; }
:deep(.hl-null)    { color: #e5c07b; font-style: italic; }
:deep(.hl-bracket) { color: #abb2bf; }
:deep(.hl-punct)   { color: #5c6370; }

/* Left & Right Bracket Matching */
:deep(.hl-bracket-match) {
  color: #fff !important;
  background: rgba(88, 166, 255, 0.35);
  outline: 1px solid #58a6ff;
  border-radius: 2px;
  font-weight: 700;
  box-shadow: 0 0 5px rgba(88, 166, 255, 0.5);
}

/* Recurring Occurrence Highlight (case-matched) */
:deep(.hl-occurrence) {
  background: rgba(229, 192, 123, 0.28);
  outline: 1px solid rgba(229, 192, 123, 0.65);
  border-radius: 2px;
  color: inherit;
  box-shadow: 0 0 4px rgba(229, 192, 123, 0.3);
}

:deep(.hl-occurrence.active) {
  background: rgba(88, 166, 255, 0.35);
  outline: 1px solid #58a6ff;
  box-shadow: 0 0 6px rgba(88, 166, 255, 0.4);
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
