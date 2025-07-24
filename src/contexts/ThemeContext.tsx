import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { storageService } from '@services/storageService'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  actualTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light')

  // Initialize theme from storage or system preference
  useEffect(() => {
    const initTheme = async () => {
      try {
        const savedTheme = await storageService.getTheme()
        if (savedTheme) {
          setThemeState(savedTheme)
        }
      } catch (error) {
        console.warn('Failed to load theme preference:', error)
      }
    }

    initTheme()
  }, [])

  // Update actual theme based on theme setting and system preference
  useEffect(() => {
    const updateActualTheme = () => {
      if (theme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        setActualTheme(systemPrefersDark ? 'dark' : 'light')
      } else {
        setActualTheme(theme)
      }
    }

    updateActualTheme()

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        updateActualTheme()
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(actualTheme)

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content', 
        actualTheme === 'dark' ? '#111827' : '#22c55e'
      )
    }

    // Update PWA manifest theme
    const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement
    if (manifestLink) {
      // Create dynamic manifest based on theme
      const manifest = {
        name: 'Community Garden Dashboard',
        short_name: 'Garden Hub',
        theme_color: actualTheme === 'dark' ? '#111827' : '#22c55e',
        background_color: actualTheme === 'dark' ? '#111827' : '#ffffff',
        display: 'standalone'
      }

      const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' })
      const manifestUrl = URL.createObjectURL(manifestBlob)
      manifestLink.href = manifestUrl
    }
  }, [actualTheme])

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme)
    try {
      await storageService.setTheme(newTheme)
    } catch (error) {
      console.warn('Failed to save theme preference:', error)
    }
  }

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  const contextValue: ThemeContextType = {
    theme,
    actualTheme,
    setTheme,
    toggleTheme
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}