<script setup>
import { ref, computed, watch } from 'vue'
import { useWorkbench } from '../composables/useWorkbench'
import { copyToClipboard, showToast } from '../composables/useToast'

const { state } = useWorkbench()

// ─── Config ───────────────────────────────────────────────────────────────────
const outputVar    = ref('mappedData')
const outputFormat = ref('const_obj')
const searchFilter = ref('')

const FORMAT_OPTIONS = [
  { value: 'const_obj',   label: 'const {}',     desc: 'Const object literal' },
  { value: 'let_obj',     label: 'let {}',        desc: 'Let object literal' },
  { value: 'destructure', label: 'Destructure',   desc: 'Const destructuring' },
  { value: 'ts_iface',    label: 'TS Interface',  desc: 'TypeScript interface + const' },
  { value: 'fn_mapper',   label: 'Mapper fn()',   desc: 'Named mapper function' },
  { value: 'fn_arrow',    label: 'Arrow fn =>',   desc: 'Arrow mapper function' },
]

// ─── Mappings: [ { id, outKey, sourcePath, tsType } ] ─────────────────────────
const mappings = ref([])

// Clear mappings when JSON changes
watch(() => state.parsedData, () => { mappings.value = [] })

let uid = 0
const addMapping = (field) => {
  // Toggle: if already mapped, remove it
  const idx = mappings.value.findIndex(m => m.sourcePath === field.path)
  if (idx !== -1) { mappings.value.splice(idx, 1); return }
  mappings.value.push({
    id: ++uid,
    outKey: sanitizeKey(field.key),
    sourcePath: field.path,
    tsType: field.tsType,
  })
}

const removeMapping = (id) => {
  mappings.value = mappings.value.filter(m => m.id !== id)
}

const clearMappings = () => { mappings.value = [] }

const isMapped = (path) => mappings.value.some(m => m.sourcePath === path)

function sanitizeKey(k) {
  // strip array indices like "0" → keep as-is if valid identifier
  return /^[a-zA-Z_$]/.test(k) ? k : `_${k}`
}

// ─── Field extraction ─────────────────────────────────────────────────────────
function inferType(v) {
  if (v === null)        return 'null'
  if (Array.isArray(v)) return `Array[${v.length}]`
  return typeof v
}
function inferTsType(v) {
  if (v === null)               return 'null'
  if (Array.isArray(v))         return 'any[]'
  if (typeof v === 'string')    return 'string'
  if (typeof v === 'number')    return 'number'
  if (typeof v === 'boolean')   return 'boolean'
  if (typeof v === 'object')    return 'Record<string, any>'
  return 'any'
}
function shortVal(v) {
  if (v === null) return 'null'
  if (typeof v === 'string') return v.length > 30 ? `"${v.slice(0, 30)}…"` : `"${v}"`
  if (typeof v === 'object') return Array.isArray(v) ? `[${v.length} items]` : `{${Object.keys(v).length} keys}`
  return String(v)
}

const allFields = computed(() => {
  if (!state.parsedData) return []
  const fields = []
  const MAX = 5
  function walk(obj, path, depth) {
    if (depth > MAX || typeof obj !== 'object' || obj === null) return
    const keys = Array.isArray(obj)
      ? [...Array(Math.min(obj.length, 20)).keys()]
      : Object.keys(obj)
    for (const key of keys) {
      const fullPath = path ? `${path}.${key}` : String(key)
      const value = obj[key]
      fields.push({ path: fullPath, key: String(key), depth, type: inferType(value), tsType: inferTsType(value), preview: shortVal(value), value })
      if (typeof value === 'object' && value !== null) walk(value, fullPath, depth + 1)
    }
  }
  walk(state.parsedData, '', 0)
  return fields
})

const filteredFields = computed(() => {
  const q = searchFilter.value.trim().toLowerCase()
  if (!q) return allFields.value
  return allFields.value.filter(f => f.path.toLowerCase().includes(q) || f.key.toLowerCase().includes(q))
})

