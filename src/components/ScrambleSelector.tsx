import { useState, useMemo } from 'react'
import type { AircraftState } from '../constants'

interface ScrambleSelectorProps {
  aircraft: Record<string, AircraftState> | undefined
  onScramble: (selectedIds: string[]) => void
}

const ALL_IDS = ['Gripen-01', 'Gripen-02', 'Gripen-03', 'Gripen-04', 'Gripen-05', 'Gripen-06']

// Determine if an aircraft is combat-ready
function isReady(ac: AircraftState | undefined): boolean {
  if (!ac) return false
  return ac.serviceable && ac.fuel_pct > 40 && !['GROUNDED', 'MAINTENANCE'].includes(ac.phase)
}

export function ScrambleSelector({ aircraft, onScramble }: ScrambleSelectorProps) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const acList = useMemo(() => {
    return ALL_IDS.map(id => ({
      id,
      state: aircraft?.[id],
      ready: isReady(aircraft?.[id]),
    }))
  }, [aircraft])

  const readyIds = useMemo(() => acList.filter(a => a.ready).map(a => a.id), [acList])

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllReady = () => setSelected(new Set(readyIds))
  const selectAll = () => setSelected(new Set(ALL_IDS))
  const clearAll = () => setSelected(new Set())

  const handleScramble = () => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    onScramble(ids)
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); selectAllReady() }}
        className="px-3 py-1.5 text-[10px] font-bold tracking-[0.15em] uppercase border transition-colors bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30 animate-pulse"
      >
        SCRAMBLE
      </button>
    )
  }

  return (
    <div className="relative">
      {/* Selector panel */}
      <div className="absolute top-8 left-0 z-50 w-[220px] bg-surface-card/95 backdrop-blur-sm border border-white/10 rounded shadow-xl">
        {/* Header */}
        <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
          <span className="text-[9px] font-bold tracking-[0.2em] text-text-muted uppercase">Select Aircraft</span>
          <button onClick={() => setOpen(false)} className="text-text-muted hover:text-white text-xs">✕</button>
        </div>

        {/* Quick select buttons */}
        <div className="px-3 py-1.5 flex gap-1 border-b border-white/5">
          <button
            onClick={selectAllReady}
            className="px-2 py-0.5 text-[8px] font-bold tracking-wider uppercase border border-green-500/30 text-green-400 bg-green-500/10 hover:bg-green-500/20 rounded-sm"
          >
            READY ({readyIds.length})
          </button>
          <button
            onClick={selectAll}
            className="px-2 py-0.5 text-[8px] font-bold tracking-wider uppercase border border-white/20 text-text-muted hover:text-white hover:border-white/30 rounded-sm"
          >
            ALL
          </button>
          <button
            onClick={clearAll}
            className="px-2 py-0.5 text-[8px] font-bold tracking-wider uppercase border border-white/20 text-text-muted hover:text-white hover:border-white/30 rounded-sm"
          >
            NONE
          </button>
        </div>

        {/* Aircraft list */}
        <div className="py-1">
          {acList.map(({ id, state, ready }) => {
            const isSelected = selected.has(id)
            const fuelPct = state?.fuel_pct ?? 0
            const phase = state?.phase ?? 'UNKNOWN'

            return (
              <button
                key={id}
                onClick={() => toggle(id)}
                className={`w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-white/5 transition-colors ${
                  isSelected ? 'bg-white/5' : ''
                }`}
              >
                {/* Checkbox */}
                <div className={`w-3 h-3 border rounded-sm flex items-center justify-center flex-shrink-0 ${
                  isSelected
                    ? 'bg-red-500/80 border-red-500'
                    : 'border-white/20'
                }`}>
                  {isSelected && (
                    <svg width={8} height={8} viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                {/* Aircraft info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold tracking-wider text-white/90">{id}</span>
                    {/* Readiness dot */}
                    <span className={`w-1.5 h-1.5 rounded-full ${ready ? 'bg-green-400' : 'bg-red-400'}`} />
                  </div>
                  <div className="text-[7px] text-text-muted tracking-wide">
                    {state ? (
                      <>
                        <span className={ready ? 'text-green-400/70' : 'text-red-400/70'}>
                          {state.serviceable ? 'SVC' : 'UNSVC'}
                        </span>
                        {' · '}
                        <span className={fuelPct > 50 ? 'text-green-400/70' : fuelPct > 20 ? 'text-amber-400/70' : 'text-red-400/70'}>
                          FUEL {fuelPct.toFixed(0)}%
                        </span>
                        {' · '}
                        <span className="text-text-muted">{phase}</span>
                      </>
                    ) : (
                      <span className="text-green-400/70">READY · STANDBY</span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Scramble button */}
        <div className="px-3 py-2 border-t border-white/5">
          <button
            onClick={handleScramble}
            disabled={selected.size === 0}
            className={`w-full px-3 py-2 text-[10px] font-bold tracking-[0.2em] uppercase border rounded-sm transition-colors ${
              selected.size > 0
                ? 'bg-red-500/30 border-red-500/60 text-red-300 hover:bg-red-500/40'
                : 'bg-white/5 border-white/10 text-text-muted cursor-not-allowed'
            }`}
          >
            SCRAMBLE {selected.size > 0 ? `${selected.size} AIRCRAFT` : ''}
          </button>
        </div>
      </div>

      {/* Button behind panel (still visible) */}
      <button
        onClick={() => setOpen(false)}
        className="px-3 py-1.5 text-[10px] font-bold tracking-[0.15em] uppercase border transition-colors bg-red-500/30 border-red-500/60 text-red-400"
      >
        SCRAMBLE
      </button>
    </div>
  )
}
