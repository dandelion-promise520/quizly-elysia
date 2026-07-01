import { Button } from '@base-ui/react/button'
import { useLocation } from '@tanstack/react-router'
import { ArrowDown, ArrowUp, Coffee, Moon, Sun } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useTheme } from '@/components/theme-provider'

export default function FloatingActions() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  const { theme, setTheme } = useTheme()
  const isDark
    = theme === 'dark'
      || (theme === 'system'
        && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const [showTop, setShowTop] = useState(false)
  const [showBottom, setShowBottom] = useState(false)
  const [isSponsorOpen, setIsSponsorOpen] = useState(false)
  const sponsorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = window.innerHeight

      setShowTop(scrollY > 300)

      setShowBottom(
        scrollHeight > clientHeight
        && scrollY < scrollHeight - clientHeight - 300,
      )
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)

    const observer = new MutationObserver(handleScroll)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        sponsorRef.current
        && !sponsorRef.current.contains(event.target as Node)
      ) {
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

  const toggleTheme = (event: React.MouseEvent<HTMLButtonElement>) => {
    const currentTheme
      = theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark'

    const x = event.clientX
    const y = event.clientY
    const root = document.documentElement
    root.style.setProperty('--x', `${x}px`)
    root.style.setProperty('--y', `${y}px`)

    setTheme(nextTheme)
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
                className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-border bg-surface/95 text-text-secondary shadow-md backdrop-blur-md transition-colors hover:bg-surface hover:text-text focus-visible:outline-2 focus-visible:outline-teal-500 focus-visible:outline-offset-2"
              />
            )}
          >
            <ArrowUp data-icon="inline" />
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
                className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-border bg-surface/95 text-text-secondary shadow-md backdrop-blur-md transition-colors hover:bg-surface hover:text-text focus-visible:outline-2 focus-visible:outline-teal-500 focus-visible:outline-offset-2"
              />
            )}
          >
            <ArrowDown data-icon="inline" />
          </Button>
        )}

        {/* 3. 暗黑模式切换按钮 */}
        <Button
          key="theme-toggle"
          onClick={toggleTheme}
          aria-label="切换主题"
          render={(
            <motion.button
              layout
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-border bg-surface/95 text-text-secondary shadow-md backdrop-blur-md transition-colors hover:bg-surface hover:text-text focus-visible:outline-2 focus-visible:outline-teal-500 focus-visible:outline-offset-2"
            />
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isDark
              ? (
                  <motion.span
                    key="sun"
                    initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    exit={{ rotate: 90, scale: 0.6, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-center"
                  >
                    <Sun data-icon="inline" />
                  </motion.span>
                )
              : (
                  <motion.span
                    key="moon"
                    initial={{ rotate: 90, scale: 0.6, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    exit={{ rotate: -90, scale: 0.6, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-center"
                  >
                    <Moon data-icon="inline" />
                  </motion.span>
                )}
          </AnimatePresence>
        </Button>

        {/* 4. 咖啡赞助按钮 */}
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
                  className="absolute bottom-14 right-0 border border-border p-3 rounded-2xl shadow-xl w-38 flex flex-col items-center gap-2 bg-surface"
                >
                  <span className="text-[10px] font-bold text-text-muted select-none">
                    请作者喝杯咖啡 ☕️
                  </span>
                  <div className="relative size-32 bg-slate-50 border border-border rounded-lg overflow-hidden flex items-center justify-center p-1 dark:bg-slate-950">
                    <img
                      src="/sponsor-qr.png"
                      alt="微信打赏码"
                      className="size-full object-contain"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsSponsorOpen(!isSponsorOpen)}
              className={`flex items-center justify-center size-11 border shadow-md rounded-full backdrop-blur-md cursor-pointer transition-colors duration-200 ${
                isSponsorOpen
                  ? 'bg-accent border-accent text-white'
                  : 'bg-surface/95 border-border text-text-secondary hover:text-text hover:bg-surface'
              }`}
              title="支持作者"
            >
              <Coffee data-icon="inline" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
