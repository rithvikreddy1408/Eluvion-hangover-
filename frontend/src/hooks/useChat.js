import { useState, useCallback, useRef } from 'react'
import { sendChat, submitFeedback, addMemory } from '../api/client'

// Each mode gets its own stable session ID persisted in sessionStorage.
// These never cross-contaminate the backend's _session_histories dict.
function getSessionId(modeName) {
  const key = `eluvion_session_${modeName}`
  let id = sessionStorage.getItem(key)
  if (!id) {
    id = `sess_${modeName}_${Math.random().toString(36).slice(2, 10)}`
    sessionStorage.setItem(key, id)
  }
  return id
}

const EMPTY_CONV = () => ({ messages: [], loading: false, draft: '', lastRetrieval: [] })

export function useChat() {
  const [mode, setMode] = useState('hybrid')

  // Stable per-mode session IDs — never change after mount
  const sessionIds = useRef({
    general: getSessionId('general'),
    memory:  getSessionId('memory'),
    hybrid:  getSessionId('hybrid'),
  }).current

  // Three fully isolated conversation states
  const [conversations, setConversations] = useState({
    general: EMPTY_CONV(),
    memory:  EMPTY_CONV(),
    hybrid:  EMPTY_CONV(),
  })

  // Functional updater for a specific mode — safe against stale closures
  const patchConv = useCallback((m, fn) => {
    setConversations(prev => ({ ...prev, [m]: fn(prev[m]) }))
  }, [])

  const send = useCallback(async (text) => {
    const currentMode = mode
    const sessionId = sessionIds[currentMode]

    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      mode: currentMode,
    }

    patchConv(currentMode, conv => ({
      ...conv,
      messages: [...conv.messages, userMsg],
      loading: true,
      draft: '',
    }))

    try {
      const res = await sendChat(text, sessionId, currentMode)
      const {
        answer, retrieved_memories, retrieved_memory_ids,
        hallucination_risk, explanation, provenance,
      } = res.data

      const assistantMsg = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: answer,
        timestamp: new Date().toISOString(),
        retrievedCount: retrieved_memories?.length || 0,
        hallucinationRisk: hallucination_risk || null,
        retrievedMemoryIds: retrieved_memory_ids || [],
        userQuery: text,
        explanation: explanation || null,
        provenance: provenance || null,
        sessionId,
        mode: currentMode,
      }

      patchConv(currentMode, conv => ({
        ...conv,
        messages: [...conv.messages, assistantMsg],
        loading: false,
        lastRetrieval: retrieved_memories || [],
      }))
    } catch (e) {
      patchConv(currentMode, conv => ({
        ...conv,
        messages: [
          ...conv.messages,
          {
            id: crypto.randomUUID(),
            role: 'error',
            content: 'Failed to get response. Is the backend running?',
            timestamp: new Date().toISOString(),
          },
        ],
        loading: false,
      }))
    }
  }, [mode, sessionIds, patchConv])

  const sendFeedback = useCallback(async (msg, feedbackType, correction = null) => {
    if (!msg.retrievedMemoryIds?.length) return null
    try {
      const res = await submitFeedback(
        msg.retrievedMemoryIds,
        feedbackType,
        msg.userQuery || '',
        msg.sessionId || sessionIds[mode],
        correction,
      )
      return res.data
    } catch (e) {
      console.error('Feedback error', e)
      return null
    }
  }, [mode, sessionIds])

  const saveToMemory = useCallback(async (content, userQuery = '') => {
    try {
      // Include the user's original query as a tag so keyword recall can
      // match on the same terms the user will later search for.
      const queryTags = userQuery
        ? userQuery.toLowerCase().split(/\W+/).filter(w => w.length > 3)
        : []
      const res = await addMemory({
        content,
        subject: 'general_knowledge',
        tags: ['saved_from_general', 'user_approved', ...queryTags],
        type: 'fact',
        confidence: 0.85,
        source: 'general_mode_save',
      })
      return res.data
    } catch (e) {
      console.error('Save to memory failed', e)
      return null
    }
  }, [])

  const setDraft = useCallback((value) => {
    patchConv(mode, conv => ({ ...conv, draft: value }))
  }, [mode, patchConv])

  const activeConv = conversations[mode]

  return {
    messages:      activeConv.messages,
    loading:       activeConv.loading,
    draft:         activeConv.draft,
    setDraft,
    lastRetrieval: activeConv.lastRetrieval,
    send,
    sendFeedback,
    saveToMemory,
    sessionId:     sessionIds[mode],
    mode,
    setMode,
  }
}