// ─── Bulk actions ─────────────────────────────────────────────────────────────
const addTopLevel = () => {
  allFields.value
    .filter(f => f.depth === 0 && !isMapped(f.path))
    .forEach(f => addMapping(f))
}

const addFiltered = () => {
  filteredFields.value
    .filter(f => !isMapped(f.path))
    .forEach(f => addMapping(f))
}

// ─── Code generation ──────────────────────────────────────────────────────────
const root = computed(() => state.rootVarName || 'data')

const acc = (path) => {
  const oc = state.settings?.optionalChaining
  return oc
    ? root.value + path.split('.').map(p => `?.${p}`).join('')
    : `${root.value}.${path}`
}

const generatedCode = computed(() => {
  if (mappings.value.length === 0)
    return `// ① Click fields on the left to add them to the mapping\n// ② Edit the output key name on each row\n// ③ Choose a format and hit Copy Code`

  const out = (outputVar.value || 'mappedData').trim()
  const fmt = outputFormat.value
  const Pascal = out.charAt(0).toUpperCase() + out.slice(1)
  const pairs = mappings.value.map(m => `  ${m.outKey}: ${acc(m.sourcePath)},`).join('\n')

  if (fmt === 'const_obj') return `const ${out} = {\n${pairs}\n};`
  if (fmt === 'let_obj')   return `let ${out} = {\n${pairs}\n};`

  if (fmt === 'destructure') {
    const keys = [...new Set(mappings.value.map(m => m.outKey))]
    return `const { ${keys.join(', ')} } = ${root.value};`
  }

  if (fmt === 'ts_iface') {
    const iLines = mappings.value.map(m => `  ${m.outKey}: ${m.tsType};`).join('\n')
    return `interface ${Pascal} {\n${iLines}\n}\n\nconst ${out}: ${Pascal} = {\n${pairs}\n};`
  }

  if (fmt === 'fn_mapper') {
    const fnPairs = mappings.value.map(m => `    ${m.outKey}: ${root.value}.${m.sourcePath},`).join('\n')
    return `function map${Pascal}(${root.value}) {\n  return {\n${fnPairs}\n  };\n}`
  }

  if (fmt === 'fn_arrow') {
    const fnPairs = mappings.value.map(m => `  ${m.outKey}: ${root.value}.${m.sourcePath},`).join('\n')
    return `const map${Pascal} = (${root.value}) => ({\n${fnPairs}\n});`
  }
  return ''
})

// ─── Syntax-highlight the generated code ─────────────────────────────────────
const highlightedCode = computed(() => {
  const code = generatedCode.value
  if (!code) return ''
  return code
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // keywords first (before any spans exist in the string)
    .replace(/\b(const|let|function|return|interface)\b/g, '<span class="kw">$1</span>')
    // line comments
    .replace(/(\/\/.*)/g, '<span class="cm">$1</span>')
    // PascalCase type names
    .replace(/\b([A-Z][a-zA-Z]+)\b/g, '<span class="tp">$1</span>')
    // root var name
    .replace(new RegExp(`\\b(${root.value})\\b`, 'g'), '<span class="rv">$1</span>')
})

const doCopy = () => {
  if (mappings.value.length === 0) return showToast('Add at least one field to the mapping')
  copyToClipboard(generatedCode.value)
}

// ─── Type badge color ─────────────────────────────────────────────────────────
const typeClass = (t) => {
  if (t === 'string')  return 'tb-str'
  if (t === 'number')  return 'tb-num'
  if (t === 'boolean') return 'tb-bool'
  if (t === 'null')    return 'tb-null'
  if (t.startsWith('Array')) return 'tb-arr'
  if (t === 'object')  return 'tb-obj'
  return 'tb-other'
}
</script>

