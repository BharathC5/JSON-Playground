<script setup>
import { ref, watch, nextTick } from 'vue'
import { useWorkbench } from '../composables/useWorkbench'
import { getType } from '../utils/jsonPath'

const { state } = useWorkbench()

const consoleOutput = ref([])
const consoleInput = ref('')
const inputRef = ref(null)
const outputRef = ref(null)

const suggestions = ref([])
const suggestionContext = ref(null)
const selectedSuggestion = ref(-1)

const ARRAY_METHODS = ['map', 'filter', 'forEach', 'reduce', 'find', 'some', 'every', 'length', 'includes']
const OBJECT_METHODS = ['hasOwnProperty', 'toString']

const parseExpressionContext = (codeBeforeCursor) => {
  const match = codeBeforeCursor.match(/(?:([A-Za-z0-9_$]+(?:\??\.[A-Za-z0-9_$]+|\[\d+\]|\["[^"]*"\]|\['[^']*'\])*))(\??\.)([A-Za-z0-9_$]*)$/)
  if (!match) return null

  return {
    fullExpression: match[1],
    operator: match[2],
    partialText: match[3],
    replaceLen: match[2].length + match[3].length,
  }
}

const getExpressionValue = (expr) => {
  try {
    const fn = new Function(state.rootVarName, `"use strict"; return (${expr});`)
    return { ok: true, val: fn(state.parsedData) }
  } catch (e) {
    return { ok: false }
  }
}

const refreshAutocomplete = () => {
  selectedSuggestion.value = -1
  if (!state.parsedData || !inputRef.value) {
    suggestions.value = []
    return
  }

  const cursorPos = inputRef.value.selectionStart
  const textBeforeCursor = consoleInput.value.slice(0, cursorPos)
  const ctx = parseExpressionContext(textBeforeCursor)

  if (!ctx) {
    suggestionContext.value = null
    suggestions.value = []
    return
  }

  const resolved = getExpressionValue(ctx.fullExpression)
  if (!resolved.ok || resolved.val === null || resolved.val === undefined) {
    suggestionContext.value = null
    suggestions.value = []
    return
  }

  const targetVal = resolved.val
  const candidates = []
  const t = getType(targetVal)

  if (t === 'object') {
    Object.keys(targetVal).forEach((k) => {
      if (k.toLowerCase().startsWith(ctx.partialText.toLowerCase())) {
        candidates.push({ name: k, type: 'property' })
      }
    })
    if (state.settings.showMethodsInAutocomplete) {
      OBJECT_METHODS.forEach((m) => {
        if (m.toLowerCase().startsWith(ctx.partialText.toLowerCase())) {
          candidates.push({ name: m, type: 'method' })
        }
      })
    }
  } else if (t === 'array') {
    if (state.settings.showMethodsInAutocomplete) {
      ARRAY_METHODS.forEach((m) => {
        if (m.toLowerCase().startsWith(ctx.partialText.toLowerCase())) {
          candidates.push({ name: m, type: m === 'length' ? 'property' : 'method' })
        }
      })
    }
    if (targetVal.length > 0 && typeof targetVal[0] === 'object' && targetVal[0] !== null) {
      Object.keys(targetVal[0]).forEach((k) => {
        if (k.toLowerCase().startsWith(ctx.partialText.toLowerCase())) {
          candidates.push({ name: `[0].${k}`, type: 'array-item-preview' })
        }
      })
    }
  }

  suggestionContext.value = ctx
  suggestions.value = candidates.slice(0, 20)
}

const hideSuggestions = () => {
  suggestions.value = []
  suggestionContext.value = null
  selectedSuggestion.value = -1
}

const applyCompletion = (completedText) => {
  if (!suggestionContext.value || !inputRef.value) return
  const cursorPos = inputRef.value.selectionStart
  const text = consoleInput.value
  const before = text.slice(0, cursorPos - suggestionContext.value.partialText.length)
  const after = text.slice(cursorPos)

  const isMethod = suggestions.value.find((c) => c.name === completedText && c.type === 'method')
  let insert = completedText
  if (isMethod && completedText !== 'length') {
    insert += '()'
  }

  consoleInput.value = before + insert + after
  
  nextTick(() => {
    const newPos = (before + insert).length - (isMethod && completedText !== 'length' ? 1 : 0)
    inputRef.value.setSelectionRange(newPos, newPos)
    hideSuggestions()
  })
}

const executeConsoleCode = (code) => {
  const logs = []
  const fakeConsole = {
    log: (...args) => logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
    error: (...args) => logs.push('[ERROR] ' + args.map(String).join(' ')),
    warn: (...args) => logs.push('[WARN] ' + args.map(String).join(' ')),
  }

  let resultVal
  let hasResult = false
  let error = null

  try {
    const fn = new Function(state.rootVarName, 'console', `"use strict"; return (${code});`)
    resultVal = fn(state.parsedData, fakeConsole)
    hasResult = true
  } catch (e1) {
    try {
      const fn2 = new Function(state.rootVarName, 'console', `"use strict"; ${code}`)
      resultVal = fn2(state.parsedData, fakeConsole)
      hasResult = false
    } catch (e2) {
      error = e2
    }
  }

  return { logs, resultVal, hasResult, error }
}

const appendConsoleEntry = (code) => {
  const { logs, resultVal, hasResult, error } = executeConsoleCode(code)
  
  const entry = {
    code,
    logs,
    error: error ? error.name + ': ' + error.message : null,
    result: (hasResult && resultVal !== undefined) ? (typeof resultVal === 'object' ? JSON.stringify(resultVal, null, 2) : String(resultVal)) : null
  }
  
  consoleOutput.value.push(entry)
  
  nextTick(() => {
    if (outputRef.value) {
      outputRef.value.scrollTop = outputRef.value.scrollHeight
    }
  })
}

let historyIndex = -1
let draftBeforeHistory = ''

const onKeyDown = (e) => {
  const isOpen = suggestions.value.length > 0

  if (e.key === 'Tab') {
    e.preventDefault()
    if (isOpen) {
      const picked = selectedSuggestion.value >= 0 ? suggestions.value[selectedSuggestion.value] : suggestions.value[0]
      applyCompletion(picked.name)
    } else {
      refreshAutocomplete()
      if (suggestions.value.length > 0) applyCompletion(suggestions.value[0].name)
    }
    return
  }

  if (isOpen) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      selectedSuggestion.value = (selectedSuggestion.value + 1) % suggestions.value.length
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      selectedSuggestion.value = (selectedSuggestion.value - 1 + suggestions.value.length) % suggestions.value.length
      return
    }
    if (e.key === 'Enter' && selectedSuggestion.value >= 0) {
      e.preventDefault()
      applyCompletion(suggestions.value[selectedSuggestion.value].name)
      return
    }
    if (e.key === 'Escape') {
      hideSuggestions()
      return
    }
  }

  if (e.key === 'Enter') {
    hideSuggestions()
    const code = consoleInput.value
    if (!code.trim()) return
    appendConsoleEntry(code)
    
    if (state.consoleHistory[state.consoleHistory.length - 1] !== code) {
      state.consoleHistory.push(code)
    }
    historyIndex = state.consoleHistory.length
    consoleInput.value = ''
  } else if (e.key === 'ArrowUp') {
    if (!state.consoleHistory.length) return
    e.preventDefault()
    if (historyIndex === state.consoleHistory.length) draftBeforeHistory = consoleInput.value
    historyIndex = Math.max(0, historyIndex - 1)
    consoleInput.value = state.consoleHistory[historyIndex]
  } else if (e.key === 'ArrowDown') {
    if (!state.consoleHistory.length) return
    e.preventDefault()
    historyIndex = Math.min(state.consoleHistory.length, historyIndex + 1)
    consoleInput.value = historyIndex === state.consoleHistory.length ? draftBeforeHistory : state.consoleHistory[historyIndex]
  }
}

const onInput = () => {
  refreshAutocomplete()
}

const clearConsole = () => {
  consoleOutput.value = []
}

// Watch for external JS path insertions
watch(() => state.consoleInputDraft, (newVal) => {
  if (newVal) {
    consoleInput.value = newVal
    if (inputRef.value) inputRef.value.focus()
    state.consoleInputDraft = ''
  }
})
</script>

<template>
  <section class="panel panel-console">
    <div class="panel-header">
      <span>JS EXECUTION CONSOLE</span>
      <div class="panel-header-actions">
        <button @click="clearConsole" class="btn-small">Clear</button>
      </div>
    </div>
    
    <div class="console-output" ref="outputRef">
      <div v-for="(entry, index) in consoleOutput" :key="index" class="console-entry">
        <div class="console-entry-input">{{ entry.code }}</div>
        <div v-for="(log, i) in entry.logs" :key="'log'+i" class="console-entry-output">{{ log }}</div>
        <div v-if="entry.error" class="console-entry-output is-error">{{ entry.error }}</div>
        <div v-else-if="entry.result" class="console-entry-output">{{ entry.result }}</div>
      </div>
    </div>

    <div v-if="suggestions.length" class="console-suggestions">
      <div
        v-for="(item, i) in suggestions"
        :key="i"
        class="console-suggestion-item"
        :class="{ 'is-selected': i === selectedSuggestion }"
        @mousedown.prevent="applyCompletion(item.name)"
      >
        <span>{{ item.name }}</span>
        <span class="item-type">{{ item.type }}</span>
      </div>
    </div>

    <div class="console-input-row">
      <span class="console-prompt">&gt;</span>
      <input
        ref="inputRef"
        v-model="consoleInput"
        @input="onInput"
        @keydown="onKeyDown"
        @blur="hideSuggestions"
        type="text"
        class="console-input"
        placeholder="Type JS expression or iterate (e.g., data.member.forEach(...))"
        autocomplete="off"
        spellcheck="false"
      />
    </div>
  </section>
</template>

<style scoped>
.panel-console {
  display: flex;
  flex-direction: column;
  min-height: 80px;
  flex-shrink: 0;
  background: var(--bg);
  position: relative;
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

.console-output {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 12px 16px;
  font-family: var(--font-mono);
  font-size: 12px;
  min-height: 0;
}

.console-entry {
  margin-bottom: 12px;
}
.console-entry-input {
  color: var(--accent);
}
.console-entry-input::before {
  content: "> ";
  color: var(--text-faint);
}
.console-entry-output {
  white-space: pre-wrap;
  word-break: break-word;
  margin-top: 4px;
  color: var(--text);
}
.console-entry-output.is-error {
  color: var(--red);
}

.console-suggestions {
  position: absolute;
  left: 24px;
  right: 24px;
  bottom: 50px;
  background: var(--bg-panel-alt);
  border: 1px solid var(--border-focus);
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 30;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.6);
  font-family: var(--font-mono);
  font-size: 12px;
}

.console-suggestion-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 12px;
  cursor: pointer;
  color: var(--text);
  border-bottom: 1px solid rgba(255,255,255,0.02);
}

.console-suggestion-item .item-type {
  font-size: 10px;
  color: var(--text-faint);
}

.console-suggestion-item.is-selected,
.console-suggestion-item:hover {
  background: var(--accent-dim);
  color: #fff;
}

.console-suggestion-item.is-selected .item-type,
.console-suggestion-item:hover .item-type {
  color: #d1d5db;
}

.console-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  background: var(--bg-panel);
}

.console-prompt {
  color: var(--accent);
  font-family: var(--font-mono);
  font-weight: bold;
}
.console-input {
  flex: 1 1 auto;
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-family: var(--font-mono);
  font-size: 13px;
}
</style>
