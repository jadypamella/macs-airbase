import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/solid'
import { useApiProxy } from '@/hooks/useApiProxy'
import { MAC_NAMES, SEVERITY_COLORS } from '@/constants'
import { useLang } from '@/hooks/useLang'

interface ReasoningData {
  agent_id: string
  reasoning: {
    timestamp: number
    input_event_ids: string[]
    input_event_summaries: Array<{
      id: string
      type: string
      source: string
      domain: string
      severity: string
      message: string
    }>
    decision: {
      action: boolean
      event_type: string
      severity: string
      message: string
      references: string[]
    }
    acted: boolean
  }
}

interface Props {
  agentId: string
  onClose: () => void
  onOpenChain?: (eventId: string) => void
}

export function AgentReasoningDrawer({ agentId, onClose, onOpenChain }: Props) {
  const { lang } = useLang()
  const { call } = useApiProxy()
  const [data, setData] = useState<ReasoningData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mac = MAC_NAMES[agentId]

  useEffect(() => {
    setLoading(true)
    setError(null)
    call<ReasoningData>(`/api/agents/${agentId}/reasoning`).then(res => {
      if (res) setData(res)
      else setError('No reasoning data available')
      setLoading(false)
    })
  }, [agentId, call])

  const reasoning = data?.reasoning

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer panel */}
      <div className="relative w-[380px] max-w-full h-full bg-surface-card border-l border-white/10 flex flex-col animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10" style={{ borderLeftWidth: 3, borderLeftColor: mac?.color }}>
          {mac && <mac.Icon className="w-5 h-5" style={{ color: mac.color }} />}
          <div className="flex-1">
            <div className="text-xs font-bold tracking-[0.15em] text-text-primary uppercase">
              {lang === 'sv' ? 'BESLUTSKONTEXT' : 'REASONING CONTEXT'}
            </div>
            <div className="text-[10px] text-text-muted">
              {mac ? (lang === 'sv' ? mac.nameSv : mac.name) : agentId}
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 transition-colors">
            <XMarkIcon className="w-4 h-4 text-text-dim" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="text-[10px] text-text-dim text-center py-8 animate-pulse">
              {lang === 'sv' ? 'Hämtar beslutsdata...' : 'Fetching reasoning data...'}
            </div>
          )}

          {error && !loading && (
            <div className="text-[10px] text-text-dim text-center py-8">{error}</div>
          )}

          {reasoning && !loading && (
            <>
              {/* Timestamp */}
              <div className="text-[9px] text-text-dim font-mono">
                {new Date(reasoning.timestamp * 1000).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                {' — '}
                {reasoning.acted
                  ? <span className="text-status-green font-bold">{lang === 'sv' ? 'AGERADE' : 'ACTED'}</span>
                  : <span className="text-text-dim font-bold">{lang === 'sv' ? 'PASSADE' : 'PASSED'}</span>
                }
              </div>

              {/* Triggered by */}
              <div>
                <div className="text-[9px] font-bold tracking-[0.15em] text-text-muted uppercase mb-2">
                  {lang === 'sv' ? 'UTLÖSTES AV' : 'TRIGGERED BY'}
                </div>
                <div className="space-y-1.5">
                  {reasoning.input_event_summaries.map(evt => {
                    const srcMac = MAC_NAMES[evt.source]
                    return (
                      <div
                        key={evt.id}
                        className="px-2 py-1.5 bg-surface-primary/60 border border-white/5 cursor-pointer hover:border-white/15 transition-colors"
                        onClick={() => onOpenChain?.(evt.id)}
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          {srcMac && <srcMac.Icon className="w-3 h-3" style={{ color: srcMac.color }} />}
                          <span className="text-[9px] font-bold tracking-wider" style={{ color: srcMac?.color || '#64748b' }}>
                            {srcMac ? (lang === 'sv' ? srcMac.nameSv : srcMac.name) : evt.source}
                          </span>
                          <span
                            className="text-[7px] font-bold tracking-wider px-1 py-px ml-auto"
                            style={{ color: SEVERITY_COLORS[evt.severity], background: `${SEVERITY_COLORS[evt.severity]}18` }}
                          >
                            {evt.severity}
                          </span>
                        </div>
                        <p className="text-[9px] text-text-muted leading-tight truncate">{evt.message}</p>
                        <div className="text-[8px] text-text-dim mt-0.5 font-mono">{evt.id}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Decision */}
              <div>
                <div className="text-[9px] font-bold tracking-[0.15em] text-text-muted uppercase mb-2">
                  {lang === 'sv' ? 'BESLUT' : 'DECISION'}
                </div>
                <div
                  className="px-3 py-2 border-l-2"
                  style={{
                    borderLeftColor: SEVERITY_COLORS[reasoning.decision.severity] || '#64748b',
                    background: `${SEVERITY_COLORS[reasoning.decision.severity] || '#64748b'}08`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-bold tracking-wider text-text-primary">{reasoning.decision.event_type}</span>
                    <span
                      className="text-[7px] font-bold tracking-wider px-1 py-px"
                      style={{ color: SEVERITY_COLORS[reasoning.decision.severity], background: `${SEVERITY_COLORS[reasoning.decision.severity]}18` }}
                    >
                      {reasoning.decision.severity}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-muted leading-relaxed">{reasoning.decision.message}</p>
                </div>
              </div>

              {/* References → Chain links */}
              {reasoning.decision.references.length > 0 && (
                <div>
                  <div className="text-[9px] font-bold tracking-[0.15em] text-text-muted uppercase mb-2">
                    {lang === 'sv' ? 'REFERENSER (klicka för kedjevy)' : 'REFERENCES (click for chain view)'}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {reasoning.decision.references.map(ref => (
                      <button
                        key={ref}
                        onClick={() => onOpenChain?.(ref)}
                        className="px-2 py-1 text-[9px] font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors"
                      >
                        {ref} →
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
