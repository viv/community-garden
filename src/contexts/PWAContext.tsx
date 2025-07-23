import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { InstallPromptEvent, PWAInstallation } from '@types/index'
import { storageService } from '@services/storageService'

interface PWAContextType extends PWAInstallation {
  install: () => Promise<void>
  dismissInstallPrompt: () => void
  showInstallPrompt: boolean
  isUpdateAvailable: boolean
  updateApp: () => void
  checkForUpdates: () => void
}

const PWAContext = createContext<PWAContextType | undefined>(undefined)

export function PWAProvider({ children }: { children: ReactNode }) {
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [platform, setPlatform] = useState<PWAInstallation['platform']>('unknown')
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false)
  const [installPromptEvent, setInstallPromptEvent] = useState<InstallPromptEvent | null>(null)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  // Detect platform
  useEffect(() => {
    const detectPlatform = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      
      if (/iphone|ipad|ipod/.test(userAgent)) {
        setPlatform('ios')
      } else if (/android/.test(userAgent)) {
        setPlatform('android')
      } else if (/electron/.test(userAgent)) {
        setPlatform('desktop')
      } else {
        setPlatform('desktop')
      }
    }

    detectPlatform()
  }, [])

  // Check if PWA is installed
  useEffect(() => {
    const checkInstallation = () => {
      // Check for standalone mode (PWA is installed)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isAppleMobile = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
      const isAppleStandalone = (window.navigator as any).standalone === true
      
      setIsInstalled(isStandalone || (isAppleMobile && isAppleStandalone))
    }

    checkInstallation()
  }, [])

  // Handle install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      const installEvent = event as InstallPromptEvent
      setInstallPromptEvent(installEvent)
      setCanInstall(true)
      
      // Check if user has dismissed the prompt before
      checkShouldShowPrompt()
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setCanInstall(false)
      setShowInstallPrompt(false)
      setInstallPromptEvent(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Handle service worker updates
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleServiceWorker = async () => {
        const registration = await navigator.serviceWorker.getRegistration()
        if (!registration) return

        // Check for waiting service worker (update available)
        if (registration.waiting) {
          setWaitingWorker(registration.waiting)
          setIsUpdateAvailable(true)
        }

        // Listen for new service worker installations
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker)
              setIsUpdateAvailable(true)
            }
          })
        })

        // Listen for controller changes (new version activated)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload()
        })
      }

      handleServiceWorker()
    }
  }, [])

  const checkShouldShowPrompt = async () => {
    try {
      const dismissedAt = await storageService.getInstallPromptDismissed()
      const now = Date.now()
      const oneDayInMs = 24 * 60 * 60 * 1000
      
      // Show prompt if never dismissed or dismissed more than a day ago
      const shouldShow = !dismissedAt || (now - dismissedAt) > oneDayInMs
      setShowInstallPrompt(shouldShow)
    } catch (error) {
      console.warn('Failed to check install prompt status:', error)
      setShowInstallPrompt(true)
    }
  }

  const install = async () => {
    if (!installPromptEvent) return

    try {
      await installPromptEvent.prompt()
      const result = await installPromptEvent.userChoice
      
      if (result.outcome === 'accepted') {
        setCanInstall(false)
        setShowInstallPrompt(false)
      } else {
        await dismissInstallPrompt()
      }
      
      setInstallPromptEvent(null)
    } catch (error) {
      console.error('Failed to install PWA:', error)
    }
  }

  const dismissInstallPrompt = async () => {
    try {
      await storageService.setInstallPromptDismissed(Date.now())
      setShowInstallPrompt(false)
    } catch (error) {
      console.warn('Failed to save install prompt dismissal:', error)
    }
  }

  const updateApp = () => {
    if (!waitingWorker) return

    // Send skip waiting message to service worker
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    setIsUpdateAvailable(false)
  }

  const checkForUpdates = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          await registration.update()
        }
      } catch (error) {
        console.error('Failed to check for updates:', error)
      }
    }
  }

  // Auto-check for updates periodically
  useEffect(() => {
    const interval = setInterval(() => {
      checkForUpdates()
    }, 30 * 60 * 1000) // Check every 30 minutes

    return () => clearInterval(interval)
  }, [])

  const contextValue: PWAContextType = {
    canInstall,
    isInstalled,
    platform,
    showInstallPrompt,
    isUpdateAvailable,
    install,
    dismissInstallPrompt,
    updateApp,
    checkForUpdates
  }

  return (
    <PWAContext.Provider value={contextValue}>
      {children}
    </PWAContext.Provider>
  )
}

export const usePWA = () => {
  const context = useContext(PWAContext)
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider')
  }
  return context
}