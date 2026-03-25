import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/solid'
import { useApiProxy } from '@/hooks/useApiProxy'
import { MAC_NAMES, SEVERITY_COLORS } from '@/constants'
import { useLang } from '@/hooks/useLang'

interface ChainEvent {
  id: string
  source: string
  event_type: string
  domain: string
  severity: string
  timestamp?: number
  payload?: { message?: string }
}

interface ChainData {
  event: ChainEvent
  upstream: ChainEvent[]
  downstream: ChainEvent[]
  chain_length: number
}

interface Props {
  eventId: string
  onClose: () => void
}

function ChainNode({ evt, isFocused, onClick }: { evt: ChainEvent; isFocused?: boolean; onClick?: () => void }) {
  const { lang } = useLang()
  const mac = MAC_NAMES[evt.source]
  const sevColor = SEVERITY_COLORS[evt.severity] || '#64748b'

  return (
    <div
      className={`w-full max-w-[420px] px-4 py-3 border transition-all cursor-pointer hover:border-white/20 ${
        isFocused
          ? 'border-cyan-500/50 bg-cyan-500/10 ring-1 ring-cyan-500/30 scale-[1.02]'
          : 'border-white/10 bg-surface-primary/80'
      }`}
      onClick={onClick}
      style={{ borderLeftWidth: 3, borderLeftColor: mac?.color || '#64748b' }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        {mac && <mac.Icon className="w-3.5 h-3.5" style={{ color: mac.color }} />}
        <span className="text-[10px] font-bold tracking-wider" style={{ color: mac?.color || '#64748b' }}>
          {mac ? (lang === 'sv' ? mac.nameSv : mac.name) : evt.source}
        </span>
        <span
          className="text-[8px] font-bold tracking-wider px-1.5 py-0.5 ml-auto"
          style={{ color: sevColor, background: `${sevColor}18` }}
        >
          {evt.severity}
        </span>
      </div>
      <p className="text-[10px] text-text-muted leading-relaxed line-clamp-2">
        {evt.payload?.message || evt.event_type}
      </p>
      <div className="flex items-center gap-3 mt-1.5 text-[8px] text-text-dim font-mono">
        <span>{evt.id}</span>
        <span>{evt.event_type}</span>
      </div>
    </div>
  )
}

function VerticalConnector({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-px h-5 bg-cyan-500/30" />
      {label && (
        <div className="text-[8px] font-bold tracking-[0.15em] text-text-dim uppercase px-2 py-0.5 bg-surface-primary/60 border border-white/5">
          {label}
        </div>
      )}
      <div className="w-px h-3 bg-cyan-500/30" />
      <svg className="w-3 h-3 text-cyan-500/50 -mt-0.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 18l-6-6h12l-6 6z" />
      </svg>
    </div>
  )
}

export function CausalChainView({ eventId, onClose }: Props) {
  const { lang } = useLang()
  const { call } = useApiProxy()
  const [chain, setChain] = useState<ChainData | null>(null)
  const [loading, setLoading] = useState(true)
  const [focusId, setFocusId] = useState(eventId)

  const fetchChain = (eid: string) => {
    setLoading(true)
    setFocusId(eid)
    call<ChainData>(`/api/events/${eid}/chain`).then(res => {
      if (res) setChain(res)
      setLoading(false)
    })
  }

  useEffect(() => {
    fetchChain(eventId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-[90vw] max-w-[520px] max-h-[85vh] bg-surface-card border border-white/10 flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <div className="flex-1">
            <div className="text-xs font-bold tracking-[0.15em] text-text-primary uppercase">
              {lang === 'sv' ? 'KAUSAL KEDJA' : 'CAUSAL CHAIN'}
            </div>
            <div className="text-[10px] text-text-muted font-mono">
              {focusId}
              {chain && <span className="ml-2 text-text-dim">({lang === 'sv' ? 'kedjelängd' : 'chain length'}: {chain.chain_length})</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 transition-colors">
            <XMarkIcon className="w-4 h-4 text-text-dim" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading && (
            <div className="text-[10px] text-text-dim text-center py-8 animate-pulse">
              {lang === 'sv' ? 'Hämtar kedjedata...' : 'Fetching chain data...'}
            </div>
          )}

          {chain && !loading && (
            <div className="flex flex-col items-center gap-0">
              {/* Upstream events */}
              {chain.upstream.length > 0 && (
                <>
                  <div className="text-[9px] font-bold tracking-[0.15em] text-text-dim uppercase mb-2">
                    {lang === 'sv' ? 'UPPSTRÖMS (UTLÖSARE)' : 'UPSTREAM (TRIGGERS)'}
                  </div>
                  {chain.upstream.map((evt, i) => (
                    <div key={evt.id} className="flex flex-col items-center w-full">
                      <ChainNode evt={evt} onClick={() => fetchChain(evt.id)} />
                      {i < chain.upstream.length - 1 && <VerticalConnector />}
                    </div>
                  ))}
                  <VerticalConnector label={lang === 'sv' ? 'UTLÖSTE' : 'TRIGGERED'} />
                </>
              )}

              {/* Focus event */}
              <ChainNode evt={chain.event} isFocused />

              {/* Downstream events */}
              {chain.downstream.length > 0 && (
                <>
                  <VerticalConnector label={lang === 'sv' ? 'ORSAKADE' : 'CAUSED'} />
                  <div className="text-[9px] font-bold tracking-[0.15em] text-text-dim uppercase mb-2">
                    {lang === 'sv' ? 'NEDSTRÖMS (REAKTIONER)' : 'DOWNSTREAM (REACTIONS)'}
                  </div>
                  {chain.downstream.map((evt, i) => (
                    <div key={evt.id} className="flex flex-col items-center w-full">
                      <ChainNode evt={evt} onClick={() => fetchChain(evt.id)} />
                      {i < chain.downstream.length - 1 && <VerticalConnector />}
                    </div>
                  ))}
                </>
              )}

              {chain.upstream.length === 0 && chain.downstream.length === 0 && (
                <div className="text-[10px] text-text-dim text-center py-4">
                  {lang === 'sv' ? 'Ingen kedja hittad — denna händelse är isolerad.' : 'No chain found — this event is isolated.'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