<template>
  <div class="mapper-root" v-if="state.parsedData">

    <!-- ═══ LEFT — Field Browser ═══════════════════════════════════════════════ -->
    <div class="mapper-left">
      <div class="ml-header">
        <span class="ml-title">JSON Fields</span>
        <span class="ml-hint">Click to map →</span>
      </div>

      <div class="ml-search">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="searchFilter" placeholder="Filter fields…" class="ml-search-input" />
        <button v-if="searchFilter" @click="searchFilter = ''" class="ml-clear-btn">✕</button>
      </div>

      <div class="ml-toolbar">
        <button class="tb-btn" @click="addTopLevel" title="Add all top-level fields">Top Level</button>
        <button class="tb-btn" @click="addFiltered" title="Add all visible fields">Add Visible</button>
        <button class="tb-btn tb-btn-danger" @click="clearMappings" title="Clear all mappings">Clear All</button>
      </div>

      <div class="ml-list">
        <div
          v-for="f in filteredFields"
          :key="f.path"
          class="field-row"
          :class="{ mapped: isMapped(f.path) }"
          :style="{ paddingLeft: (10 + f.depth * 14) + 'px' }"
          @click="addMapping(f)"
          :title="f.path"
        >
          <span class="field-mapped-dot" v-if="isMapped(f.path)">✓</span>
          <span class="field-add-dot" v-else>+</span>
          <span class="field-key">{{ f.key }}</span>
          <span class="field-type" :class="typeClass(f.type)">{{ f.type }}</span>
          <span class="field-preview">{{ f.preview }}</span>
        </div>

        <div v-if="filteredFields.length === 0" class="ml-empty">No fields match</div>
      </div>
    </div>

    <!-- ═══ DIVIDER ════════════════════════════════════════════════════════════ -->
    <div class="mapper-divider"></div>

    <!-- ═══ RIGHT — Mapping Editor + Code Preview ══════════════════════════════ -->
    <div class="mapper-right">

      <!-- Config bar -->
      <div class="mr-config">
        <div class="cfg-row">
          <div class="cfg-group">
            <label class="cfg-label">Output var</label>
            <input v-model="outputVar" class="cfg-input" placeholder="mappedData" spellcheck="false" />
          </div>
          <div class="cfg-group">
            <label class="cfg-label">Format</label>
            <div class="fmt-pills">
              <button
                v-for="f in FORMAT_OPTIONS" :key="f.value"
                class="fmt-pill" :class="{ active: outputFormat === f.value }"
                :title="f.desc" @click="outputFormat = f.value"
              >{{ f.label }}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Mapping table ── -->
      <div class="mapping-table-wrap">
        <div class="mt-header">
          <span class="mt-col-out">Output key</span>
          <span class="mt-arrow"></span>
          <span class="mt-col-src">Source path  <em>(from {{ root }})</em></span>
          <span class="mt-col-rm"></span>
        </div>

        <div v-if="mappings.length === 0" class="mt-empty">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" stroke-width="1.5"><path d="M12 5v14M5 12h14"/></svg>
          Click fields on the left to add them here
        </div>

        <div
          v-for="m in mappings"
          :key="m.id"
          class="mt-row"
        >
          <!-- Editable output key -->
          <input
            v-model="m.outKey"
            class="mt-key-input"
            spellcheck="false"
            placeholder="keyName"
          />

          <!-- Arrow -->
          <span class="mt-arrow-icon">←</span>

          <!-- Source path (read-only label + full path tooltip) -->
          <span class="mt-source" :title="acc(m.sourcePath)">
            <span class="mt-src-root">{{ root }}</span>.<span class="mt-src-path">{{ m.sourcePath }}</span>
          </span>

          <!-- Remove -->
          <button class="mt-rm-btn" @click="removeMapping(m.id)" title="Remove this mapping">✕</button>
        </div>
      </div>

      <!-- ── Code preview ── -->
      <div class="mr-preview">
        <div class="preview-header">
          <span class="preview-title">Generated Code</span>
          <span class="preview-count" v-if="mappings.length">{{ mappings.length }} field{{ mappings.length === 1 ? '' : 's' }}</span>
        </div>
        <pre class="code-preview" v-html="highlightedCode"></pre>
      </div>

      <!-- ── Footer ── -->
      <div class="mr-footer">
        <button class="copy-btn" :disabled="mappings.length === 0" @click="doCopy">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy Code
        </button>
        <span class="mr-hint">Paste directly into VS Code</span>
      </div>
    </div>
  </div>

  <!-- Empty state -->
  <div v-else class="mapper-empty">
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
    <p>Paste valid JSON on the left to use the Field Mapper</p>
  </div>
