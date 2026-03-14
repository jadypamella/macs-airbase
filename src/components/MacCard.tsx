import { motion } from 'framer-motion'
import { MAC_NAMES } from '../constants'
import type { AgentState } from '../constants'

interface MacCardProps {
  agentId: string
  agent: AgentState
}

export function MacCard({ agentId, agent }: MacCardProps) {
  const mac = MAC_NAMES[agentId]
  if (!mac) return null
  const Icon = mac.Icon

  const isOffline = agent?.status === 'offline'
  const isActive = agent?.status === 'active'

  const statusLabel = isOffline ? 'OFFLINE'
    : isActive ? 'AKTIV / Active'
    : agent?.status === 'online' ? 'ONLINE'
    : 'VÄNTAR / Waiting'

  const statusColor = isOffline ? 'text-status-red'
    : isActive ? 'text-ops'
    : agent?.status === 'online' ? 'text-status-green'
    : 'text-text-dim'

  const elapsed = agent?.lastSeen
    ? Math.round(Date.now() / 1000 - agent.lastSeen)
    : null

  return (
    <motion.div
      layout
      className={`bg-surface-card border border-white/5 p-3 transition-opacity ${isOffline ? 'opacity-50' : ''}`}
      style={{ borderLeftColor: mac.color, borderLeftWidth: 3 }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color: mac.color }} />
          <span className="text-xs font-bold tracking-wider text-text-primary uppercase">{mac.nameSv}</span>
        </div>
        <span className={`text-[9px] font-bold tracking-wider ${statusColor}`}>
          {statusLabel}
        </span>
      </div>
      {!isOffline && (
        <p className="text-[10px] text-text-muted leading-tight mb-1.5">{mac.taglineSv}</p>
      )}
      <div className="flex items-center justify-between text-[9px] text-text-dim">
        <span>ÅTGÄRDER: {agent?.actionCount ?? 0}</span>
        {elapsed !== null && <span>SENAST: {elapsed}s</span>}
      </div>
    </motion.div>
  )
}
