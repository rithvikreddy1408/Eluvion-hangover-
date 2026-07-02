import { useState, useEffect } from 'react'
import api from '../api/client'

export function useStatus() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    const fetch = () => api.get('/status').then(r => setStatus(r.data)).catch(() => {})
    fetch()
    const id = setInterval(fetch, 10000)
    return () => clearInterval(id)
  }, [])

  return status
}
