import { ShieldExclamationIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid'
import { useLang } from '@/hooks/useLang'

interface HeaderProps {
  scenario: string | null
  threatLevel: string
  connected: boolean
  eventCount: number
  criticalCount: number
}

const SCENARIO_NAMES: Record<string, { sv: string; en: string }> = {
  surge: { sv: 'UPPDRAGSSURGE', en: 'SORTIE SURGE' },
  scramble: { sv: 'BEREDSKAPSSTART', en: 'CAP SCRAMBLE' },
  disperse: { sv: 'NÖDSPRIDNING', en: 'BASE DISPERSAL' },
}

const THREAT_COLORS: Record<string, { text: string; bg: string; glow: string }> = {
  GREEN: { text: 'text-status-green', bg: 'bg-status-green/10', glow: '' },
  AMBER: { text: 'text-status-amber', bg: 'bg-status-amber/10', glow: 'animate-glow-amber' },
  RED:   { text: 'text-status-red', bg: 'bg-status-red/10', glow: 'animate-glow-critical' },
}

const THREAT_LABELS: Record<string, { sv: string; en: string }> = {
  GREEN: { sv: 'GRÖN', en: 'GREEN' },
  AMBER: { sv: 'AMBER', en: 'AMBER' },
  RED:   { sv: 'RÖD', en: 'RED' },
}

export function Header({ scenario, threatLevel, connected, eventCount, criticalCount }: HeaderProps) {
  const { lang, toggle } = useLang()
  const tc = THREAT_COLORS[threatLevel] || THREAT_COLORS.GREEN
  const tl = THREAT_LABELS[threatLevel] || THREAT_LABELS.GREEN

  const scenarioLabel = scenario
    ? (SCENARIO_NAMES[scenario]?.[lang] || scenario)
    : (lang === 'sv' ? 'VÄNTAR PÅ SCENARIO' : 'AWAITING SCENARIO')

  return (
    <header className="h-[50px] bg-surface-primary border-b border-white/5 flex items-center px-4 gap-4 shrink-0">
      <img src="/macs_logo_white.png" alt="MACS AirBase" className="h-7" />

      <span className="text-status-amber text-[11px] font-bold tracking-[0.15em] uppercase ml-2">
        {scenarioLabel}
      </span>

      <div className="flex-1" />

      {/* Threat Level */}
      <div className={`flex items-center gap-2 px-3 py-1 ${tc.bg} ${tc.glow}`}>
        <ShieldExclamationIcon className={`w-5 h-5 ${tc.text}`} />
        <div>
          <div className={`text-[10px] font-bold tracking-[0.15em] ${tc.text}`}>
            {lang === 'sv' ? 'HOTBILDSNIVÅ' : 'THREAT LEVEL'}
          </div>
          <div className={`text-sm font-bold ${tc.text}`}>
            {tl[lang]}
          </div>
        </div>
      </div>

      {criticalCount > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-status-red/20 animate-glow-critical">
          <ExclamationTriangleIcon className="w-4 h-4 text-status-red" />
          <span className="text-xs font-bold text-status-red">
            {criticalCount} {lang === 'sv' ? 'KRITISK' : 'CRITICAL'}
          </span>
        </div>
      )}

      <span className="text-[10px] text-text-muted tracking-wider">
        {eventCount} {lang === 'sv' ? 'HÄNDELSER' : 'EVENTS'}
      </span>

      {/* Connection */}
      <div className="flex items-center gap-1.5">
        {connected ? (
          <>
            <CheckCircleIcon className="w-4 h-4 text-status-green" />
            <span className="text-[10px] text-status-green tracking-wider font-bold">
              {lang === 'sv' ? 'ANSLUTEN' : 'CONNECTED'}
            </span>
          </>
        ) : (
          <>
            <ExclamationTriangleIcon className="w-4 h-4 text-status-red animate-threat-blink" />
            <span className="text-[10px] text-status-red tracking-wider font-bold">
              {lang === 'sv' ? 'FRÅNKOPPLAD' : 'DISCONNECTED'}
            </span>
          </>
        )}
      </div>

      {/* Language toggle */}
      <button
        onClick={toggle}
        className="ml-2 px-2 py-1 border border-white/10 hover:border-white/30 transition-colors flex items-center gap-1.5 bg-surface-card"
        title={lang === 'sv' ? 'Switch to English' : 'Byt till svenska'}
      >
        <span className="text-base leading-none">{lang === 'sv' ? '🇺🇸' : '🇸🇪'}</span>
        <span className="text-[9px] font-bold tracking-wider text-text-muted">
          {lang === 'sv' ? 'EN' : 'SV'}
        </span>
      </button>
    </header>
  )
}
