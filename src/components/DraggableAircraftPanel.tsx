import { useState, useRef, useCallback } from 'react'
import type { AircraftState } from '../constants'

const PHASE_LABELS: Record<string, string> = {
  AIRBORNE: 'LUFTEN', RTB: 'RETUR', TAXI: 'TAXI', TAKEOFF: 'START',
  LANDING: 'LANDNING', FUELING: 'TANKNING', ARMING: 'BEVÄPNING',
  SHELTER: 'SKYDD', PRE_FLIGHT: 'FÖRFLYGN.', POST_FLIGHT: 'EFTERFLYGN.',
  MAINTENANCE: 'UNDERHÅLL', GROUNDED: 'MARKBUNDEN',
}

interface Props {
  ac: AircraftState
  initialPos: { x: number; y: number }
  onClose: () => void
}

export function DraggableAircraftPanel({ ac, initialPos, onClose }: Props) {
  const [pos, setPos] = useState(initialPos)
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y }
    const onMove = (me: PointerEvent) => {
      if (!dragRef.current) return
      setPos({
        x: dragRef.current.origX + (me.clientX - dragRef.current.startX),
        y: dragRef.current.origY + (me.clientY - dragRef.current.startY),
      })
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [pos.x, pos.y])

  const isAirborne = ac.phase === 'AIRBORNE' || ac.phase === 'RTB' || ac.phase === 'TAKEOFF'

  return (
    <div
      className="absolute z-40 font-mono select-none animate-fade-in"
      style={{ left: pos.x, top: pos.y, width: 220 }}
    >
      {/* Drag handle / header */}
      <div
        className="flex items-center gap-1.5 px-2 py-1 cursor-grab active:cursor-grabbing"
        style={{
          background: 'hsl(215 40% 10% / 0.98)',
          borderBottom: '1px solid hsl(220 14% 20% / 0.4)',
        }}
        onPointerDown={onPointerDown}
      >
        <span className="text-[9px] tracking-[0.15em] font-bold" style={{ color: 'hsl(var(--foreground))' }}>
          {ac.id} - {PHASE_LABELS[ac.phase] || ac.phase}
        </span>
        <button
          onClick={onClose}
          className="text-[10px] leading-none ml-auto opacity-40 hover:opacity-100 transition-opacity"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div
        className="px-2 py-1.5 space-y-0.5"
        style={{
          background: 'hsl(215 40% 8% / 0.96)',
          border: '1px solid hsl(220 14% 20% / 0.3)',
          borderTop: 'none',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="text-[8px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Fuel: {ac.fuel_pct.toFixed(0)}% | {ac.loadout}
        </div>
        {isAirborne && (
          <div className="text-[8px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
            FL{Math.round(ac.altitude_ft / 100)} | {ac.speed_kts}kts | HDG {ac.heading}°
          </div>
        )}
        <div className="text-[8px]" style={{ color: 'hsl(var(--muted))' }}>
          Pilot: {ac.pilot} | Pad: {ac.pad}
        </div>
      </div>
    </div>
  )
}
