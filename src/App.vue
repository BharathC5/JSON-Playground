<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useWorkbench } from './composables/useWorkbench'
import Topbar from './components/Topbar.vue'
import SettingsModal from './components/SettingsModal.vue'
import JsonInputPanel from './components/JsonInputPanel.vue'
import VisualizerPanel from './components/VisualizerPanel.vue'
import ConsolePanel from './components/ConsolePanel.vue'
import { toastMessage, toastVisible } from './composables/useToast'

const { loadLayout, saveLayout } = useWorkbench()

const jsonWidth = ref(45) // percentage
const consoleHeight = ref(240) // px

const workspaceLayout = ref(null)

let isDraggingV = false
let isDraggingH = false

onMounted(() => {
  const saved = loadLayout()
  if (saved) {
    if (saved.jsonWidth) jsonWidth.value = saved.jsonWidth
    if (saved.consoleHeight) consoleHeight.value = saved.consoleHeight
  }
  
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
})

const startDragV = (e) => {
  e.preventDefault()
  isDraggingV = true
  document.body.style.cursor = 'col-resize'
}

const startDragH = (e) => {
  e.preventDefault()
  isDraggingH = true
  document.body.style.cursor = 'row-resize'
}

const handleMouseMove = (e) => {
  if (isDraggingV && workspaceLayout.value) {
    const layoutRect = workspaceLayout.value.getBoundingClientRect()
    let newWidth = ((e.clientX - layoutRect.left) / layoutRect.width) * 100
    newWidth = Math.max(10, Math.min(newWidth, 90))
    jsonWidth.value = newWidth
  } else if (isDraggingH) {
    const newHeight = Math.max(70, Math.min(window.innerHeight - e.clientY, window.innerHeight - 150))
    consoleHeight.value = newHeight
  }
}

const handleMouseUp = () => {
  if (isDraggingV || isDraggingH) {
    isDraggingV = false
    isDraggingH = false
    document.body.style.cursor = ''
    saveLayout({ jsonWidth: jsonWidth.value, consoleHeight: consoleHeight.value })
  }
}

const isSettingsOpen = ref(false)
</script>

<template>
  <Topbar @open-settings="isSettingsOpen = true" />

  <main class="workspace-layout" ref="workspaceLayout">
    <JsonInputPanel :style="{ width: `${jsonWidth}%` }" />

    <div
      class="gutter gutter-vertical"
      :class="{ 'is-dragging': isDraggingV }"
      @mousedown="startDragV"
      title="Drag to resize panels"
    ></div>

    <VisualizerPanel class="panel-explorer" />
  </main>

  <div
    class="gutter gutter-horizontal"
    :class="{ 'is-dragging': isDraggingH }"
    @mousedown="startDragH"
    title="Drag to resize console"
  ></div>

  <ConsolePanel :style="{ height: `${consoleHeight}px` }" />

  <SettingsModal 
    v-if="isSettingsOpen" 
    @close="isSettingsOpen = false" 
    @reset-layout="jsonWidth = 45; consoleHeight = 240; saveLayout(null)" 
  />

  <div v-if="toastVisible" class="toast">{{ toastMessage }}</div>
</template>

<style scoped>
.workspace-layout {
  display: flex;
  flex-direction: row;
  flex: 1 1 auto;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.panel-explorer {
  flex: 1 1 auto;
  min-width: 200px;
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

.gutter-vertical {
  width: var(--gutter-size);
  cursor: col-resize;
  border-left: 1px solid var(--border);
  border-right: 1px solid var(--border);
}

.gutter-horizontal {
  height: var(--gutter-size);
  cursor: row-resize;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
</style>
