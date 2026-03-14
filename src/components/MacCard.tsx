import { motion } from 'framer-motion'
import { MAC_NAMES } from '../constants'
import { useLang } from '@/hooks/useLang'
import type { AgentState } from '../constants'

interface MacCardProps {
  agentId: string
  agent: AgentState
  onKill?: (agentId: string) => void
  onRevive?: (agentId: string) => void
}

export function MacCard({ agentId, agent, onKill, onRevive }: MacCardProps) {
  const { lang } = useLang()
  const mac = MAC_NAMES[agentId]
  if (!mac) return null
  const Icon = mac.Icon

  const isOffline = agent?.status === 'offline'
  const isActive = agent?.status === 'active'

  const statusLabel = isOffline ? 'OFFLINE'
    : isActive ? (lang === 'sv' ? 'AKTIV' : 'ACTIVE')
    : agent?.status === 'online' ? 'ONLINE'
    : (lang === 'sv' ? 'VÄNTAR' : 'WAITING')

  const statusColor = isOffline ? 'text-status-red'
    : isActive ? 'text-ops'
    : agent?.status === 'online' ? 'text-status-green'
    : 'text-text-dim'

  return (
    <motion.div
      layout
      className={`bg-surface-card border border-white/5 p-3 transition-opacity ${isOffline ? 'opacity-50' : ''}`}
      style={{ borderLeftColor: mac.color, borderLeftWidth: 3 }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color: mac.color }} />
          <span className="text-xs font-bold tracking-wider text-text-primary uppercase">
            {lang === 'sv' ? mac.nameSv : mac.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {isOffline && (
            <span className="w-2 h-2 rounded-full bg-status-red" />
          )}
          {!isOffline && (agent?.status === 'online' || isActive) && (
            <span className="w-2 h-2 rounded-full bg-status-green" />
          )}
          <span className={`text-[9px] font-bold tracking-wider ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {!isOffline && (
        <p className="text-[10px] text-text-muted leading-tight italic mb-1.5">
          {lang === 'sv' ? mac.taglineSv : mac.tagline}
        </p>
      )}

      <div className="flex items-center justify-between text-[9px] text-text-dim mb-2">
        <span>Actions: {agent?.actionCount ?? 0}</span>
      </div>

      <div className="flex gap-1.5">
        <button
          onClick={() => onKill?.(agentId)}
          disabled={isOffline}
          className="px-2.5 py-1 text-[9px] font-bold tracking-wider uppercase border rounded-sm transition-colors
            border-status-red/40 text-status-red hover:bg-status-red/10 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          KILL
        </button>
        <button
          onClick={() => onRevive?.(agentId)}
          disabled={!isOffline}
          className="px-2.5 py-1 text-[9px] font-bold tracking-wider uppercase border rounded-sm transition-colors
            border-status-green/40 text-status-green hover:bg-status-green/10 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          REVIVE
        </button>
      </div>
    </motion.div>
  )
}
