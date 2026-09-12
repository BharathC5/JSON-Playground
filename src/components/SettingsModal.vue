<script setup>
import { ref } from 'vue'
import { useWorkbench } from '../composables/useWorkbench'
import { showToast } from '../composables/useToast'

const { state, resetLayout } = useWorkbench()
const emit = defineEmits(['close', 'reset-layout'])

// Work on a local copy so user can Cancel
const local = ref({
  ...state.settings,
  layoutMode: state.settings.layoutMode ?? 'split',
})

const save = () => {
  Object.assign(state.settings, local.value)
  showToast('✓ Settings saved successfully!')
  emit('close')
}

const onResetLayout = () => {
  resetLayout()
  emit('reset-layout')
  showToast('Layout reset to default')
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-dialog">
      <!-- Header -->
      <div class="modal-header">
        <div class="modal-title-row">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <h2>Settings</h2>
        </div>
        <button class="btn-icon" @click="emit('close')" title="Close">&times;</button>
      </div>

      <div class="modal-body">

        <!-- ── Layout Mode ─────────────────────────── -->
        <div class="setting-section">
          <div class="section-heading">Layout Mode</div>
          <div class="layout-mode-picker">
            <button
              class="layout-mode-btn"
              :class="{ active: local.layoutMode === 'split' }"
              @click="local.layoutMode = 'split'"
            >
              <!-- Split mode icon -->
              <div class="mode-icon">
                <div class="split-demo">
                  <div class="split-left"></div>
                  <div class="split-divider"></div>
                  <div class="split-right"></div>
                </div>
              </div>
              <span class="mode-label">Split View</span>
              <span class="mode-desc">Side-by-side resizable panels</span>
            </button>

            <button
              class="layout-mode-btn"
              :class="{ active: local.layoutMode === 'tab' }"
              @click="local.layoutMode = 'tab'"
            >
              <!-- Tab mode icon -->
              <div class="mode-icon">
                <div class="tab-demo">
                  <div class="tab-demo-bar">
                    <div class="tab-demo-tab active-tab"></div>
                    <div class="tab-demo-tab"></div>
                    <div class="tab-demo-tab"></div>
                  </div>
                  <div class="tab-demo-content"></div>
                </div>
              </div>
              <span class="mode-label">Tab View</span>
              <span class="mode-desc">Full-screen tabs: Input / Tree / Flow / Console</span>
            </button>
          </div>
        </div>

        <!-- ── JS / Parser ────────────────────────── -->
        <div class="setting-section">
          <div class="section-heading">JS & Parser</div>

          <div class="setting-group">
            <label class="setting-label">Array Access Pattern</label>
            <select v-model="local.arrayCopyMode" class="setting-select">
              <option value="raw">Raw Index: <code>data.member[0].id</code></option>
              <option value="forEach">forEach loop: <code>data.member.forEach(item => item.id)</code></option>
              <option value="map">map: <code>data.member.map(item => item.id)</code></option>
              <option value="forOf">for…of: <code>for (const item of data.member)</code></option>
            </select>
            <span class="setting-help">How paths inside arrays appear when inspected or pushed to console.</span>
          </div>

          <label class="setting-checkbox-label">
            <input type="checkbox" v-model="local.optionalChaining" />
            Use Optional Chaining (<code>?.</code>) in generated paths
          </label>

          <label class="setting-checkbox-label">
            <input type="checkbox" v-model="local.showMethodsInAutocomplete" />
            Show prototype methods in console autocomplete
            <span class="help-chip">.map .filter .forEach…</span>
          </label>
        </div>

        <!-- ── Danger Zone ────────────────────────── -->
        <div class="setting-section danger-zone">
          <div class="section-heading">Layout</div>
          <button @click="onResetLayout" class="btn-small btn-danger" style="width: 100%; justify-content: center;">
            Reset Splitter Positions
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button @click="emit('close')" class="btn-small">Cancel</button>
        <button @click="save" class="btn-small btn-primary">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Save Settings
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

.modal-dialog {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  width: 520px;
  max-height: 88vh;
  overflow-y: auto;
  box-shadow: 0 24px 60px rgba(0,0,0,0.7);
  animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes scaleUp { from { opacity: 0; transform: scale(0.94) } to { opacity: 1; transform: scale(1) } }

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  background: var(--bg-panel);
  z-index: 1;
}

.modal-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-header h2 {
  font-size: 15px;
  margin: 0;
  font-weight: 700;
  color: #fff;
}

.btn-icon {
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 22px;
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
  transition: color 0.15s, transform 0.15s;
}
.btn-icon:hover { color: #fff; transform: rotate(90deg); }

.modal-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ─── Sections ─── */
.setting-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-heading {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: var(--text-faint);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

/* ─── Layout mode picker ─── */
.layout-mode-picker {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.layout-mode-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: var(--bg-panel-alt);
  border: 2px solid var(--border);
  border-radius: 10px;
  padding: 14px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}

.layout-mode-btn:hover {
  border-color: var(--text-dim);
}

.layout-mode-btn.active {
  border-color: var(--accent);
  background: rgba(88, 166, 255, 0.08);
}

.mode-icon {
  width: 64px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Split demo */
.split-demo {
  display: flex;
  width: 60px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
}
.split-left { flex: 2; background: rgba(88,166,255,0.12); }
.split-divider { width: 2px; background: var(--border); }
.split-right { flex: 3; background: var(--bg); }

/* Tab demo */
.tab-demo {
  width: 60px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.tab-demo-bar {
  display: flex;
  height: 10px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  gap: 2px;
  padding: 2px 2px 0;
}
.tab-demo-tab {
  flex: 1;
  background: var(--bg-panel-alt);
  border-radius: 2px 2px 0 0;
}
.tab-demo-tab.active-tab {
  background: var(--accent-dim);
}
.tab-demo-content {
  flex: 1;
  background: var(--bg);
}

.mode-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}
.mode-desc {
  font-size: 10px;
  color: var(--text-faint);
  line-height: 1.4;
}

/* ─── Setting controls ─── */
.setting-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.setting-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}

.setting-help {
  color: var(--text-faint);
  font-size: 11px;
}

.setting-select {
  background: var(--bg-panel-alt);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 10px;
  font-family: var(--font-mono);
  font-size: 11px;
  outline: none;
  transition: border-color 0.2s;
}
.setting-select:focus { border-color: var(--accent); }

.setting-checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  color: var(--text);
  font-size: 13px;
}

.setting-checkbox-label input[type=checkbox] {
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: var(--accent);
  flex-shrink: 0;
}

.help-chip {
  font-family: var(--font-mono);
  font-size: 10px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1px 5px;
  color: var(--text-faint);
  margin-left: auto;
}

/* ─── Danger zone ─── */
.danger-zone .btn-danger {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ─── Footer ─── */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  background: var(--bg-panel);
  position: sticky;
  bottom: 0;
}

.btn-small {
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--bg-panel-alt);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 7px 14px;
  font-size: 12px;
  cursor: pointer;
  font-family: var(--font-ui);
  transition: all 0.15s;
}
.btn-small:hover { border-color: var(--accent); color: #fff; }
.btn-small.btn-primary { background: var(--accent-dim); border-color: var(--accent); color: #fff; }
.btn-small.btn-primary:hover { background: var(--accent); }
.btn-small.btn-danger:hover { background: rgba(255,123,114,0.15); border-color: var(--red); color: var(--red); }
</style>
