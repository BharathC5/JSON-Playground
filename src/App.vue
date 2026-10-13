<script setup>
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { useWorkbench } from './composables/useWorkbench'
import Topbar from './components/Topbar.vue'
import SettingsModal from './components/SettingsModal.vue'
import JsonInputPanel from './components/JsonInputPanel.vue'
import VisualizerPanel from './components/VisualizerPanel.vue'
import { toastMessage, toastVisible } from './composables/useToast'

const { state, loadLayout, saveLayout, toggleInputPanel } = useWorkbench()

watch(() => state.rootVarName, (newVar) => {
  document.title = newVar ? `${newVar} - JSONLens` : 'JSONLens'
}, { immediate: true })

// ─── Layout State ─────────────────────────────────────────────────────────────
const jsonWidth = ref(42)   // percentage – used in left/right split
const jsonHeight = ref(40)  // percentage – used in bottom split
const workspaceEl = ref(null)
const isSettingsOpen = ref(false)

// Splitter drag
let isDragging = false
let dragStartX = 0
let dragStartY = 0
let dragStartSize = 0

onMounted(() => {
  const saved = loadLayout()
  if (saved?.jsonWidth) jsonWidth.value = saved.jsonWidth
  if (saved?.jsonHeight) jsonHeight.value = saved.jsonHeight
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
})

const splitPos = computed(() => state.settings.splitPosition || 'left')
const isGutterHorizontal = computed(() => isSplit.value && splitPos.value === 'bottom')

const startDrag = (e) => {
  e.preventDefault()
  isDragging = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  if (splitPos.value === 'bottom') {
    dragStartSize = jsonHeight.value
    document.body.style.cursor = 'row-resize'
  } else {
    dragStartSize = jsonWidth.value
    document.body.style.cursor = 'col-resize'
  }
  document.body.style.userSelect = 'none'
}

const onMouseMove = (e) => {
  if (!isDragging || !workspaceEl.value) return
  const rect = workspaceEl.value.getBoundingClientRect()

  if (splitPos.value === 'bottom') {
    // Bottom panel: dragging UP increases height, dragging DOWN decreases height
    const delta = dragStartY - e.clientY
    const pct = (delta / rect.height) * 100
    jsonHeight.value = Math.max(15, Math.min(dragStartSize + pct, 80))
  } else if (splitPos.value === 'right') {
    // Right panel: dragging LEFT increases width, dragging RIGHT decreases width
    const delta = dragStartX - e.clientX
    const pct = (delta / rect.width) * 100
    jsonWidth.value = Math.max(15, Math.min(dragStartSize + pct, 80))
  } else {
    // Left panel: dragging RIGHT increases width, dragging LEFT decreases width
    const delta = e.clientX - dragStartX
    const pct = (delta / rect.width) * 100
    jsonWidth.value = Math.max(15, Math.min(dragStartSize + pct, 80))
  }
}

const onMouseUp = () => {
  if (isDragging) {
    isDragging = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    saveLayout({ jsonWidth: jsonWidth.value, jsonHeight: jsonHeight.value })
  }
}

const onResetLayout = () => {
  jsonWidth.value = 42
  jsonHeight.value = 40
  saveLayout(null)
}

// ─── Computed styles ──────────────────────────────────────────────────────────
const isSplit = computed(() => state.settings.layoutMode === 'split')
const isTabMode = computed(() => state.settings.layoutMode === 'tab')

const inputPanelStyle = computed(() => {
  if (!isSplit.value) return {}
  if (!state.inputPanelVisible) {
    if (splitPos.value === 'bottom') {
      return { height: '0px', overflow: 'hidden', minHeight: '0' }
    }
    return { width: '0px', overflow: 'hidden', minWidth: '0' }
  }
  if (splitPos.value === 'bottom') {
    return { height: `${jsonHeight.value}%`, width: '100%' }
  }
  return { width: `${jsonWidth.value}%`, height: '100%' }
})

const showGutter = computed(() => isSplit.value && state.inputPanelVisible)
</script>

