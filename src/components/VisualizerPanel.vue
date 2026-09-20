<script setup>
import { ref, computed } from 'vue'
import { useWorkbench } from '../composables/useWorkbench'
import { getType, pathToJs, pathToBreadcrumb, shortPreview } from '../utils/jsonPath'
import { copyToClipboard } from '../composables/useToast'
import TreeNode from './TreeNode.vue'
import Flowchart from './Flowchart.vue'
import ConsolePanel from './ConsolePanel.vue'
import FieldMapper from './FieldMapper.vue'

const { state } = useWorkbench()

const searchQuery = ref('')
const searchResults = ref([])
const showSearchResults = ref(false)

const breadcrumbPathArr = ref([])
const breadcrumbJs = ref('')
const showBreadcrumb = ref(false)
const breadcrumbCollapsed = ref(false)

const setView = (view) => {
  state.currentView = view
}

// ─── Search ───────────────────────────────────────────────────────────────────
const onSearchInput = () => {
  const q = searchQuery.value.trim()
  if (!state.parsedData || !q) {
    showSearchResults.value = false
    searchResults.value = []
    return
  }
  const results = []
  const lowerQ = q.toLowerCase()
  function walk(value, pathArr, key) {
    if (results.length >= 100) return
    if (key !== null) {
      const keyMatches = typeof key === 'string' && key.toLowerCase().includes(lowerQ)
      const t = getType(value)
      let valMatches = false
      if (t === 'string' || t === 'number' || t === 'boolean') {
        valMatches = String(value).toLowerCase().includes(lowerQ)
      }
      if (keyMatches || valMatches) {
        results.push({ path: [...pathArr], value, js: pathToJs(pathArr, false) })
      }
    }
    const t = getType(value)
    if (t === 'array') value.forEach((v, i) => walk(v, [...pathArr, i], i))
    else if (t === 'object' && value !== null) Object.keys(value).forEach((k) => walk(value[k], [...pathArr, k], k))
  }
  walk(state.parsedData, [], null)
  searchResults.value = results
  showSearchResults.value = true
}

const onInspect = ({ pathArr, js }) => {
  breadcrumbPathArr.value = pathArr
  breadcrumbJs.value = js
  showBreadcrumb.value = true
  breadcrumbCollapsed.value = false
  state.consoleInputDraft = js
}

const onResultClick = (result) => {
  onInspect({ pathArr: result.path, js: result.js })
  showSearchResults.value = false
}

const getBreadcrumbText = computed(() => pathToBreadcrumb(breadcrumbPathArr.value))

const onBreadcrumbCopy = () => copyToClipboard(breadcrumbJs.value)

const closeSearch = () => {
  setTimeout(() => { showSearchResults.value = false }, 200)
}
</script>

<template>
  <section class="panel panel-explorer" @click="closeSearch">
    <!-- ─── Header ─────────────────────────────────────────────── -->
    <div v-if="state.settings.layoutMode !== 'tab'" class="panel-header">
      <span>EXPLORER &amp; VISUALIZER</span>
      <div class="view-toggle">
        <button class="view-toggle-btn" :class="{ active: state.currentView === 'tree' }" @click="setView('tree')">Tree</button>
        <button class="view-toggle-btn" :class="{ active: state.currentView === 'flow' }" @click="setView('flow')">Flowchart</button>
        <button class="view-toggle-btn" :class="{ active: state.currentView === 'console' }" @click="setView('console')">Console</button>
        <button class="view-toggle-btn" :class="{ active: state.currentView === 'mapper' }" @click="setView('mapper')">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Mapper
        </button>
      </div>
    </div>

    <!-- ─── Search ─────────────────────────────────────────────── -->
    <div class="explorer-search">
      <input
        v-model="searchQuery"
        @input="onSearchInput"
        @focus="onSearchInput"
        type="text"
        placeholder="Search keys, values, or deep properties (e.g. member, id)..."
      />
      <div v-if="showSearchResults" class="search-results">
        <div class="search-results-header">
          {{ searchResults.length === 0 ? 'No matches' : `${searchResults.length} result(s)` }}
        </div>
        <div
          v-for="(m, i) in searchResults"
          :key="i"
          class="search-result-row"
          @click="onResultClick(m)"
        >
          <span class="search-result-path">{{ m.js }}</span>
          <span class="search-result-value">{{ shortPreview(m.value) }}</span>
        </div>
      </div>
    </div>

    <!-- ─── Visualizer ─────────────────────────────────────────── -->
    <div class="visualizer-container">
      <div v-if="!state.parsedData" class="tree-empty">
        {{ state.jsonError ? 'Fix the JSON error on the left to activate visualizer.' : 'Paste valid JSON on the left to explore properties.' }}
      </div>
      <template v-else>
        <div v-show="state.currentView === 'tree'" class="tree-container">
          <TreeNode
            :nodeKey="state.rootVarName"
            :value="state.parsedData"
            :pathArr="[]"
            :isRoot="true"
            @inspect="onInspect"
          />
        </div>
        <div v-show="state.currentView === 'flow'" class="flow-container-wrap">
          <Flowchart @inspect="onInspect" />
        </div>
        <div v-show="state.currentView === 'console'" class="console-container">
          <ConsolePanel />
        </div>
        <div v-show="state.currentView === 'mapper'" class="mapper-container">
          <FieldMapper />
        </div>
      </template>
    </div>

    <!-- ─── Inspected Target ───────────────────────────────────── -->
    <template v-if="showBreadcrumb && state.parsedData">
      <!-- Toggle bar — always visible when something is inspected -->
      <div class="breadcrumb-toggle-bar" @click="breadcrumbCollapsed = !breadcrumbCollapsed">
        <div class="btb-left">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span class="btb-label">INSPECTED TARGET</span>
          <code class="btb-preview">{{ breadcrumbJs }}</code>
        </div>
        <div class="btb-right">
          <button class="btb-btn" @click.stop="onBreadcrumbCopy" title="Copy JS path">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
          <button class="btb-btn" @click.stop="showBreadcrumb = false" title="Dismiss">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <!-- Chevron -->
          <svg class="btb-chevron" :class="{ flipped: !breadcrumbCollapsed }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </div>
      </div>

      <!-- Expandable body -->
      <transition name="slide-down">
        <div v-if="!breadcrumbCollapsed" class="breadcrumb-body">
          <div class="breadcrumb-path">{{ getBreadcrumbText }}</div>
          <code class="breadcrumb-js">{{ breadcrumbJs }}</code>
        </div>
      </transition>
    </template>
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

