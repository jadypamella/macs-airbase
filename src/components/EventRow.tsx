import { GlobeAltIcon } from '@heroicons/react/24/solid'
import { MAC_NAMES, SEVERITY_COLORS, SEVERITY_LABELS_SV } from '../constants'
import type { SwarmEvent } from '../constants'

interface EventRowProps {
  event: SwarmEvent
}

export function EventRow({ event }: EventRowProps) {
  const mac = MAC_NAMES[event.source]
  const severityColor = SEVERITY_COLORS[event.severity] || '#4b5563'
  const severitySv = SEVERITY_LABELS_SV[event.severity] || event.severity
  const time = new Date(event.timestamp * 1000).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const rowBg = event.severity === 'CRITICAL' ? 'bg-status-red/5'
    : event.event_type === 'ACTION_TAKEN' ? 'bg-ops/5'
    : ''

  return (
    <div className={`px-2 py-1.5 border-b border-white/5 animate-fade-in ${rowBg}`}>
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-[9px] text-text-dim font-mono">{time}</span>
        <div className="flex items-center gap-1">
          {mac ? (
            <mac.Icon className="w-3.5 h-3.5" style={{ color: mac.color }} />
          ) : (
            <GlobeAltIcon className="w-3.5 h-3.5 text-system" />
          )}
          <span className="text-[10px] font-bold tracking-wider" style={{ color: mac?.color || '#64748b' }}>
            {mac?.nameSv || 'SYSTEM'}
          </span>
        </div>
        <span
          className="text-[8px] font-bold tracking-wider px-1 py-0.5 ml-auto"
          style={{ color: severityColor, backgroundColor: `${severityColor}15` }}
        >
          {severitySv}
        </span>
      </div>
      <p className="text-[10px] text-text-muted leading-tight truncate">
        {event.payload?.message || event.event_type}
      </p>
    </div>
  )
}