<template>
  <Topbar
    @open-settings="isSettingsOpen = true"
    @toggle-input="toggleInputPanel"
    :input-visible="state.inputPanelVisible"
    :layout-mode="state.settings.layoutMode"
  />

  <!-- ─── APP BODY ─────────────────────────────────────── -->
  <main class="app-body" :class="{ 'is-tab-mode': isTabMode, 'is-split-mode': isSplit }">
    <!-- Tab Bar (Tab Mode Only) -->
    <div v-if="isTabMode" class="tab-bar">
      <button class="tab-btn" :class="{ active: state.currentView === '__input' }" @click="state.currentView = '__input'">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        {{ state.rootVarName || 'data' }}
        <span class="tab-badge" v-if="state.parsedData">JSON</span>
      </button>
      <button class="tab-btn" :class="{ active: state.currentView === 'tree' }" @click="state.currentView = 'tree'">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 3h18"/><path d="M3 9h18"/><path d="M3 15h14"/><path d="M3 21h10"/></svg>
        Tree
      </button>
      <button class="tab-btn" :class="{ active: state.currentView === 'flow' }" @click="state.currentView = 'flow'">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><line x1="7" y1="12" x2="17" y2="6.5"/><line x1="7" y1="12" x2="17" y2="17.5"/></svg>
        Flowchart
      </button>
      <button class="tab-btn" :class="{ active: state.currentView === 'console' }" @click="state.currentView = 'console'">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
        Console
      </button>
      <button class="tab-btn" :class="{ active: state.currentView === 'mapper' }" @click="state.currentView = 'mapper'">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        Mapper
      </button>
    </div>

    <!-- Content Area (Split mode row/col, or Tab mode active panel) -->
    <div
      class="content-area"
      ref="workspaceEl"
      :class="[
        `split-${splitPos}`,
        { 'is-dragging': isDragging, 'is-split-mode': isSplit, 'is-tab-mode': isTabMode }
      ]"
    >
      <!-- JSON Input -->
      <transition name="panel-slide">
        <JsonInputPanel 
          v-show="(isSplit && state.inputPanelVisible) || (isTabMode && state.currentView === '__input')"
          :style="isSplit ? inputPanelStyle : null" 
          class="input-panel"
          :class="{ 'tab-panel-fill': isTabMode }"
        />
      </transition>

      <!-- Splitter (Split Mode Only) -->
      <div
        v-if="showGutter"
        class="gutter"
        :class="[
          isGutterHorizontal ? 'gutter-horizontal' : 'gutter-vertical',
          { 'is-dragging': isDragging }
        ]"
        @mousedown="startDrag"
        title="Drag to resize — double-click to toggle panel"
        @dblclick="toggleInputPanel"
      ></div>

      <!-- Collapsed indicator (Split Mode Only) -->
      <button
        v-if="!state.inputPanelVisible && isSplit"
        class="panel-collapsed-btn"
        :class="`collapsed-${splitPos}`"
        @click="toggleInputPanel"
        :title="`Show JSON Input (${splitPos})`"
      >
        <svg v-if="splitPos === 'left'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        <svg v-else-if="splitPos === 'right'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        <template v-else>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
          <span class="collapsed-btn-text">Show JSON Input</span>
        </template>
      </button>

      <!-- Visualizer -->
      <VisualizerPanel 
        v-show="isSplit || (isTabMode && state.currentView !== '__input')"
        class="explorer-panel"
        :class="{ 'tab-panel-fill': isTabMode }"
      />
      
    </div>
  </main>

  <!-- ─── Settings Modal ───────────────────────────────── -->
  <SettingsModal
    v-if="isSettingsOpen"
    @close="isSettingsOpen = false"
    @reset-layout="onResetLayout"
  />

  <!-- ─── Toast ────────────────────────────────────────── -->
  <transition name="toast-anim">
    <div v-if="toastVisible" class="toast">{{ toastMessage }}</div>
  </transition>
</template>

