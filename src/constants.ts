import {
  PaperAirplaneIcon, BeakerIcon, BoltIcon,
  WrenchScrewdriverIcon, EyeIcon,
} from '@heroicons/react/24/solid'

export type AgentId = 'OPS' | 'FUEL' | 'ARMING' | 'MAINT' | 'THREAT'

export interface MacDef {
  name: string
  nameSv: string
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  domain: string
  color: string
  tagline: string
  taglineSv: string
}

export const MAC_NAMES: Record<string, MacDef> = {
  OPS: {
    name: 'Mac Ops',
    nameSv: 'Mac Ops',
    Icon: PaperAirplaneIcon,
    domain: 'SORTIE',
    color: '#3b82f6',
    tagline: 'Sorties scheduled. Launch windows open.',
    taglineSv: 'Uppdrag schemalagda. Startfönster öppna.',
  },
  FUEL: {
    name: 'Mac Fuel',
    nameSv: 'Mac Bränsle',
    Icon: BeakerIcon,
    domain: 'FUEL',
    color: '#f97316',
    tagline: 'JP-8 flowing. Trucks on pad.',
    taglineSv: 'JP-8 flödar. Tankbilar på plattan.',
  },
  ARMING: {
    name: 'Mac Arming',
    nameSv: 'Mac Beväpning',
    Icon: BoltIcon,
    domain: 'ARMING',
    color: '#ef4444',
    tagline: 'Ordnance loaded. IFF verified.',
    taglineSv: 'Ammunition lastad. IFF verifierad.',
  },
  MAINT: {
    name: 'Mac Maint',
    nameSv: 'Mac Underhåll',
    Icon: WrenchScrewdriverIcon,
    domain: 'MAINTENANCE',
    color: '#eab308',
    tagline: 'Aircraft serviceable. Faults cleared.',
    taglineSv: 'Flygplan tjänstdugliga. Fel åtgärdade.',
  },
  THREAT: {
    name: 'Mac Threat',
    nameSv: 'Mac Hotbild',
    Icon: EyeIcon,
    domain: 'THREAT',
    color: '#8b5cf6',
    tagline: 'Air picture clear. Tracks monitored.',
    taglineSv: 'Luftläge klart. Spår övervakas.',
  },
}

export const DOMAIN_KEYWORDS: Record<string, string[]> = {
  OPS: ['OPS', 'SORTIE', 'sortie', 'launch', 'scramble', 'crew', 'readiness', 'uppdrag'],
  FUEL: ['FUEL', 'JP-8', 'fuel', 'truck', 'refuel', 'resupply', 'bränsle', 'tank'],
  ARMING: ['ARMING', 'ordnance', 'loadout', 'weapons', 'IFF', 'armed', 'beväpning', 'ammunition'],
  MAINT: ['MAINT', 'maintenance', 'serviceable', 'hydraulic', 'repair', 'grounded', 'underhåll'],
  THREAT: ['THREAT', 'radar', 'track', 'threat', 'EW', 'jamming', 'posture', 'hotbild', 'spår'],
}

export function detectCrossDomainRefs(event: SwarmEvent): string[] {
  const msg = (event.payload?.message || '').toUpperCase()
  return Object.entries(DOMAIN_KEYWORDS)
    .filter(([id]) => id !== event.source)
    .filter(([, keywords]) => keywords.some(k => msg.includes(k.toUpperCase())))
    .map(([id]) => id)
}

export const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f59e0b',
  AMBER: '#f59e0b',
  MEDIUM: '#06b6d4',
  LOW: '#22c55e',
  INFO: '#4b5563',
}

export const SEVERITY_LABELS_SV: Record<string, string> = {
  CRITICAL: 'KRITISK',
  HIGH: 'HÖG',
  AMBER: 'AMBER',
  MEDIUM: 'MEDIUM',
  LOW: 'LÅG',
  INFO: 'INFO',
}

export interface SwarmEvent {
  id: string
  timestamp: number
  source: string
  event_type: string
  domain: string
  severity: string
  source_layer?: string
  source_mode?: string
  payload?: Record<string, any>
  tags?: string[]
}

export interface AgentState {
  status: string
  lastSeen: number | null
  actionCount: number
}

export interface WorldState {
  scenario?: string
  updated_at?: number
  fuel?: { level_pct: number; trucks_available: number; trucks_total: number; resupply_eta_hours: number }
  sorties?: { aircraft_total: number; aircraft_serviceable: number; aircraft_airborne: number; readiness_pct: number }
  arming?: { ordnance_ready_pct: number; armed_aircraft: number }
  maintenance?: { queue: number; grounded: number }
  threat?: { level: string; radar_tracks: number; ew_jamming: boolean; comms_coverage_pct: number }
  base?: { bases_active: number; dispersal_active: boolean }
}
