<script setup>
import { computed, ref } from 'vue'
import { getType, formatPrimitive, pathToJs } from '../utils/jsonPath'
import { useWorkbench } from '../composables/useWorkbench'

const emit = defineEmits(['inspect'])
const { state } = useWorkbench()

const flowExpanded = ref(new Set(['']))
const flowShownCounts = ref(new Map())

const toggleExpand = (keyStr) => {
  const newSet = new Set(flowExpanded.value)
  if (newSet.has(keyStr)) {
    newSet.delete(keyStr)
  } else {
    newSet.add(keyStr)
  }
  flowExpanded.value = newSet
}

const FLOW_NODE_W = 180;
const FLOW_NODE_H = 30;
const FLOW_X_SPACING = 240; // horizontal distance per depth
const FLOW_Y_SPACING = 50;  // vertical distance per layout row
const FLOW_PAD = 40;

const layoutData = computed(() => {
  if (!state.parsedData) return null

  const positions = []
  let leafCounter = 0
  let maxDepth = 0
  let maxYLayout = 0

  function layout(value, pathArr, depth, keyLabel, parentKeyStr, isRoot) {
    const keyStr = pathArr.join('\u0001')
    const t = getType(value)
    const expandable = (t === 'object' || t === 'array') && value !== null && Object.keys(value).length > 0
    const expanded = isRoot || flowExpanded.value.has(keyStr)
    maxDepth = Math.max(maxDepth, depth)

    let yLayout; // what used to be 'x' in top-down
    if (!expandable || !expanded) {
      yLayout = leafCounter++
    } else {
      const allKeys = t === 'array' ? value.map((_, i) => i) : Object.keys(value)
      const shown = flowShownCounts.value.get(keyStr) || Math.min(10, allKeys.length)
      const visibleKeys = allKeys.slice(0, shown)
      const childYs = visibleKeys.map(k => layout(value[k], pathArr.concat(k), depth + 1, k, keyStr, false))
      yLayout = childYs.length ? (Math.min(...childYs) + Math.max(...childYs)) / 2 : leafCounter++
    }

    maxYLayout = Math.max(maxYLayout, yLayout)

    positions.push({
      keyStr,
      parentKeyStr,
      keyLabel,
      value,
      pathArr,
      depth,
      yLayout,
      isRoot,
      expandable,
      expanded,
      type: t
    })
    return yLayout
  }

  layout(state.parsedData, [], 0, state.rootVarName, null, true)

  const width = (maxDepth + 1) * FLOW_X_SPACING + FLOW_PAD * 2
  const height = (maxYLayout + 1) * FLOW_Y_SPACING + FLOW_PAD * 2

  return { positions, width, height }
})

const getCenter = (p) => {
  return {
    leftX: FLOW_PAD + p.depth * FLOW_X_SPACING,
    rightX: FLOW_PAD + p.depth * FLOW_X_SPACING + FLOW_NODE_W,
    cy: FLOW_PAD + p.yLayout * FLOW_Y_SPACING + FLOW_NODE_H / 2
  }
}

const edges = computed(() => {
  if (!layoutData.value) return []
  const { positions } = layoutData.value
  const byKey = {}
  positions.forEach(p => { byKey[p.keyStr] = p })

  const paths = []
  positions.forEach(p => {
    if (p.parentKeyStr !== null && byKey[p.parentKeyStr]) {
      const parentC = getCenter(byKey[p.parentKeyStr])
      const childC = getCenter(p)
      const midX = (parentC.rightX + childC.leftX) / 2
      paths.push(`M ${parentC.rightX} ${parentC.cy} C ${midX} ${parentC.cy}, ${midX} ${childC.cy}, ${childC.leftX} ${childC.cy}`)
    }
  })
  return paths
})

const onNodeClick = (p, e) => {
  e.stopPropagation()
  if (p.expandable) {
    toggleExpand(p.keyStr)
  }
  const js = pathToJs(p.pathArr, false)
  emit('inspect', { pathArr: p.pathArr, js })
}

const getBadge = (p) => {
  if (p.type === 'array') return `[${p.value.length}]`
  if (p.type === 'object') return `{${Object.keys(p.value).length}}`
  return ''
}

const panX = ref(0)
const panY = ref(0)
let isDragging = false
let startX = 0
let startY = 0

const onMouseDown = (e) => {
  isDragging = true
  startX = e.clientX - panX.value
  startY = e.clientY - panY.value
  document.body.style.cursor = 'grabbing'
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

const onMouseMove = (e) => {
  if (isDragging) {
    panX.value = e.clientX - startX
    panY.value = e.clientY - startY
  }
}

const onMouseUp = () => {
  if (isDragging) {
    isDragging = false
    document.body.style.cursor = ''
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }
}
</script>

<template>
  <div class="flow-viewport" @mousedown="onMouseDown" :style="{ backgroundPosition: `${panX}px ${panY}px` }">
    <div v-if="layoutData" class="flow-inner" :style="{ width: layoutData.width + 'px', height: layoutData.height + 'px', transform: `translate(${panX}px, ${panY}px)` }">
      <svg class="flow-edges" :width="layoutData.width" :height="layoutData.height">
        <path v-for="(path, i) in edges" :key="i" :d="path" class="flow-edge-path" />
      </svg>

      <div
        v-for="p in layoutData.positions"
        :key="p.keyStr"
        class="flow-node"
        :class="{ 'is-root': p.isRoot }"
        :style="{ left: getCenter(p).leftX + 'px', top: (getCenter(p).cy - FLOW_NODE_H / 2) + 'px', width: FLOW_NODE_W + 'px', height: FLOW_NODE_H + 'px' }"
        @click="onNodeClick(p, $event)"
        @mousedown.stop
      >
        <span class="flow-node-key">{{ typeof p.keyLabel === 'number' ? `[${p.keyLabel}]` : p.keyLabel }}</span>
        
        <span v-if="p.expandable" class="flow-node-badge">{{ getBadge(p) }}</span>
        <span v-else :class="`flow-node-value tree-value-${p.type}`">{{ formatPrimitive(p.value, p.type) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flow-viewport {
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: grab;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px) 0 0/30px 30px,
    linear-gradient(0deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px) 0 0/30px 30px;
}

.flow-viewport:active {
  cursor: grabbing;
}

.flow-inner {
  position: relative;
  min-width: 100%;
  min-height: 100%;
  transform-origin: 0 0;
  will-change: transform;
}

.flow-edges {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.flow-edge-path {
  fill: none;
  stroke: var(--border-focus);
  stroke-width: 1.5;
  opacity: 0.6;
}

.flow-node {
  position: absolute;
  background: var(--bg-panel-alt);
  border: 1px solid var(--border);
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  font-family: var(--font-mono);
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 1;
  transition: border-color 0.2s, transform 0.1s;
  overflow: hidden;
}

.flow-node:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
  z-index: 2;
}

.flow-node.is-root {
  border-color: var(--accent);
  background: rgba(31, 111, 235, 0.15);
}

.flow-node-key {
  color: var(--purple);
  font-weight: 600;
  margin-right: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.flow-node.is-root .flow-node-key {
  color: var(--accent);
}

.flow-node-badge {
  color: var(--text-faint);
  font-size: 10px;
}

.flow-node-value {
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-value-string { color: var(--green); }
.tree-value-number { color: var(--yellow); }
.tree-value-boolean { color: var(--cyan); }
.tree-value-null { color: var(--text-faint); font-style: italic; }
</style>
