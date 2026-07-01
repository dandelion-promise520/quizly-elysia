import { Button } from '@base-ui/react/button'
import { useLocation } from '@tanstack/react-router'
import { ArrowDown, ArrowUp, Coffee } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

export default function FloatingActions() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  const [showTop, setShowTop] = useState(false)
  const [showBottom, setShowBottom] = useState(false)
  const [isSponsorOpen, setIsSponsorOpen] = useState(false)
  const sponsorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = window.innerHeight

      // 页面滚动超过 300px 时显示置顶
      setShowTop(scrollY > 300)

      // 页面可以滚动且当前距离底部还有超过 300px 时显示置底
      setShowBottom(
        scrollHeight > clientHeight
        && scrollY < scrollHeight - clientHeight - 300,
      )
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)

    // 监听 DOM 树变化，以便在动态加载数据高度改变时能够更新按钮显示状态
    const observer = new MutationObserver(handleScroll)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      observer.disconnect()
    }
  }, [])

  // 点击外部关闭打赏弹出层
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sponsorRef.current && !sponsorRef.current.contains(event.target as Node)) {
        setIsSponsorOpen(false)
      }
    }
    if (isSponsorOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isSponsorOpen])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth',
    })
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-2.5">
      <AnimatePresence mode="popLayout">
        {/* 1. 置顶按钮 */}
        {showTop && (
          <Button
            key="scroll-top"
            onClick={scrollToTop}
            aria-label="回到顶部"
            render={(
              <motion.button
                layout
                initial={{ opacity: 0, y: 15, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.8 }}
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-slate-200/80 bg-white/95 text-slate-600 shadow-md backdrop-blur-md transition-colors hover:bg-white hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-500 focus-visible:outline-offset-2 dark:border-slate-800/80 dark:bg-slate-900/95 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-100"
              />
            )}
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        )}

        {/* 2. 置底按钮 */}
        {showBottom && (
          <Button
            key="scroll-bottom"
            onClick={scrollToBottom}
            aria-label="回到底部"
            render={(
              <motion.button
                layout
                initial={{ opacity: 0, y: 15, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.8 }}
                whileHover={{ scale: 1.1, y: 2 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-slate-200/80 bg-white/95 text-slate-600 shadow-md backdrop-blur-md transition-colors hover:bg-white hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-500 focus-visible:outline-offset-2 dark:border-slate-800/80 dark:bg-slate-900/95 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-100"
              />
            )}
          >
            <ArrowDown className="h-5 w-5" />
          </Button>
        )}

        {/* 3. 咖啡赞助按钮 */}
        {!isAdmin && (
          <motion.div
            key="sponsor-container"
            layout
            ref={sponsorRef}
            className="relative"
          >
            <AnimatePresence>
              {isSponsorOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  className="absolute bottom-14 right-0 bg-white border border-slate-100 p-3 rounded-2xl shadow-xl w-38 flex flex-col items-center gap-2 dark:bg-slate-900 dark:border-slate-800"
                >
                  <span className="text-[10px] font-bold text-slate-400 select-none">
                    请作者喝杯咖啡 ☕️
                  </span>
                  <div className="relative w-32 h-32 bg-slate-50 border border-slate-100 rounded-lg overflow-hidden flex items-center justify-center p-1 dark:bg-slate-950 dark:border-slate-850">
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
              onClick={() => setIsSponsorOpen(!isSponsorOpen)}
              className={`flex items-center justify-center w-11 h-11 border shadow-md rounded-full backdrop-blur-md cursor-pointer transition-colors duration-200 ${
                isSponsorOpen
                  ? 'bg-teal-500 border-teal-500 text-white dark:bg-teal-600 dark:border-teal-600'
                  : 'bg-white/95 border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-white dark:bg-slate-900/95 dark:border-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-100'
              }`}
              title="支持作者"
            >
              <Coffee className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
