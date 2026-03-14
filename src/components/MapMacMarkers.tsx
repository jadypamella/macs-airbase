import { Marker } from 'react-map-gl/maplibre'
import { MAC_NAMES } from '../constants'
import { MAC_POSITIONS } from '../data/locations'
import type { AgentState } from '../constants'

interface MapMacMarkersProps {
  agents: Record<string, AgentState>
}

export function MapMacMarkers({ agents }: MapMacMarkersProps) {
  return (
    <>
      {Object.entries(MAC_POSITIONS).map(([agentId, pos]) => {
        const mac = MAC_NAMES[agentId]
        if (!mac) return null
        const agent = agents[agentId]
        const isOffline = agent?.status === 'offline'
        const isActive = agent?.status === 'active'
        const Icon = mac.Icon

        return (
          <Marker key={agentId} latitude={pos.lat} longitude={pos.lng} anchor="center">
            <div className={`relative ${isOffline ? 'animate-agent-death' : ''}`}>
              <div
                className="w-8 h-8 flex items-center justify-center rounded-sm"
                style={{
                  backgroundColor: `${mac.color}20`,
                  border: `1.5px solid ${mac.color}`,
                  opacity: isOffline ? 0.3 : 1,
                }}
              >
                <Icon className="w-4 h-4" style={{ color: mac.color }} />
                {!isOffline && isActive && (
                  <div
                    className="absolute inset-0 rounded-sm animate-pulse-ring"
                    style={{ borderColor: mac.color, borderWidth: 1 }}
                  />
                )}
              </div>
              <div
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[7px] font-bold tracking-wider whitespace-nowrap"
                style={{ color: mac.color }}
              >
                {mac.nameSv}
              </div>
            </div>
          </Marker>
        )
      })}
    </>
  )
}