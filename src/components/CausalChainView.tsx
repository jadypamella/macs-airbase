import { useState, useEffect } from 'react'
import { XMarkIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/solid'
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
      className={`shrink-0 w-[200px] px-3 py-2 border transition-all cursor-pointer hover:border-white/20 ${
        isFocused
          ? 'border-cyan-500/50 bg-cyan-500/10 ring-1 ring-cyan-500/30'
          : 'border-white/10 bg-surface-primary/80'
      }`}
      onClick={onClick}
      style={{ borderLeftWidth: 3, borderLeftColor: mac?.color || '#64748b' }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {mac && <mac.Icon className="w-3 h-3" style={{ color: mac.color }} />}
        <span className="text-[9px] font-bold tracking-wider" style={{ color: mac?.color || '#64748b' }}>
          {mac ? (lang === 'sv' ? mac.nameSv : mac.name) : evt.source}
        </span>
        <span
          className="text-[7px] font-bold tracking-wider px-1 py-px ml-auto"
          style={{ color: sevColor, background: `${sevColor}18` }}
        >
          {evt.severity}
        </span>
      </div>
      <p className="text-[9px] text-text-muted leading-tight line-clamp-2">
        {evt.payload?.message || evt.event_type}
      </p>
      <div className="flex items-center gap-2 mt-1 text-[8px] text-text-dim font-mono">
        <span>{evt.id}</span>
        <span>{evt.event_type}</span>
      </div>
    </div>
  )
}

function ArrowConnector({ direction }: { direction: 'right' | 'down' }) {
  if (direction === 'right') {
    return (
      <div className="shrink-0 flex items-center px-1">
        <div className="w-6 h-px bg-cyan-500/40" />
        <ArrowRightIcon className="w-3 h-3 text-cyan-500/60 -ml-1" />
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center py-1">
      <div className="w-px h-4 bg-cyan-500/40" />
      <svg className="w-3 h-3 text-cyan-500/60 -mt-0.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 16l-6-6h12l-6 6z" />
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-[90vw] max-w-[900px] max-h-[80vh] bg-surface-card border border-white/10 flex flex-col animate-fade-in">
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
            <div className="flex flex-col items-center gap-1">
              {/* Upstream label */}
              {chain.upstream.length > 0 && (
                <div className="text-[9px] font-bold tracking-[0.15em] text-text-dim uppercase mb-1 flex items-center gap-2">
                  <ArrowLeftIcon className="w-3 h-3" />
                  {lang === 'sv' ? 'UPPSTRÖMS (UTLÖSARE)' : 'UPSTREAM (TRIGGERS)'}
                </div>
              )}

              {/* Upstream events */}
              <div className="flex items-center gap-0 flex-wrap justify-center">
                {chain.upstream.map((evt, i) => (
                  <div key={evt.id} className="flex items-center">
                    <ChainNode evt={evt} onClick={() => fetchChain(evt.id)} />
                    {i < chain.upstream.length - 1 && <ArrowConnector direction="right" />}
                  </div>
                ))}
                {chain.upstream.length > 0 && <ArrowConnector direction="right" />}
              </div>

              {/* Focus event */}
              <div className="my-2">
                <ChainNode evt={chain.event} isFocused />
              </div>

              {/* Downstream events */}
              {chain.downstream.length > 0 && (
                <>
                  <div className="text-[9px] font-bold tracking-[0.15em] text-text-dim uppercase mb-1 flex items-center gap-2">
                    {lang === 'sv' ? 'NEDSTRÖMS (REAKTIONER)' : 'DOWNSTREAM (REACTIONS)'}
                    <ArrowRightIcon className="w-3 h-3" />
                  </div>
                  <div className="flex items-center gap-0 flex-wrap justify-center">
                    {chain.downstream.map((evt, i) => (
                      <div key={evt.id} className="flex items-center">
                        {i === 0 && <ArrowConnector direction="right" />}
                        <ChainNode evt={evt} onClick={() => fetchChain(evt.id)} />
                        {i < chain.downstream.length - 1 && <ArrowConnector direction="right" />}
                      </div>
                    ))}
                  </div>
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
