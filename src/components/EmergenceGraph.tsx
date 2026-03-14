import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts'
import { MAC_NAMES } from '../constants'
import type { SwarmEvent } from '../constants'

interface EmergenceGraphProps {
  events: SwarmEvent[]
}

const DOMAIN_LABELS_SV: Record<string, string> = {
  OPS: 'Uppdrag',
  FUEL: 'Bränsle',
  ARMING: 'Beväpning',
  MAINT: 'Underhåll',
  THREAT: 'Hotbild',
}

export function EmergenceGraph({ events }: EmergenceGraphProps) {
  const actionCounts = Object.keys(MAC_NAMES).map(id => ({
    name: DOMAIN_LABELS_SV[id] || id,
    count: events.filter(e => e.source === id && e.event_type === 'ACTION_TAKEN').length,
    color: MAC_NAMES[id].color,
  }))

  return (
    <div className="px-3 py-2">
      <div className="text-[9px] font-bold tracking-[0.15em] text-text-muted uppercase mb-1">DOMÄNAKTIVITET</div>
      <div className="text-[7px] tracking-[0.1em] text-text-dim uppercase mb-2">DOMAIN ACTIVITY</div>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={actionCounts}>
          <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#6b7280' }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Bar dataKey="count" radius={[1, 1, 0, 0]}>
            {actionCounts.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
