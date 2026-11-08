'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/components/theme-provider'
import { Toaster as Sonner, ToasterProps } from 'sonner'
import { ADMIN_THEME_EVENT, readAdminThemeChoice, resolveAdminTheme, type AdminThemeChoice } from '@/lib/admin-theme'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()
  const pathname = usePathname()
  const onAdmin = pathname === '/admin' || pathname.startsWith('/admin/')
  const [adminTheme, setAdminTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    if (!onAdmin) return
    const sync = () => setAdminTheme(resolveAdminTheme(readAdminThemeChoice()))
    sync()
    const onChoice = (event: Event) => {
      const choice = (event as CustomEvent<AdminThemeChoice>).detail
      if (choice) setAdminTheme(resolveAdminTheme(choice))
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystem = () => {
      if (readAdminThemeChoice() === 'system') sync()
    }
    window.addEventListener(ADMIN_THEME_EVENT, onChoice)
    media.addEventListener('change', onSystem)
    return () => {
      window.removeEventListener(ADMIN_THEME_EVENT, onChoice)
      media.removeEventListener('change', onSystem)
    }
  }, [onAdmin])

  return (
    <Sonner
      theme={(onAdmin ? adminTheme : theme) as ToasterProps['theme']}
      className="toaster group"
      style={
        {
          '--normal-bg': onAdmin ? 'var(--admin-surface)' : 'var(--popover)',
          '--normal-text': onAdmin ? 'var(--admin-ink)' : 'var(--popover-foreground)',
          '--normal-border': onAdmin ? 'var(--admin-line)' : 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
