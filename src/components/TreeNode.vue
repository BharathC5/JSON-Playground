<script setup>
import { ref, computed } from 'vue'
import { getType, formatPrimitive, pathToJs } from '../utils/jsonPath'
import { copyToClipboard } from '../composables/useToast'
import { useWorkbench } from '../composables/useWorkbench'

const props = defineProps({
  nodeKey: {
    type: [String, Number],
    required: true
  },
  value: {
    required: true
  },
  pathArr: {
    type: Array,
    required: true
  },
  isRoot: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['inspect'])

const { state } = useWorkbench()

const expanded = ref(props.isRoot)
const shownCount = ref(30)

const type = computed(() => getType(props.value))
const isExpandable = computed(() => {
  return (type.value === 'object' || type.value === 'array') && 
         props.value !== null && 
         (type.value === 'array' ? props.value.length > 0 : Object.keys(props.value).length > 0)
})

const badgeText = computed(() => {
  if (type.value === 'array') return `Array(${props.value.length})`
  if (type.value === 'object') return `Object {${Object.keys(props.value).length}}`
  return ''
})

const childrenKeys = computed(() => {
  if (type.value === 'array') {
    return Array.from({ length: Math.min(shownCount.value, props.value.length) }, (_, i) => i)
  }
  return Object.keys(props.value)
})

const hasMore = computed(() => {
  return type.value === 'array' && props.value.length > shownCount.value
})

const toggleExpand = () => {
  if (!isExpandable.value) return
  expanded.value = !expanded.value
}

const onRowClick = () => {
  toggleExpand()
  const js = pathToJs(props.pathArr, false)
  emit('inspect', { pathArr: props.pathArr, js })
}

const onCopy = (e) => {
  e.stopPropagation()
  copyToClipboard(pathToJs(props.pathArr, false))
}

const showMore = (e) => {
  e.stopPropagation()
  shownCount.value += 50
}
</script>

<template>
  <div class="tree-node">
    <div class="tree-row" @click="onRowClick">
      <span class="tree-toggle">{{ isExpandable ? (expanded ? '▼' : '▶') : '' }}</span>
      <span class="tree-key">{{ typeof nodeKey === 'number' ? `[${nodeKey}]` : nodeKey }}</span>
      
      <template v-if="!isExpandable && value !== null && type !== 'object' && type !== 'array'">
        <span class="tree-colon">:</span>
        <span :class="`tree-value-${type}`">{{ formatPrimitive(value, type) }}</span>
      </template>
      
      <span v-else-if="value === null" class="tree-colon">:<span class="tree-value-null">null</span></span>
      <span v-else class="tree-type-badge">{{ badgeText }}</span>

      <button v-if="!isRoot" class="copy-path-btn" @click="onCopy" title="Copy Path based on current array access setting">Copy</button>
    </div>

    <div v-if="expanded && isExpandable" class="tree-children">
      <TreeNode
        v-for="k in childrenKeys"
        :key="k"
        :nodeKey="k"
        :value="value[k]"
        :pathArr="[...pathArr, k]"
        @inspect="emit('inspect', $event)"
      />
      
      <div v-if="hasMore" class="show-more-row" @click="showMore">
        + {{ value.length - shownCount }} more items...
      </div>
    </div>
  </div>
</template>

<style scoped>
.tree-node {
  font-family: var(--font-mono);
  font-size: 12px;
}

.tree-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.1s;
}

.tree-row:hover {
  background: var(--bg-panel-alt);
}
.tree-row:hover .copy-path-btn {
  visibility: visible;
  opacity: 1;
}

.tree-toggle {
  width: 14px;
  color: var(--text-faint);
  text-align: center;
  font-size: 10px;
}
.tree-key {
  color: var(--purple);
}
.tree-colon {
  color: var(--text-faint);
}
.tree-value-string {
  color: var(--green);
}
.tree-value-number {
  color: var(--yellow);
}
.tree-value-boolean {
  color: var(--cyan);
}
.tree-value-null {
  color: var(--text-faint);
  font-style: italic;
}
.tree-type-badge {
  color: var(--text-faint);
  font-size: 11px;
  margin-left: 8px;
}

.tree-children {
  margin-left: 14px;
  border-left: 1px dashed var(--border);
  padding-left: 8px;
}

.copy-path-btn {
  visibility: hidden;
  opacity: 0;
  margin-left: auto;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  color: var(--text-dim);
  font-size: 10px;
  border-radius: 4px;
  padding: 2px 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-path-btn:hover {
  background: var(--accent-dim);
  color: #fff;
  border-color: var(--accent);
}

.show-more-row {
  color: var(--accent);
  padding: 4px 14px;
  cursor: pointer;
  font-size: 11px;
}
.show-more-row:hover {
  text-decoration: underline;
}
</style>