.view-toggle {
  display: flex;
  gap: 4px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px;
}

.view-toggle-btn {
  background: transparent;
  border: none;
  color: var(--text-dim);
  font-size: 11px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: 0.2s;
}

.view-toggle-btn.active {
  background: var(--accent-dim);
  color: #fff;
}

/* ─── Search ──────────────────────────────────────────────────────────────── */
.explorer-search {
  position: relative;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}

.explorer-search input {
  width: 100%;
  background: var(--bg-panel-alt);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 8px 12px;
  font-size: 12px;
  font-family: var(--font-mono);
  outline: none;
  transition: border-color 0.2s;
}

.explorer-search input:focus { border-color: var(--accent); }

.search-results {
  position: absolute;
  left: 16px;
  right: 16px;
  top: 52px;
  background: var(--bg-panel-alt);
  border: 1px solid var(--border);
  border-radius: 8px;
  max-height: 250px;
  overflow-y: auto;
  z-index: 25;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
}

.search-results-header {
  padding: 8px 12px;
  font-size: 11px;
  color: var(--text-faint);
  border-bottom: 1px solid var(--border);
  background: rgba(255,255,255,0.02);
}

.search-result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  font-family: var(--font-mono);
  font-size: 11px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}

.search-result-row:hover { background: #353b45; }
.search-result-path { color: var(--accent); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.search-result-value { color: var(--text-faint); margin-left: 12px; }

/* ─── Visualizer ──────────────────────────────────────────────────────────── */
.visualizer-container {
  flex: 1 1 auto;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.tree-container {
  flex: 1 1 auto;
  overflow: auto;
  padding: 16px;
}

.flow-container-wrap {
  flex: 1 1 auto;
  overflow: hidden;
}

.console-container {
  flex: 1 1 auto;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.mapper-container {
  flex: 1 1 auto;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.tree-empty {
  color: var(--text-faint);
  padding: 24px;
  font-size: 13px;
  text-align: center;
}

/* ─── Inspected Target ────────────────────────────────────────────────────── */

/* The always-visible toggle bar */
.breadcrumb-toggle-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  height: 36px;
  background: var(--bg-panel);
  border-top: 1px solid var(--border);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
  user-select: none;
}

.breadcrumb-toggle-bar:hover { background: var(--bg-panel-alt); }

.btb-left {
  display: flex;
  align-items: center;
  gap: 7px;
  overflow: hidden;
  flex: 1;
  min-width: 0;
}

.btb-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.8px;
  color: var(--text-faint);
  text-transform: uppercase;
  white-space: nowrap;
  flex-shrink: 0;
}

.btb-preview {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--accent);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.btb-right {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  margin-left: 8px;
}

.btb-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text-faint);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.btb-btn:hover { background: rgba(255,255,255,0.07); color: #fff; }

.btb-chevron {
  color: var(--text-faint);
  transition: transform 0.2s ease;
  margin-left: 2px;
}

.btb-chevron.flipped { transform: rotate(180deg); }

/* The collapsible body */
.breadcrumb-body {
  padding: 12px 16px;
  background: var(--bg-panel);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 160px;
  overflow-y: auto;
}

.breadcrumb-path {
  font-family: var(--font-mono);
  color: var(--text-dim);
  font-size: 11px;
  white-space: pre-wrap;
  line-height: 1.5;
}

.breadcrumb-js {
  display: block;
  font-family: var(--font-mono);
  color: var(--accent);
  background: var(--bg);
  padding: 6px 10px;
  border-radius: 5px;
  font-size: 11px;
  overflow-x: auto;
  white-space: nowrap;
  border: 1px solid var(--border);
  user-select: text;
  cursor: text;
}

/* Slide animation */
.slide-down-enter-active { animation: slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-down-leave-active { animation: slideDown 0.15s ease reverse; }

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
