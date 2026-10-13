<script setup>
import { ref, computed } from 'vue'
import { useWorkbench } from '../composables/useWorkbench'
import { copyToClipboard, showToast } from '../composables/useToast'

const props = defineProps({
  inputVisible: Boolean,
  layoutMode: String,
})

const emit = defineEmits(['open-settings', 'toggle-input'])

const { state, clearCache, onLoadCacheEntry: _loadCache, loadFromCache, removeFromCache } = useWorkbench()

const showCacheDropdown = ref(false)

const onLoadCacheEntry = (id) => {
  loadFromCache(id)
  showCacheDropdown.value = false
  showToast('✓ Loaded from history')
}

const onRemoveCacheEntry = (id) => {
  removeFromCache(id)
}

const timeAgo = (ts) => {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

const isCustom = ref(!['data', 'item', 'response', 'result'].includes(state.rootVarName))
const customVar = ref(isCustom.value ? state.rootVarName : '')
const rootVarOptions = ['data', 'item', 'response', 'result']
const selectedRoot = ref(isCustom.value ? '__custom__' : state.rootVarName)

const onSelectChange = () => {
  if (selectedRoot.value === '__custom__') {
    isCustom.value = true
    state.rootVarName = customVar.value.trim() || 'data'
  } else {
    isCustom.value = false
    state.rootVarName = selectedRoot.value
  }
}

const onCustomInput = () => {
  const cleaned = customVar.value.replace(/[^A-Za-z0-9_$]/g, '')
  customVar.value = cleaned
  state.rootVarName = cleaned.trim() || 'data'
}

// Only show the hide-input and split dock buttons in split mode
const showToggleBtn = computed(() => props.layoutMode === 'split')

const setSplitPos = (pos) => {
  state.settings.splitPosition = pos
  if (!props.inputVisible) {
    emit('toggle-input')
  }
  showToast(`Docked JSON to ${pos}`)
}

// ─── Copy as JS Variable ─────────────────────────────────────────────────────
const copyAsVar = () => {
  if (!state.parsedData) return showToast('No valid JSON to export')
  const varName = state.rootVarName || 'data'
  const body = JSON.stringify(state.parsedData, null, 2)
  const code = `const ${varName} = ${body};`
  copyToClipboard(code)
}

</script>

<template>
  <header class="topbar">
    <div class="topbar-left">
      <div class="logo-lockup">
        <!-- Left brace -->
        <svg class="brace" width="18" height="26" viewBox="0 0 210 500" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="lg-left" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#ff3d00"/>
              <stop offset="45%" stop-color="#ff6d00"/>
              <stop offset="100%" stop-color="#ffd180"/>
            </linearGradient>
          </defs>
          <path d="M 185 30 Q 105 30, 96 95 L 88 175 Q 80 225, 36 238 Q 8 246, 8 265 Q 8 284, 36 292 Q 80 305, 88 355 L 96 435 Q 105 500, 185 500" fill="none" stroke="url(#lg-left)" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>

        <h1>JSONLens</h1>

        <!-- Right brace -->
        <svg class="brace" width="18" height="26" viewBox="0 0 210 500" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="lg-right" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#ff3d00"/>
              <stop offset="45%" stop-color="#ff6d00"/>
              <stop offset="100%" stop-color="#ffd180"/>
            </linearGradient>
          </defs>
          <path d="M 25 30 Q 105 30, 114 95 L 122 175 Q 130 225, 174 238 Q 202 246, 202 265 Q 202 284, 174 292 Q 130 305, 122 355 L 114 435 Q 105 500, 25 500" fill="none" stroke="url(#lg-right)" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>

    <div class="topbar-actions">
      <!-- JSON Entries / Cache dropdown -->
      <div class="cache-dropdown-wrap">
        <button
          @click="showCacheDropdown = !showCacheDropdown"
          class="btn-small btn-cache"
          :class="{ active: showCacheDropdown }"
          :title="state.jsonCache.length ? `${state.jsonCache.length} cached` : 'No history yet'"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
          JSON Entries
          <span v-if="state.jsonCache.length" class="cache-count">{{ state.jsonCache.length }}</span>
        </button>

        <!-- Dropdown -->
        <div v-if="showCacheDropdown" class="cache-dropdown" @click.stop>
          <div class="cd-header">
            <span>Recent JSON Payloads</span>
            <button v-if="state.jsonCache.length" class="cd-clear" @click="clearCache(); showToast('Cache cleared')">Clear All</button>
          </div>
          <div v-if="state.jsonCache.length === 0" class="cd-empty">
            No cached payloads yet.<br>Paste valid JSON to auto-save.
          </div>
          <div
            v-for="entry in state.jsonCache"
            :key="entry.id"
            class="cd-row"
            @click="onLoadCacheEntry(entry.id)"
          >
            <div class="cd-row-top">
              <span class="cd-label">{{ entry.label }}</span>
              <span class="cd-time">{{ timeAgo(entry.timestamp) }}</span>
            </div>
            <div class="cd-preview">{{ entry.preview }}</div>
            <button class="cd-rm" @click.stop="onRemoveCacheEntry(entry.id)" title="Remove">✕</button>
          </div>
        </div>
      </div>

      <!-- Hide/Show Input Panel (split mode only) -->
      <button
        v-if="showToggleBtn"
        class="btn-small btn-icon-label"
        :class="{ 'is-active': !inputVisible }"
        @click="emit('toggle-input')"
        :title="inputVisible ? 'Hide JSON Input panel' : 'Show JSON Input panel'"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <template v-if="inputVisible">
            <polyline points="16 18 22 12 16 6"/>
            <polyline points="8 6 2 12 8 18"/>
            <line x1="5" y1="12" x2="19" y2="12" stroke-dasharray="3 3" opacity="0.4"/>
          </template>
          <template v-else>
            <polyline points="8 18 2 12 8 6"/>
            <polyline points="16 6 22 12 16 18"/>
          </template>
        </svg>
        {{ inputVisible ? 'Hide Input' : 'Show Input' }}
      </button>

      <!-- Split Position Toggle (Left / Bottom / Right) -->
      <div v-if="showToggleBtn" class="split-dock-group" title="Split Panel Position (Left, Bottom, Right)">
        <button
          class="btn-small dock-btn"
          :class="{ 'is-active': (state.settings.splitPosition || 'left') === 'left' }"
          @click="setSplitPos('left')"
          title="Dock JSON Input to Left"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="2" y="2" width="12" height="12" rx="2" />
            <line x1="7" y1="2" x2="7" y2="14" />
            <rect x="2" y="2" width="5" height="12" rx="1" fill="currentColor" opacity="0.4" />
          </svg>
          <span>Left</span>
        </button>
        <button
          class="btn-small dock-btn"
          :class="{ 'is-active': state.settings.splitPosition === 'bottom' }"
          @click="setSplitPos('bottom')"
          title="Dock JSON Input to Bottom"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="2" y="2" width="12" height="12" rx="2" />
            <line x1="2" y1="9" x2="14" y2="9" />
            <rect x="2" y="9" width="12" height="5" rx="1" fill="currentColor" opacity="0.4" />
          </svg>
          <span>Bottom</span>
        </button>
        <button
          class="btn-small dock-btn"
          :class="{ 'is-active': state.settings.splitPosition === 'right' }"
          @click="setSplitPos('right')"
          title="Dock JSON Input to Right"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="2" y="2" width="12" height="12" rx="2" />
            <line x1="9" y1="2" x2="9" y2="14" />
            <rect x="9" y="2" width="5" height="12" rx="1" fill="currentColor" opacity="0.4" />
          </svg>
          <span>Right</span>
        </button>
      </div>

      <!-- Root Var -->
      <label class="root-var-label">
        Root Var:
        <select v-model="selectedRoot" @change="onSelectChange" class="setting-select root-select">
          <option v-for="opt in rootVarOptions" :key="opt" :value="opt">{{ opt }}</option>
          <option value="__custom__">Custom&hellip;</option>
        </select>
        <input
          v-if="isCustom"
          type="text"
          v-model="customVar"
          @input="onCustomInput"
          class="custom-root-input"
          placeholder="myVar"
        />
      </label>

      <!-- Settings -->

      <button @click="emit('open-settings')" class="btn-small btn-settings" title="Configure settings">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        Settings
      </button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  height: 48px;
}

