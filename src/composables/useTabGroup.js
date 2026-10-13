// ─── "Group me together" Easter egg ──────────────────────────────────────────
// Web pages cannot touch the browser's real tab strip (that needs an extension
// with the `tabs` / `tabGroups` permission). What a page CAN do is talk to every
// other tab of the same origin via BroadcastChannel. So this "groups" all open
// JSONLens tabs by gathering their JSON into this tab's JSON Entries.

import { useWorkbench } from './useWorkbench'
import { showToast } from './useToast'

const CHANNEL = 'jsonlens-tabs-v1'
const TAB_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
let channel = null

function ensureChannel() {
  if (channel || typeof BroadcastChannel === 'undefined') return channel
  const { state } = useWorkbench()
  channel = new BroadcastChannel(CHANNEL)

  channel.onmessage = (e) => {
    const msg = e.data || {}
    if (msg.from === TAB_ID) return

    // Someone is gathering — report our JSON back to them
    if (msg.type === 'ping') {
      channel.postMessage({
        type: 'pong',
        from: TAB_ID,
        to: msg.from,
        rootVarName: state.rootVarName || 'data',
        text: state.jsonInputText || '',
      })
    }

    // We've been gathered into another tab
    if (msg.type === 'gathered' && Array.isArray(msg.ids) && msg.ids.includes(TAB_ID)) {
      showToast('🧲 This tab was grouped into another JSONLens tab — safe to close')
    }
  }
  return channel
}

export function useTabGroup() {
  ensureChannel()

  const groupAllTabs = (timeoutMs = 600) => new Promise((resolve) => {
    const ch = ensureChannel()
    if (!ch) {
      showToast('Your browser does not support tab messaging')
      return resolve(0)
    }
    const { saveToCache } = useWorkbench()
    const replies = []

    const onReply = (e) => {
      const msg = e.data || {}
      if (msg.type === 'pong' && msg.to === TAB_ID) replies.push(msg)
    }
    ch.addEventListener('message', onReply)
    ch.postMessage({ type: 'ping', from: TAB_ID })

    setTimeout(() => {
      ch.removeEventListener('message', onReply)
      let saved = 0
      for (const r of replies) {
        if (!r.text || !r.text.trim()) continue
        try { JSON.parse(r.text) } catch { continue }
        saveToCache(r.rootVarName, r.text)
        saved++
      }
      if (replies.length === 0) {
        showToast('No other JSONLens tabs found')
      } else {
        ch.postMessage({ type: 'gathered', from: TAB_ID, ids: replies.map(r => r.from) })
        showToast(`🧲 Grouped ${replies.length} tab${replies.length === 1 ? '' : 's'} → ${saved} added to JSON Entries`)
      }
      resolve(replies.length)
    }, timeoutMs)
  })

  return { groupAllTabs }
}