</template>

<style scoped>
/* ─── Root ─────────────────────────────────────────────────────────────────── */
.mapper-root {
  display: flex;
  flex-direction: row;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.mapper-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  height: 100%;
  color: var(--text-faint);
  font-size: 13px;
}

/* ─── Left Panel ───────────────────────────────────────────────────────────── */
.mapper-left {
  width: 38%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid var(--border);
  background: var(--bg);
}

.ml-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 13px 7px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.ml-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.7px;
  text-transform: uppercase;
  color: var(--text-dim);
}
.ml-hint {
  font-size: 10px;
  color: var(--text-faint);
}

.ml-search {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 11px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  color: var(--text-faint);
}
.ml-search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text);
}
.ml-search-input::placeholder { color: var(--text-faint); }
.ml-clear-btn {
  background: none;
  border: none;
  color: var(--text-faint);
  cursor: pointer;
  font-size: 10px;
  padding: 1px 4px;
}
.ml-clear-btn:hover { color: var(--red); }

.ml-toolbar {
  display: flex;
  gap: 5px;
  padding: 6px 11px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.tb-btn {
  background: var(--bg-panel-alt);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-dim);
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  cursor: pointer;
  transition: all 0.15s;
}
.tb-btn:hover { border-color: var(--accent); color: var(--accent); }
.tb-btn-danger:hover { border-color: var(--red); color: var(--red); }

.ml-list {
  flex: 1 1 auto;
  overflow-y: auto;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px 5px 10px;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 11px;
  border-bottom: 1px solid rgba(255,255,255,0.03);
  transition: background 0.1s;
  user-select: none;
}
.field-row:hover { background: rgba(255,255,255,0.05); }
.field-row.mapped {
  background: rgba(152, 195, 121, 0.06);
}
.field-row.mapped:hover {
  background: rgba(224, 108, 117, 0.08);
}

.field-mapped-dot {
  font-size: 10px;
  color: #98c379;
  font-weight: 700;
  flex-shrink: 0;
  width: 12px;
}
.field-add-dot {
  font-size: 13px;
  color: var(--text-faint);
  font-weight: 300;
  flex-shrink: 0;
  width: 12px;
}

.field-key {
  color: #e06c75;
  font-weight: 600;
  flex-shrink: 0;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.field-type {
  font-size: 9px;
  font-weight: 600;
  border-radius: 3px;
  padding: 1px 4px;
  flex-shrink: 0;
  letter-spacing: 0.3px;
}
.tb-str  { background: rgba(152,195,121,0.12); color: #98c379; }
.tb-num  { background: rgba(209,154,102,0.12); color: #d19a66; }
.tb-bool { background: rgba(86,182,194,0.12);  color: #56b6c2; }
.tb-null { background: rgba(255,255,255,0.05); color: var(--text-faint); }
.tb-arr  { background: rgba(198,120,221,0.12); color: #c678dd; }
.tb-obj  { background: rgba(88,166,255,0.12);  color: var(--accent); }
.tb-other{ background: rgba(255,255,255,0.05); color: var(--text-faint); }

.field-preview {
  color: var(--text-faint);
  font-size: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}
.ml-empty {
  padding: 20px;
  text-align: center;
  color: var(--text-faint);
  font-size: 12px;
}

/* ─── Divider ──────────────────────────────────────────────────────────────── */
.mapper-divider {
  width: 5px;
  flex-shrink: 0;
  background: var(--bg-panel);
  border-left: 1px solid var(--border);
  border-right: 1px solid var(--border);
}

/* ─── Right Panel ──────────────────────────────────────────────────────────── */
.mapper-right {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

/* Config */
.mr-config {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  background: var(--bg-panel);
}
.cfg-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: center;
}
.cfg-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cfg-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-dim);
  white-space: nowrap;
}
.cfg-input {
  background: var(--bg-panel-alt);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 4px 9px;
  outline: none;
  transition: border-color 0.15s;
  width: 140px;
}
.cfg-input:focus { border-color: var(--accent); }
.fmt-pills { display: flex; flex-wrap: wrap; gap: 4px; }
.fmt-pill {
  background: var(--bg-panel-alt);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-dim);
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 3px 8px;
  cursor: pointer;
  transition: all 0.15s;
}
.fmt-pill:hover { border-color: var(--accent); color: var(--accent); }
.fmt-pill.active { background: rgba(88,166,255,0.12); border-color: var(--accent); color: #fff; font-weight: 600; }

/* ── Mapping Table ─────────────────────────────────────────────────────────── */
.mapping-table-wrap {
  flex-shrink: 0;
  max-height: 42%;
  overflow-y: auto;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}

.mt-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 1;
}
.mt-col-out {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-faint);
  width: 130px;
  flex-shrink: 0;
}
.mt-col-src {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-faint);
  flex: 1;
}
.mt-col-src em { font-style: normal; color: #e06c75; font-family: var(--font-mono); text-transform: none; letter-spacing: 0; }
.mt-col-rm { width: 24px; flex-shrink: 0; }

.mt-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  color: var(--text-faint);
  font-size: 12px;
}