.topbar-left {
  display: flex;
  align-items: center;
}

.logo-lockup {
  display: flex;
  align-items: center;
  gap: 6px;
}

.brace {
  flex-shrink: 0;
  filter: drop-shadow(0 0 5px rgba(255, 90, 0, 0.5));
}

.topbar h1 {
  font-size: 14px;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(90deg, #ffffff 0%, #ffe0b2 60%, #ffd180 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 0.3px;
  white-space: nowrap;
  text-shadow: none;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ─── Cache / JSON Entries ──────────────────────────────────────────────── */
.cache-dropdown-wrap {
  position: relative;
}

.btn-cache {
  display: flex;
  align-items: center;
  gap: 4px;
}
.btn-cache.active { border-color: var(--accent); color: var(--accent); }

.cache-count {
  background: var(--accent);
  color: var(--bg);
  font-size: 9px;
  font-weight: 700;
  border-radius: 8px;
  padding: 0 5px;
  min-width: 14px;
  text-align: center;
  line-height: 14px;
}

.cache-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 6px;
  width: 320px;
  max-height: 340px;
  overflow-y: auto;
  background: var(--bg-panel-alt);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.45);
  z-index: 50;
  animation: cdFadeIn 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes cdFadeIn {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.cd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px 8px;
  border-bottom: 1px solid var(--border);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-dim);
  position: sticky;
  top: 0;
  background: var(--bg-panel-alt);
  z-index: 1;
}

