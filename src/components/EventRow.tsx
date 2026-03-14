import { useState } from 'react'
import { GlobeAltIcon } from '@heroicons/react/24/solid'
import { MAC_NAMES, SEVERITY_COLORS, SEVERITY_LABELS_SV } from '../constants'
import { useLang } from '@/hooks/useLang'
import type { SwarmEvent } from '../constants'

const SEVERITY_LABELS_EN: Record<string, string> = {
  CRITICAL: 'CRITICAL', HIGH: 'HIGH', AMBER: 'AMBER',
  MEDIUM: 'MEDIUM', LOW: 'LOW', INFO: 'INFO',
}

interface EventRowProps {
  event: SwarmEvent
  onClick?: (event: SwarmEvent) => void
  expanded?: boolean
}

export function EventRow({ event, onClick, expanded = false }: EventRowProps) {
  const { lang } = useLang()
  const mac = MAC_NAMES[event.source]
  const severityColor = SEVERITY_COLORS[event.severity] || '#4b5563'
  const severityLabel = lang === 'sv'
    ? (SEVERITY_LABELS_SV[event.severity] || event.severity)
    : (SEVERITY_LABELS_EN[event.severity] || event.severity)
  const time = new Date(event.timestamp * 1000).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const message = event.payload?.message || event.event_type

  const rowBg = event.severity === 'CRITICAL' ? 'bg-status-red/5'
    : event.event_type === 'ACTION_TAKEN' ? 'bg-ops/5'
    : ''

  return (
    <div
      className={`px-2 py-1.5 border-b border-white/5 animate-fade-in cursor-pointer hover:bg-white/5 transition-colors ${rowBg} ${expanded ? 'bg-white/5 ring-1 ring-cyan-500/20' : ''}`}
      onClick={() => onClick?.(event)}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-[9px] text-text-dim font-mono">{time}</span>
        <div className="flex items-center gap-1">
          {mac ? (
            <mac.Icon className="w-3.5 h-3.5" style={{ color: mac.color }} />
          ) : (
            <GlobeAltIcon className="w-3.5 h-3.5 text-system" />
          )}
          <span className="text-[10px] font-bold tracking-wider" style={{ color: mac?.color || '#64748b' }}>
            {mac ? (lang === 'sv' ? mac.nameSv : mac.name) : 'SYSTEM'}
          </span>
        </div>
        <span
          className="text-[8px] font-bold tracking-wider px-1 py-0.5 ml-auto"
          style={{ color: severityColor, backgroundColor: `${severityColor}15` }}
        >
          {severityLabel}
        </span>
      </div>
      <p className={`text-[10px] text-text-muted leading-tight ${expanded ? 'whitespace-pre-wrap' : 'truncate'}`}>
        {message}
      </p>
      {expanded && (
        <div className="flex gap-3 mt-1 text-[8px] text-text-dim">
          <span>{event.event_type}</span>
          <span>{event.domain}</span>
          {event.tags?.length ? <span>{event.tags.join(', ')}</span> : null}
        </div>
      )}
    </div>
  )
}
