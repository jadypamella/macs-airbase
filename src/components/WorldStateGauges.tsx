import {
  BoltIcon,
  WrenchScrewdriverIcon, ShieldExclamationIcon, SignalIcon
} from '@heroicons/react/24/solid'
import { Fuel, Gauge } from 'lucide-react'
import { useLang } from '@/hooks/useLang'
import type { WorldState } from '../constants'

interface WorldStateGaugesProps {
  worldState: WorldState | null
  criticalCount?: number
}

// Reusable jet SVG icon component matching the map aircraft markers
function JetIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3L11 7L11 9L4 13L4 15L11 13L11 17L8 19L8 21L12 19.5L16 21L16 19L13 17L13 13L20 15L20 13L13 9L13 7L12 3Z"
        fill="currentColor"
      />
    </svg>
  )
}

// Wrapper to make lucide icons compatible with the gauge interface
function FuelIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const color = style?.color as string | undefined
  return <Fuel className={className} style={style} color={color} size={16} />
}

function ReadinessIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const color = style?.color as string | undefined
  return <Gauge className={className} style={style} color={color} size={16} />
}

interface GaugeDef {
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  labelSv: string
  labelEn: string
  getValue: (ws: WorldState, cc?: number) => string
  getColor: (ws: WorldState, cc?: number) => string
  getPct: (ws: WorldState, cc?: number) => number
}

const GAUGES: GaugeDef[] = [
  {
    Icon: ReadinessIcon, labelSv: 'BEREDSKAP', labelEn: 'READINESS',
    getValue: ws => `${ws.sorties?.readiness_pct ?? '--'}%`,
    getColor: ws => { const v = ws.sorties?.readiness_pct ?? 100; return v < 40 ? '#ef4444' : v < 60 ? '#f59e0b' : '#22c55e' },
    getPct: ws => ws.sorties?.readiness_pct ?? 0,
  },
  {
    Icon: JetIcon, labelSv: 'FLYGPLAN', labelEn: 'AIRCRAFT',
    getValue: ws => `${ws.sorties?.aircraft_serviceable ?? '-'}/${ws.sorties?.aircraft_total ?? '-'}`,
    getColor: ws => { const v = ws.sorties?.aircraft_serviceable ?? 6; return v < 2 ? '#ef4444' : v < 4 ? '#f59e0b' : '#22c55e' },
    getPct: ws => ((ws.sorties?.aircraft_serviceable ?? 0) / (ws.sorties?.aircraft_total || 6)) * 100,
  },
  {
    Icon: FuelIcon, labelSv: 'JP-8 BRÄNSLE', labelEn: 'JP-8 FUEL',
    getValue: ws => `${ws.fuel?.level_pct ?? '--'}%`,
    getColor: ws => { const v = ws.fuel?.level_pct ?? 100; return v < 20 ? '#ef4444' : v < 40 ? '#f59e0b' : '#22c55e' },
    getPct: ws => ws.fuel?.level_pct ?? 0,
  },
  {
    Icon: BoltIcon, labelSv: 'AMMUNITION', labelEn: 'ORDNANCE',
    getValue: ws => `${ws.arming?.ordnance_ready_pct ?? '--'}%`,
    getColor: ws => { const v = ws.arming?.ordnance_ready_pct ?? 100; return v < 30 ? '#ef4444' : v < 60 ? '#f59e0b' : '#22c55e' },
    getPct: ws => ws.arming?.ordnance_ready_pct ?? 0,
  },
  {
    Icon: WrenchScrewdriverIcon, labelSv: 'MARKBUNDNA', labelEn: 'GROUNDED',
    getValue: ws => `${ws.maintenance?.grounded ?? 0}`,
    getColor: ws => { const v = ws.maintenance?.grounded ?? 0; return v > 2 ? '#ef4444' : v > 1 ? '#f59e0b' : '#22c55e' },
    getPct: ws => Math.min((ws.maintenance?.grounded ?? 0) * 25, 100),
  },
  {
    Icon: ShieldExclamationIcon, labelSv: 'HOTBILD', labelEn: 'THREAT',
    getValue: (ws, cc) => { const l = ws.threat?.level ?? 'GREEN'; return (cc && cc > 0) ? 'RED' : l },
    getColor: (ws, cc) => { if (cc && cc > 0) return '#ef4444'; const l = ws.threat?.level ?? 'GREEN'; return l === 'RED' ? '#ef4444' : l === 'AMBER' ? '#f59e0b' : '#22c55e' },
    getPct: (ws, cc) => { if (cc && cc > 0) return 100; const l = ws.threat?.level ?? 'GREEN'; return l === 'RED' ? 100 : l === 'AMBER' ? 60 : 20 },
  },
  {
    Icon: SignalIcon, labelSv: 'RADAR', labelEn: 'RADAR',
    getValue: ws => `${ws.threat?.comms_coverage_pct ?? '--'}%`,
    getColor: ws => { const v = ws.threat?.comms_coverage_pct ?? 100; return v < 50 ? '#ef4444' : v < 70 ? '#f59e0b' : '#22c55e' },
    getPct: ws => ws.threat?.comms_coverage_pct ?? 0,
  },
]

export function WorldStateGauges({ worldState, criticalCount }: WorldStateGaugesProps) {
  const { lang } = useLang()
  const ws = worldState || {} as WorldState

  return (
    <div className="h-[100px] bg-surface-card border-t border-white/5 flex items-stretch shrink-0">
      {GAUGES.map((gauge, i) => {
        const color = gauge.getColor(ws, criticalCount)
        const value = gauge.getValue(ws, criticalCount)
        const pct = gauge.getPct(ws, criticalCount)
        const isCritical = color === '#ef4444'

        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center justify-center border-r border-white/5 last:border-r-0 px-2"
          >
            <gauge.Icon className="w-4 h-4 mb-1" style={{ color }} />
            <div className="text-[8px] font-bold tracking-[0.15em] text-text-muted">
              {lang === 'sv' ? gauge.labelSv : gauge.labelEn}
            </div>
            <div className="text-sm font-bold mt-0.5" style={{ color }}>{value}</div>
            <div className="w-full h-1 bg-surface-primary mt-1 overflow-hidden">
              <div className="h-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