.cd-clear {
  background: none;
  border: none;
  color: var(--red);
  font-size: 10px;
  cursor: pointer;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}
.cd-clear:hover { background: rgba(255,123,114,0.1); }

.cd-empty {
  padding: 20px 14px;
  text-align: center;
  color: var(--text-faint);
  font-size: 12px;
  line-height: 1.5;
}

.cd-row {
  position: relative;
  padding: 10px 30px 10px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  cursor: pointer;
  transition: background 0.1s;
}
.cd-row:hover { background: rgba(255,255,255,0.05); }

.cd-row-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3px;
}

.cd-label {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.cd-time {
  font-size: 10px;
  color: var(--text-faint);
  flex-shrink: 0;
  margin-left: 8px;
}

.cd-preview {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cd-rm {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-faint);
  font-size: 10px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  opacity: 0;
  transition: all 0.15s;
}
.cd-row:hover .cd-rm { opacity: 1; }
.cd-rm:hover { color: var(--red); background: rgba(255,123,114,0.1); }


.root-var-label {
  font-size: 12px;
  color: var(--text-dim);
  display: flex;
  align-items: center;
  gap: 6px;
}

.custom-root-input {
  background: var(--bg-panel-alt);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 5px 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--accent);
  width: 90px;
  outline: none;
  height: 28px;
  box-sizing: border-box;
}
.custom-root-input:focus {
  border-color: var(--accent);
}

.root-select {
  height: 28px;
  padding: 0 8px;
  border-radius: 6px;
  box-sizing: border-box;
}

.btn-small {
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--bg-panel-alt);
  color: var(--text-dim);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0 10px;
  height: 28px;
  box-sizing: border-box;
  font-size: 12px;
  cursor: pointer;
  font-family: var(--font-ui);
  transition: all 0.15s ease;
  white-space: nowrap;
}

.btn-small:hover {
  border-color: var(--accent);
  color: #fff;
}

.btn-small.is-active {
  border-color: var(--accent);
  background: rgba(88, 166, 255, 0.12);
  color: var(--accent);
}

.btn-settings {
  gap: 5px;
}

.btn-copy-var {
  border-color: rgba(88, 166, 255, 0.3);
  gap: 5px;
}

.btn-copy-var:hover:not(:disabled) {
  border-color: var(--accent);
  background: rgba(88, 166, 255, 0.1);
  color: var(--accent);
}

.btn-copy-var:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.var-preview {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--accent);
  background: rgba(88, 166, 255, 0.1);
  border-radius: 3px;
  padding: 1px 4px;
  margin-left: 1px;
}

/* ─── Split Position Dock Group ─────────────────────────────────────────── */
.split-dock-group {
  display: flex;
  align-items: center;
  background: var(--bg-panel-alt);
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  height: 28px;
  box-sizing: border-box;
}

.split-dock-group .dock-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 100%;
  padding: 0 8px;
  background: transparent;
  border: none;
  border-radius: 0;
  color: var(--text-dim);
  font-size: 11px;
  font-weight: 500;
  font-family: var(--font-ui);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.split-dock-group .dock-btn:not(:last-child) {
  border-right: 1px solid var(--border);
}

.split-dock-group .dock-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.05);
}

.split-dock-group .dock-btn.is-active {
  background: rgba(88, 166, 255, 0.15);
  color: var(--accent);
  font-weight: 600;
}
</style>
