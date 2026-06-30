import { Coffee } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

export default function SponsorButton() {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 点击外部区域关闭 Popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className="fixed bottom-22 right-7 z-40">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute bottom-14 right-0 bg-white border border-slate-100 p-3 rounded-2xl shadow-xl w-38 flex flex-col items-center gap-2"
          >
            <span className="text-[10px] font-bold text-slate-400 select-none">
              请作者喝杯咖啡 ☕️
            </span>
            <div className="relative w-32 h-32 bg-slate-50 border border-slate-100 rounded-lg overflow-hidden flex items-center justify-center p-1">
              <img
                src="/sponsor-qr.png"
                alt="微信打赏码"
                className="w-full h-full object-contain"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center w-11 h-11 bg-white/80 border border-slate-200 shadow-sm rounded-full backdrop-blur-md transition-opacity duration-300 cursor-pointer ${
          isOpen ? 'opacity-100 text-teal-600 border-teal-200' : 'opacity-40 hover:opacity-100 text-slate-500 hover:text-slate-800'
        }`}
        title="支持作者"
      >
        <Coffee className="w-5 h-5" />
      </motion.button>
    </div>
  )
}