<style scoped>
/* ─── APP BODY (UNIFIED) ─────────────────────────────────────────────────── */
.app-body {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.content-area {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

/* ── Split Left (JSON Input on Left, Visualizer on Right) ───────────────── */
.content-area.split-left {
  flex-direction: row;
}
.content-area.split-left .input-panel {
  order: 1;
}
.content-area.split-left .gutter {
  order: 2;
}
.content-area.split-left .explorer-panel {
  order: 3;
}
.content-area.split-left .panel-collapsed-btn {
  order: 1;
}

/* ── Split Right (Visualizer on Left, JSON Input on Right) ──────────────── */
.content-area.split-right {
  flex-direction: row;
}
.content-area.split-right .explorer-panel {
  order: 1;
}
.content-area.split-right .gutter {
  order: 2;
}
.content-area.split-right .input-panel {
  order: 3;
}
.content-area.split-right .panel-collapsed-btn {
  order: 4;
}

/* ── Split Bottom (Visualizer on Top, JSON Input on Bottom) ─────────────── */
.content-area.split-bottom {
  flex-direction: column;
}
.content-area.split-bottom .explorer-panel {
  order: 1;
  width: 100%;
  flex: 1 1 auto;
  height: 0;
  min-height: 140px;
}
.content-area.split-bottom .gutter {
  order: 2;
}
.content-area.split-bottom .input-panel {
  order: 3;
  width: 100% !important;
}
.content-area.split-bottom .panel-collapsed-btn {
  order: 4;
}

/* ── Panels ─────────────────────────────────────────────────────────────── */
.input-panel {
  flex-shrink: 0;
  min-width: 0;
  min-height: 0;
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1), height 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.content-area.is-dragging .input-panel {
  transition: none !important;
}

.explorer-panel {
  flex: 1 1 auto;
  min-width: 200px;
  min-height: 0;
  overflow: hidden;
}

/* ── Splitter Gutters ───────────────────────────────────────────────────── */
.gutter {
  background: var(--bg-panel);
  z-index: 10;
  position: relative;
  transition: background-color 0.15s ease;
  flex-shrink: 0;
}

.gutter-vertical {
  width: var(--gutter-size);
  height: 100%;
  cursor: col-resize;
  border-left: 1px solid var(--border);
  border-right: 1px solid var(--border);
}

.gutter-horizontal {
  height: var(--gutter-size);
  width: 100%;
  cursor: row-resize;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.gutter:hover,
.gutter.is-dragging {
  background: var(--accent);
}

/* ── Collapsed Buttons ──────────────────────────────────────────────────── */
.panel-collapsed-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-panel);
  border: none;
  color: var(--text-faint);
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
  flex-shrink: 0;
  z-index: 10;
}

.panel-collapsed-btn:hover {
  color: var(--accent);
  background: var(--bg-panel-alt);
}

.panel-collapsed-btn.collapsed-left {
  width: 20px;
  height: 100%;
  border-right: 1px solid var(--border);
}

.panel-collapsed-btn.collapsed-right {
  width: 20px;
  height: 100%;
  border-left: 1px solid var(--border);
}

.panel-collapsed-btn.collapsed-bottom {
  height: 24px;
  width: 100%;
  border-top: 1px solid var(--border);
  gap: 6px;
  font-size: 11px;
}

.collapsed-btn-text {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-dim);
}

.panel-slide-enter-active, .panel-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.25s ease;
}
.split-left .panel-slide-enter-from, .split-left .panel-slide-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
.split-right .panel-slide-enter-from, .split-right .panel-slide-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
.split-bottom .panel-slide-enter-from, .split-bottom .panel-slide-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* ─── TAB MODE SPECIFIC ──────────────────────────────────────────────────── */

.tab-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 12px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--text-dim);
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: 500;
  padding: 5px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn:hover {
  background: var(--bg-panel-alt);
  color: var(--text);
}

.tab-btn.active {
  background: var(--accent-dim);
  border-color: var(--accent);
  color: #fff;
  position: relative;
}

/* Animated bottom indicator bar */
.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 70%;
  height: 2px;
  background: var(--accent);
  border-radius: 2px 2px 0 0;
  animation: tabIndicator 0.22s cubic-bezier(0.4, 0, 0.2, 1) both;
}

@keyframes tabIndicator {
  from { width: 0%; opacity: 0; }
  to   { width: 70%; opacity: 1; }
}

.tab-badge {
  font-size: 8px;
  font-weight: 700;
  background: rgba(152, 195, 121, 0.15);
  color: #98c379;
  border-radius: 3px;
  padding: 1px 4px;
  letter-spacing: 0.5px;
  margin-left: 2px;
  vertical-align: middle;
}

.tab-panel-fill {
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  overflow: hidden;
}

/* ─── Toast ──────────────────────────────────────────────────────────────── */
.toast-anim-enter-active { animation: toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.toast-anim-leave-active { animation: toastIn 0.2s ease reverse forwards; }

@keyframes toastIn {
  from { opacity: 0; transform: translate(-50%, 12px); }
  to   { opacity: 1; transform: translate(-50%, 0); }
}
</style>
