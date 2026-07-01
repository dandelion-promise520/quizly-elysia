import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type Theme = 'dark' | 'light' | 'system'

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

interface ThemeProviderState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'quizly-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme,
  )

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light'

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const value = useMemo(() => ({
    theme,
    setTheme: (newTheme: Theme) => {
      const updateTheme = () => {
        localStorage.setItem(storageKey, newTheme)
        setThemeState(newTheme)
      }

      if (!(document as any).startViewTransition) {
        updateTheme()
        return
      }

      const isQuizPage = window.location.pathname === '/' || window.location.pathname === ''
      if (isQuizPage) {
        document.documentElement.classList.add('no-clip-transition')
      }

      const transition = (document as any).startViewTransition(() => {
        updateTheme()
      })

      if (isQuizPage) {
        transition.finished.finally(() => {
          document.documentElement.classList.remove('no-clip-transition')
        })
      }
    },
  }), [theme, storageKey])

  return (
    <ThemeProviderContext {...props} value={value}>
      {children}
    </ThemeProviderContext>
  )
}

export function useTheme() {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider')

  return context
}
