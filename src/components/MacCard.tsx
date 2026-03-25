import { motion } from 'framer-motion'
import { MAC_NAMES } from '../constants'
import { useLang } from '@/hooks/useLang'
import type { AgentState } from '../constants'

const MODE_COLORS: Record<string, string> = {
  gemini: '#a78bfa',
  claude: '#f97316',
  openrouter: '#22d3ee',
  mock: '#6b7280',
}

interface MacCardProps {
  agentId: string
  agent: AgentState
  mode?: string
  secondsSinceAction?: number
  onKill?: (agentId: string) => void
  onRevive?: (agentId: string) => void
  onOpenReasoning?: (agentId: string) => void
}

export function MacCard({ agentId, agent, mode, secondsSinceAction, onKill, onRevive, onOpenReasoning }: MacCardProps) {
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

  const lastActiveLabel = secondsSinceAction != null
    ? secondsSinceAction < 60
      ? `${Math.round(secondsSinceAction)}s ago`
      : `${Math.round(secondsSinceAction / 60)}m ago`
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
          <span className="text-xs font-bold tracking-wider text-text-primary uppercase">
            {lang === 'sv' ? mac.nameSv : mac.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* AI Mode badge */}
          {mode && (
            <span
              className="text-[7px] font-bold tracking-wider px-1 py-0.5 uppercase"
              style={{
                color: MODE_COLORS[mode] || '#6b7280',
                background: `${MODE_COLORS[mode] || '#6b7280'}20`,
                border: `1px solid ${MODE_COLORS[mode] || '#6b7280'}40`,
              }}
            >
              {mode}
            </span>
          )}
          {isOffline && <span className="w-2 h-2 rounded-full bg-status-red" />}
          {!isOffline && (agent?.status === 'online' || isActive) && <span className="w-2 h-2 rounded-full bg-status-green" />}
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
        {lastActiveLabel && <span className="text-[8px]">{lastActiveLabel}</span>}
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
        <button
          onClick={() => onOpenReasoning?.(agentId)}
          className="px-2.5 py-1 text-[9px] font-bold tracking-wider uppercase border rounded-sm transition-colors
            border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 ml-auto"
        >
          {lang === 'sv' ? 'BESLUT' : 'WHY?'}
        </button>
      </div>
    </motion.div>
  )
}
