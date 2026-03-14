import { useState, useRef, useCallback } from 'react'
import { SEVERITY_COLORS } from '../constants'
import type { SwarmEvent } from '../constants'

interface Props {
  event: SwarmEvent
  onClose: () => void
  initialPos?: { x: number; y: number }
}

export function DraggableEventPanel({ event, onClose, initialPos }: Props) {
  const [pos, setPos] = useState(initialPos || { x: 16, y: 60 })
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

  const message = event.payload?.message || event.event_type
  const truncated = message.length > 120 ? message.slice(0, 120) + '…' : message

  return (
    <div
      className="absolute z-40 font-mono select-none"
      style={{ left: pos.x, top: pos.y, maxWidth: 240 }}
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
          {event.source}
        </span>
        <span
          className="text-[7px] font-bold tracking-wider px-1 py-px ml-auto"
          style={{
            color: SEVERITY_COLORS[event.severity],
            background: `${SEVERITY_COLORS[event.severity]}18`,
          }}
        >
          {event.severity}
        </span>
        <button
          onClick={onClose}
          className="text-[10px] leading-none ml-1 opacity-40 hover:opacity-100 transition-opacity"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div
        className="px-2 py-1.5"
        style={{
          background: 'hsl(215 40% 8% / 0.96)',
          border: '1px solid hsl(220 14% 20% / 0.3)',
          borderTop: 'none',
          backdropFilter: 'blur(12px)',
        }}
      >
        <p className="text-[9px] leading-[1.4] mb-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {truncated}
        </p>
        <div className="flex gap-3 text-[8px]" style={{ color: 'hsl(var(--muted))' }}>
          <span>{event.event_type}</span>
          <span>{event.domain}</span>
        </div>
      </div>
    </div>
  )
}
