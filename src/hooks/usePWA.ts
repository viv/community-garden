import { useContext } from 'react'
import { PWAContext } from '@contexts/PWAContext'

export const usePWA = () => {
  const context = useContext(PWAContext)
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider')
  }
  return context
}