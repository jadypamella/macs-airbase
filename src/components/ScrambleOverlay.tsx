import { motion, AnimatePresence } from 'framer-motion'
import { useLang } from '@/hooks/useLang'

interface ScrambleOverlayProps {
  active: boolean
}

export function ScrambleOverlay({ active }: ScrambleOverlayProps) {
  const { lang } = useLang()

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-status-red/20 pointer-events-none"
        >
          <div className="absolute inset-0 animate-threat-blink bg-status-red/10" />
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="text-center"
          >
            <div className="text-6xl font-bold tracking-[0.3em] text-status-red drop-shadow-2xl">
              {lang === 'sv' ? 'BEREDSKAPSSTART' : 'SCRAMBLE'}
            </div>
            <div className="text-3xl font-bold tracking-[0.5em] text-text-primary mt-4">
              SCRAMBLE SCRAMBLE SCRAMBLE
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
