import { useState, useCallback } from 'react'
import { getGraph, getHealth, getDiagnosis, repairMemory, getTimeline } from '../api/client'

export function useMemory() {
  const [graph, setGraph] = useState({ nodes: [], edges: [] })
  const [health, setHealth] = useState(null)
  const [diagnosis, setDiagnosis] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [g, h, d, t] = await Promise.all([
        getGraph(), getHealth(), getDiagnosis(), getTimeline(),
      ])
      setGraph(g.data)
      setHealth(h.data)
      setDiagnosis(d.data)
      setTimeline(t.data.events)
    } catch (e) {
      console.error('Memory refresh failed', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const repair = useCallback(async (diseaseId, action) => {
    try {
      const res = await repairMemory(diseaseId, action)
      await refresh()
      return res.data
    } catch (e) {
      console.error('Repair failed', e)
      return { message: 'Repair failed. Please try again.' }
    }
  }, [refresh])

  return { graph, health, diagnosis, timeline, loading, refresh, repair }
}
