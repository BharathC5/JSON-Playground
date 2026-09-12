<script setup>
import { useWorkbench } from '../composables/useWorkbench'
import { showToast } from '../composables/useToast'
import { ref } from 'vue'

const { state, resetLayout } = useWorkbench()

// Create a local copy to edit before saving
const localSettings = ref({ ...state.settings })

const emit = defineEmits(['close', 'reset-layout'])

const saveSettings = () => {
  state.settings = { ...localSettings.value }
  showToast("Settings saved successfully!")
  emit('close')
}

const onResetLayout = () => {
  resetLayout()
  emit('reset-layout')
  showToast("Layout reset to default")
}
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-dialog">
      <div class="modal-header">
        <h2>Settings</h2>
        <button class="btn-icon" @click="$emit('close')">&times;</button>
      </div>
      <div class="modal-body">
        <div class="setting-group">
          <label class="setting-label">Array Access Pattern:</label>
          <select v-model="localSettings.arrayCopyMode" class="setting-select">
            <option value="raw">Raw Index Access (e.g., data.member[0].id)</option>
            <option value="forEach">Iteration: forEach (data.member.forEach(item => item.id))</option>
            <option value="map">Iteration: map (data.member.map(item => item.id))</option>
            <option value="forOf">Loop: for...of (for (const item of data.member) { item.id })</option>
          </select>
          <span class="setting-help">Determines how property paths inside arrays are formatted when copied or pushed to console.</span>
        </div>

        <div class="setting-group">
          <label class="setting-checkbox-label">
            <input type="checkbox" v-model="localSettings.optionalChaining" />
            Generate Safe Navigation / Optional Chaining (<code>?.</code>)
          </label>
        </div>

        <div class="setting-group">
          <label class="setting-checkbox-label">
            <input type="checkbox" v-model="localSettings.showMethodsInAutocomplete" />
            Show Prototype Methods in Console Autocomplete (.map, .filter, etc.)
          </label>
        </div>

        <div class="actions-group">
          <button @click="onResetLayout" class="btn-small btn-danger">
            Reset Layout Splitters
          </button>
          
          <div>
            <button @click="$emit('close')" class="btn-small" style="margin-right: 8px;">Cancel</button>
            <button @click="saveSettings" class="btn-small btn-primary">Save Settings</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
