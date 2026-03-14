import { ShieldExclamationIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid'

interface HeaderProps {
  scenario: string | null
  threatLevel: string
  connected: boolean
  eventCount: number
  criticalCount: number
}

const SCENARIO_NAMES_SV: Record<string, string> = {
  surge: 'UPPDRAGSSURGE / Sortie Surge',
  scramble: 'BEREDSKAPSSTART / CAP Scramble',
  disperse: 'NÖDSPRIDNING / Base Dispersal',
}

const THREAT_COLORS: Record<string, { text: string; bg: string; glow: string }> = {
  GREEN: { text: 'text-status-green', bg: 'bg-status-green/10', glow: '' },
  AMBER: { text: 'text-status-amber', bg: 'bg-status-amber/10', glow: 'animate-glow-amber' },
  RED:   { text: 'text-status-red', bg: 'bg-status-red/10', glow: 'animate-glow-critical' },
}

const THREAT_LABELS: Record<string, string> = {
  GREEN: 'GRÖN / GREEN',
  AMBER: 'AMBER',
  RED:   'RÖD / RED',
}

export function Header({ scenario, threatLevel, connected, eventCount, criticalCount }: HeaderProps) {
  const tc = THREAT_COLORS[threatLevel] || THREAT_COLORS.GREEN

  return (
    <header className="h-[50px] bg-surface-primary border-b border-white/5 flex items-center px-4 gap-4 shrink-0">
      {/* Logo */}
      <img src="/macs_logo_white.png" alt="MACS AirBase" className="h-7" />

      {/* Scenario */}
      <span className="text-status-amber text-[11px] font-bold tracking-[0.15em] uppercase ml-2">
        {scenario ? (SCENARIO_NAMES_SV[scenario] || scenario) : 'VÄNTAR PÅ SCENARIO / AWAITING SCENARIO'}
      </span>

      <div className="flex-1" />

      {/* Threat Level */}
      <div className={`flex items-center gap-2 px-3 py-1 ${tc.bg} ${tc.glow}`}>
        <ShieldExclamationIcon className={`w-5 h-5 ${tc.text}`} />
        <div>
          <div className={`text-[10px] font-bold tracking-[0.15em] ${tc.text}`}>
            HOTBILDSNIVÅ / THREAT LEVEL
          </div>
          <div className={`text-sm font-bold ${tc.text}`}>
            {THREAT_LABELS[threatLevel] || threatLevel}
          </div>
        </div>
      </div>

      {/* Critical badge */}
      {criticalCount > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-status-red/20 animate-glow-critical">
          <ExclamationTriangleIcon className="w-4 h-4 text-status-red" />
          <span className="text-xs font-bold text-status-red">{criticalCount} KRITISK</span>
        </div>
      )}

      {/* Event count */}
      <span className="text-[10px] text-text-muted tracking-wider">{eventCount} HÄNDELSER</span>

      {/* Connection */}
      <div className="flex items-center gap-1.5">
        {connected ? (
          <>
            <CheckCircleIcon className="w-4 h-4 text-status-green" />
            <span className="text-[10px] text-status-green tracking-wider font-bold">ANSLUTEN</span>
            <span className="text-[9px] text-text-dim">Connected</span>
          </>
        ) : (
          <>
            <ExclamationTriangleIcon className="w-4 h-4 text-status-red animate-threat-blink" />
            <span className="text-[10px] text-status-red tracking-wider font-bold">FRÅNKOPPLAD</span>
            <span className="text-[9px] text-text-dim">Disconnected</span>
          </>
        )}
      </div>
    </header>
  )
}
