<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useWorkbench } from './composables/useWorkbench'
import Topbar from './components/Topbar.vue'
import SettingsModal from './components/SettingsModal.vue'
import JsonInputPanel from './components/JsonInputPanel.vue'
import VisualizerPanel from './components/VisualizerPanel.vue'
import { toastMessage, toastVisible } from './composables/useToast'

const { state, loadLayout, saveLayout, toggleInputPanel } = useWorkbench()

// ─── Layout State ─────────────────────────────────────────────────────────────
const jsonWidth = ref(42)   // percentage – only used in split mode
const workspaceEl = ref(null)
const isSettingsOpen = ref(false)

// Splitter drag
let isDragging = false
let dragStartX = 0
let dragStartW = 0

onMounted(() => {
  const saved = loadLayout()
  if (saved?.jsonWidth) jsonWidth.value = saved.jsonWidth
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
})

const startDrag = (e) => {
  e.preventDefault()
  isDragging = true
  dragStartX = e.clientX
  dragStartW = jsonWidth.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const onMouseMove = (e) => {
  if (!isDragging || !workspaceEl.value) return
  const rect = workspaceEl.value.getBoundingClientRect()
  const delta = e.clientX - dragStartX
  const pct = (delta / rect.width) * 100
  jsonWidth.value = Math.max(15, Math.min(dragStartW + pct, 75))
}

const onMouseUp = () => {
  if (isDragging) {
    isDragging = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    saveLayout({ jsonWidth: jsonWidth.value })
  }
}

const onResetLayout = () => {
  jsonWidth.value = 42
  saveLayout(null)
}

// ─── Computed styles ──────────────────────────────────────────────────────────
const isSplit = computed(() => state.settings.layoutMode === 'split')
const isTabMode = computed(() => state.settings.layoutMode === 'tab')

const inputPanelStyle = computed(() => {
  if (!isSplit.value) return {}
  if (!state.inputPanelVisible) return { width: '0px', overflow: 'hidden', minWidth: '0' }
  return { width: `${jsonWidth.value}%` }
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
        JSON Input
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

    <!-- Content Area (Split mode row, or Tab mode active panel) -->
    <div class="content-area" ref="workspaceEl">
      
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
        class="gutter gutter-vertical"
        :class="{ 'is-dragging': isDragging }"
        @mousedown="startDrag"
        title="Drag to resize — double-click to toggle panel"
        @dblclick="toggleInputPanel"
      ></div>

      <!-- Collapsed indicator (Split Mode Only) -->
      <button
        v-if="!state.inputPanelVisible && isSplit"
        class="panel-collapsed-btn"
        @click="toggleInputPanel"
        title="Show JSON Input"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
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
  flex-direction: row;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.input-panel {
  flex-shrink: 0;
  min-width: 0;
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.explorer-panel {
  flex: 1 1 auto;
  min-width: 200px;
  overflow: hidden;
}

.gutter {
  background: var(--bg-panel);
  z-index: 10;
  position: relative;
  transition: background-color 0.15s ease;
  flex-shrink: 0;
}

.gutter-vertical {
  width: var(--gutter-size);
  cursor: col-resize;
  border-left: 1px solid var(--border);
  border-right: 1px solid var(--border);
}

.gutter-vertical:hover,
.gutter-vertical.is-dragging {
  background: var(--accent);
}

.panel-collapsed-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  flex-shrink: 0;
  background: var(--bg-panel);
  border: none;
  border-right: 1px solid var(--border);
  color: var(--text-faint);
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
}

.panel-collapsed-btn:hover {
  color: var(--accent);
  background: var(--bg-panel-alt);
}

.panel-slide-enter-active, .panel-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.25s ease;
}
.panel-slide-enter-from, .panel-slide-leave-to {
  opacity: 0;
  transform: translateX(-10px);
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
