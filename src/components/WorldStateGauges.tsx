import {
  PaperAirplaneIcon, BeakerIcon, BoltIcon,
  WrenchScrewdriverIcon, ShieldExclamationIcon, SignalIcon
} from '@heroicons/react/24/solid'
import type { WorldState } from '../constants'

interface WorldStateGaugesProps {
  worldState: WorldState | null
}

interface GaugeDef {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  labelSv: string
  labelEn: string
  getValue: (ws: WorldState) => string
  getColor: (ws: WorldState) => string
  getPct: (ws: WorldState) => number
}

const GAUGES: GaugeDef[] = [
  {
    Icon: PaperAirplaneIcon,
    labelSv: 'BEREDSKAP',
    labelEn: 'Readiness',
    getValue: ws => `${ws.sorties?.readiness_pct ?? '--'}%`,
    getColor: ws => {
      const v = ws.sorties?.readiness_pct ?? 100
      return v < 40 ? '#ef4444' : v < 60 ? '#f59e0b' : '#22c55e'
    },
    getPct: ws => ws.sorties?.readiness_pct ?? 0,
  },
  {
    Icon: PaperAirplaneIcon,
    labelSv: 'FLYGPLAN',
    labelEn: 'Aircraft',
    getValue: ws => `${ws.sorties?.aircraft_serviceable ?? '-'}/${ws.sorties?.aircraft_total ?? '-'}`,
    getColor: ws => {
      const v = ws.sorties?.aircraft_serviceable ?? 6
      return v < 2 ? '#ef4444' : v < 4 ? '#f59e0b' : '#22c55e'
    },
    getPct: ws => ((ws.sorties?.aircraft_serviceable ?? 0) / (ws.sorties?.aircraft_total || 6)) * 100,
  },
  {
    Icon: BeakerIcon,
    labelSv: 'JP-8 BRÄNSLE',
    labelEn: 'Fuel',
    getValue: ws => `${ws.fuel?.level_pct ?? '--'}%`,
    getColor: ws => {
      const v = ws.fuel?.level_pct ?? 100
      return v < 20 ? '#ef4444' : v < 40 ? '#f59e0b' : '#22c55e'
    },
    getPct: ws => ws.fuel?.level_pct ?? 0,
  },
  {
    Icon: BoltIcon,
    labelSv: 'AMMUNITION',
    labelEn: 'Ordnance',
    getValue: ws => `${ws.arming?.ordnance_ready_pct ?? '--'}%`,
    getColor: ws => {
      const v = ws.arming?.ordnance_ready_pct ?? 100
      return v < 30 ? '#ef4444' : v < 60 ? '#f59e0b' : '#22c55e'
    },
    getPct: ws => ws.arming?.ordnance_ready_pct ?? 0,
  },
  {
    Icon: WrenchScrewdriverIcon,
    labelSv: 'MARKBUNDNA',
    labelEn: 'Grounded',
    getValue: ws => `${ws.maintenance?.grounded ?? 0}`,
    getColor: ws => {
      const v = ws.maintenance?.grounded ?? 0
      return v > 2 ? '#ef4444' : v > 1 ? '#f59e0b' : '#22c55e'
    },
    getPct: ws => Math.min((ws.maintenance?.grounded ?? 0) * 25, 100),
  },
  {
    Icon: ShieldExclamationIcon,
    labelSv: 'HOTBILD',
    labelEn: 'Threat',
    getValue: ws => ws.threat?.level ?? 'GREEN',
    getColor: ws => {
      const l = ws.threat?.level ?? 'GREEN'
      return l === 'RED' ? '#ef4444' : l === 'AMBER' ? '#f59e0b' : '#22c55e'
    },
    getPct: ws => {
      const l = ws.threat?.level ?? 'GREEN'
      return l === 'RED' ? 100 : l === 'AMBER' ? 60 : 20
    },
  },
  {
    Icon: SignalIcon,
    labelSv: 'RADAR',
    labelEn: 'Comms',
    getValue: ws => `${ws.threat?.comms_coverage_pct ?? '--'}%`,
    getColor: ws => {
      const v = ws.threat?.comms_coverage_pct ?? 100
      return v < 50 ? '#ef4444' : v < 70 ? '#f59e0b' : '#22c55e'
    },
    getPct: ws => ws.threat?.comms_coverage_pct ?? 0,
  },
]

export function WorldStateGauges({ worldState }: WorldStateGaugesProps) {
  const ws = worldState || {} as WorldState

  return (
    <div className="h-[100px] bg-surface-card border-t border-white/5 flex items-stretch shrink-0">
      {GAUGES.map((gauge, i) => {
        const color = gauge.getColor(ws)
        const value = gauge.getValue(ws)
        const pct = gauge.getPct(ws)
        const isCritical = color === '#ef4444'

        return (
          <div
            key={i}
            className={`flex-1 flex flex-col items-center justify-center border-r border-white/5 last:border-r-0 px-2 ${isCritical ? 'animate-glow-critical' : ''}`}
          >
            <gauge.Icon className="w-4 h-4 mb-1" style={{ color }} />
            <div className="text-[8px] font-bold tracking-[0.15em] text-text-muted">{gauge.labelSv}</div>
            <div className="text-[7px] tracking-[0.1em] text-text-dim">{gauge.labelEn}</div>
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
