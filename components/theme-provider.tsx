'use client'

import * as React from 'react'

type Theme = 'dark' | 'light' | 'system'

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'dark' | 'light'
  themes: Theme[]
  systemTheme: 'dark' | 'light'
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyThemeClass(resolved: 'dark' | 'light') {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
  root.style.colorScheme = resolved
}

/**
 * Provider de tema sin next-themes (evita el <script> anti-FOUC que React 19 rechaza).
 * API compatible con useTheme() de next-themes para header/sonner.
 */
export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  forcedTheme,
  enableSystem = false,
  attribute: _attribute = 'class',
  disableTransitionOnChange: _disableTransitionOnChange,
  ..._rest
}: {
  children: React.ReactNode
  defaultTheme?: Theme
  forcedTheme?: Theme
  enableSystem?: boolean
  attribute?: string
  disableTransitionOnChange?: boolean
  [key: string]: unknown
}) {
  const [theme, setThemeState] = React.useState<Theme>(forcedTheme || defaultTheme)
  const [systemTheme, setSystemTheme] = React.useState<'dark' | 'light'>('dark')
  const [mounted, setMounted] = React.useState(false)

  React.useLayoutEffect(() => {
    const system = getSystemTheme()
    setSystemTheme(system)

    let next: Theme = forcedTheme || defaultTheme
    if (!forcedTheme) {
      try {
        const stored = localStorage.getItem('apolo-theme') as Theme | null
        if (stored === 'dark' || stored === 'light' || stored === 'system') {
          next = stored
        }
      } catch {
        // ignore
      }
    }

    setThemeState(next)
    const resolved = next === 'system' ? system : (next as 'dark' | 'light')
    applyThemeClass(resolved)
    setMounted(true)

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemTheme(mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [forcedTheme, defaultTheme])

  const resolvedTheme: 'dark' | 'light' = forcedTheme
    ? forcedTheme === 'system'
      ? systemTheme
      : (forcedTheme as 'dark' | 'light')
    : theme === 'system'
      ? systemTheme
      : theme

  React.useEffect(() => {
    if (!mounted) return
    applyThemeClass(resolvedTheme)
  }, [mounted, resolvedTheme])

  const setTheme = React.useCallback(
    (next: Theme) => {
      if (forcedTheme) return
      setThemeState(next)
      try {
        localStorage.setItem('apolo-theme', next)
      } catch {
        // ignore
      }
    },
    [forcedTheme]
  )

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme: forcedTheme || theme,
      setTheme,
      resolvedTheme,
      themes: enableSystem ? ['light', 'dark', 'system'] : ['light', 'dark'],
      systemTheme,
    }),
    [forcedTheme, theme, setTheme, resolvedTheme, enableSystem, systemTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) {
    return {
      theme: 'dark',
      setTheme: () => {},
      resolvedTheme: 'dark',
      themes: ['dark'],
      systemTheme: 'dark',
    }
  }
  return ctx
}