.mt-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.1s;
}
.mt-row:hover { background: rgba(255,255,255,0.03); }

/* Editable output key */
.mt-key-input {
  width: 130px;
  flex-shrink: 0;
  background: rgba(88, 166, 255, 0.07);
  border: 1px solid rgba(88, 166, 255, 0.25);
  border-radius: 5px;
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  padding: 3px 8px;
  outline: none;
  transition: border-color 0.15s;
}
.mt-key-input:focus { border-color: var(--accent); background: rgba(88,166,255,0.12); }

.mt-arrow-icon {
  color: var(--text-faint);
  font-size: 12px;
  flex-shrink: 0;
}

/* Source path */
.mt-source {
  flex: 1;
  font-family: var(--font-mono);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.mt-src-root { color: #e06c75; font-weight: 600; }
.mt-src-path { color: var(--text-dim); }

.mt-rm-btn {
  background: none;
  border: none;
  color: var(--text-faint);
  cursor: pointer;
  font-size: 11px;
  padding: 2px 5px;
  border-radius: 3px;
  transition: all 0.15s;
  flex-shrink: 0;
}
.mt-rm-btn:hover { color: var(--red); background: rgba(255,123,114,0.1); }

/* ─── Code Preview ─────────────────────────────────────────────────────────── */
.mr-preview {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 14px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  background: var(--bg-panel);
}
.preview-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.7px;
  text-transform: uppercase;
  color: var(--text-faint);
}
.preview-count {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--accent);
}
.code-preview {
  flex: 1 1 auto;
  margin: 0;
  padding: 14px 16px;
  overflow: auto;
  font-family: var(--font-mono);
  font-size: 12.5px;
  line-height: 1.7;
  color: #abb2bf;
  white-space: pre;
  background: var(--bg);
}
:deep(.kw) { color: #c678dd; font-weight: 600; }
:deep(.str) { color: #98c379; }
:deep(.cm) { color: #5c6370; font-style: italic; }
:deep(.tp) { color: #e5c07b; }
:deep(.rv) { color: #e06c75; }

/* ─── Footer ───────────────────────────────────────────────────────────────── */
.mr-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-top: 1px solid var(--border);
  background: var(--bg-panel);
  flex-shrink: 0;
}
.copy-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  background: var(--accent-dim);
  border: 1px solid var(--accent);
  border-radius: 7px;
  color: #fff;
  font-family: var(--font-ui);
  font-size: 13px;
  font-weight: 600;
  padding: 7px 16px;
  cursor: pointer;
  transition: all 0.15s;
}
.copy-btn:hover:not(:disabled) { background: var(--accent); }
.copy-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.mr-hint {
  font-size: 11px;
  color: var(--text-faint);
}
</style>
