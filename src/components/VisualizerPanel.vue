<script setup>
import { ref, computed } from 'vue'
import { useWorkbench } from '../composables/useWorkbench'
import { getType, pathToJs, pathToBreadcrumb, shortPreview } from '../utils/jsonPath'
import { copyToClipboard } from '../composables/useToast'
import TreeNode from './TreeNode.vue'
import Flowchart from './Flowchart.vue'
import ConsolePanel from './ConsolePanel.vue'

const { state } = useWorkbench()

const searchQuery = ref('')
const searchResults = ref([])
const showSearchResults = ref(false)

const breadcrumbPathArr = ref([])
const breadcrumbJs = ref('')
const showBreadcrumb = ref(false)

const setView = (view) => {
  state.currentView = view
}

const breadcrumbHeight = ref(140)
let isDraggingBreadcrumb = false

const startDragBreadcrumb = (e) => {
  e.preventDefault()
  isDraggingBreadcrumb = true
  document.body.style.cursor = 'row-resize'
  window.addEventListener('mousemove', onDragBreadcrumb)
  window.addEventListener('mouseup', stopDragBreadcrumb)
}

const onDragBreadcrumb = (e) => {
  if (isDraggingBreadcrumb) {
    const newHeight = Math.max(80, Math.min(window.innerHeight - e.clientY - 250, 400))
    breadcrumbHeight.value = newHeight
  }
}

const stopDragBreadcrumb = () => {
  isDraggingBreadcrumb = false
  document.body.style.cursor = ''
  window.removeEventListener('mousemove', onDragBreadcrumb)
  window.removeEventListener('mouseup', stopDragBreadcrumb)
}

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
    if (t === 'array') {
      value.forEach((v, i) => walk(v, [...pathArr, i], i))
    } else if (t === 'object' && value !== null) {
      Object.keys(value).forEach((k) => walk(value[k], [...pathArr, k], k))
    }
  }

  walk(state.parsedData, [], null)
  searchResults.value = results
  showSearchResults.value = true
}

const onInspect = ({ pathArr, js }) => {
  breadcrumbPathArr.value = pathArr
  breadcrumbJs.value = js
  showBreadcrumb.value = true
  
  // Update console input value globally if needed
  // For now, we just update the breadcrumb
  // We can use an event bus or simple global state for console input
  state.consoleInputDraft = js
}

const onResultClick = (result) => {
  onInspect({ pathArr: result.path, js: result.js })
  showSearchResults.value = false
}

const getBreadcrumbText = computed(() => {
  return pathToBreadcrumb(breadcrumbPathArr.value)
})

const onBreadcrumbCopy = () => {
  copyToClipboard(breadcrumbJs.value)
}

const closeSearch = () => {
  setTimeout(() => {
    showSearchResults.value = false
  }, 200)
}
</script>

<template>
  <section class="panel panel-explorer" @click="closeSearch">
    <div class="panel-header">
      <span>EXPLORER &amp; VISUALIZER</span>
      <div class="view-toggle">
        <button
          class="view-toggle-btn"
          :class="{ active: state.currentView === 'tree' }"
          @click="setView('tree')"
        >
          Tree
        </button>
        <button
          class="view-toggle-btn"
          :class="{ active: state.currentView === 'flow' }"
          @click="setView('flow')"
        >
          Flowchart
        </button>
        <button
          class="view-toggle-btn"
          :class="{ active: state.currentView === 'console' }"
          @click="setView('console')"
        >
          Console
        </button>
      </div>
    </div>
    
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
        <div v-show="state.currentView === 'console'" style="display: flex; flex-direction: column; flex: 1; height: 100%;">
          <ConsolePanel style="flex: 1;" />
        </div>
      </template>
    </div>

    <div
      v-if="showBreadcrumb && state.parsedData"
      class="gutter gutter-horizontal"
      :class="{ 'is-dragging': isDraggingBreadcrumb }"
      @mousedown="startDragBreadcrumb"
      title="Drag to resize inspected target"
    ></div>

    <div v-if="showBreadcrumb && state.parsedData" class="breadcrumb" :style="{ height: `${breadcrumbHeight}px`, maxHeight: 'none' }">
      <div class="breadcrumb-header">
        <span class="breadcrumb-label">INSPECTED TARGET:</span>
        <button @click="onBreadcrumbCopy" class="btn-small">Copy Path</button>
      </div>
      <div class="breadcrumb-path">{{ getBreadcrumbText }}</div>
      <div class="breadcrumb-js-row">
        <code>{{ breadcrumbJs }}</code>
      </div>
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

.explorer-search input:focus {
  border-color: var(--accent);
}

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

.search-result-row:hover {
  background: #353b45;
}
.search-result-path {
  color: var(--accent);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.search-result-value {
  color: var(--text-faint);
  margin-left: 12px;
}

.visualizer-container {
  flex: 1 1 auto;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tree-container, .flow-container-wrap {
  flex: 1 1 auto;
  overflow: auto;
}

.tree-container {
  padding: 16px;
}

.flow-container-wrap {
  /* Background moved to Flowchart.vue viewport */
}

.tree-empty {
  color: var(--text-faint);
  padding: 24px;
  font-size: 13px;
  text-align: center;
}

.breadcrumb {
  padding: 12px 16px;
  background: var(--bg-panel);
  flex-shrink: 0;
  overflow-y: auto;
}

.gutter {
  background: var(--bg-panel);
  z-index: 10;
  position: relative;
  transition: background-color 0.15s ease;
}

.gutter:hover,
.gutter.is-dragging {
  background: var(--accent);
}

.gutter-horizontal {
  height: var(--gutter-size);
  cursor: row-resize;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.breadcrumb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.breadcrumb-label {
  color: var(--text-faint);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.breadcrumb-path {
  font-family: var(--font-mono);
  color: var(--text-dim);
  font-size: 11px;
  white-space: pre;
  line-height: 1.4;
}

.breadcrumb-js-row code {
  font-family: var(--font-mono);
  color: var(--accent);
  background: var(--bg);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  display: block;
  overflow-x: auto;
  margin-top: 8px;
  border: 1px solid var(--border);
}
</style>
