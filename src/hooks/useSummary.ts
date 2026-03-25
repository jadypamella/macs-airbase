import { useState, useEffect, useRef } from 'react'
import { useApiProxy } from './useApiProxy'

export interface SummaryAgent {
  status: string
  alive: boolean
  seconds_since_action: number
  mode: string
}

export interface SummaryDomain {
  total_events: number
  events_5min: number
  events_30min: number
  compensations: number
  last_event_age_s: number
}

export interface SummaryMission {
  id: string
  name: string
  priority: string
  domain: string
  status: string
}

export interface SummaryData {
  timestamp: number
  overall: {
    total_events: number
    by_domain: Record<string, number>
    by_severity: Record<string, number>
  }
  severity_5min: Record<string, number>
  domains: Record<string, SummaryDomain>
  agents: Record<string, SummaryAgent>
  missions: {
    active: number
    list: SummaryMission[]
  }
}

export function useSummary(intervalMs = 10000) {
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const { call } = useApiProxy()
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    const fetch = async () => {
      const data = await call<SummaryData>('/api/summary')
      if (data) setSummary(data)
    }
    fetch()
    intervalRef.current = setInterval(fetch, intervalMs)
    return () => clearInterval(intervalRef.current)
  }, [call, intervalMs])

  return summary
}
