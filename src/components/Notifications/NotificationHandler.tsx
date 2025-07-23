import React, { useEffect } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@hooks/useAuth'

const NotificationHandler = () => {
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated || !user) return

    // Request notification permission
    const requestNotificationPermission = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        try {
          const permission = await Notification.requestPermission()
          if (permission === 'granted') {
            toast.success('Notifications enabled! You\'ll receive important garden updates.')
          }
        } catch (error) {
          console.warn('Failed to request notification permission:', error)
        }
      }
    }

    requestNotificationPermission()

    // Listen for custom notification events
    const handleCustomNotification = (event: CustomEvent) => {
      const { type, title, message, data } = event.detail
      
      switch (type) {
        case 'watering_due':
          toast(message, {
            icon: '💧',
            duration: 6000,
            position: 'top-right'
          })
          break
          
        case 'harvest_ready':
          toast(message, {
            icon: '🌟',
            duration: 6000,
            position: 'top-right'
          })
          break
          
        case 'task_assigned':
          toast(message, {
            icon: '📋',
            duration: 5000,
            position: 'top-right'
          })
          break
          
        case 'weather_alert':
          toast(message, {
            icon: '🌦️',
            duration: 8000,
            position: 'top-center'
          })
          break
          
        default:
          toast(message)
      }

      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body: message,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: type,
          data,
          requireInteraction: type === 'weather_alert'
        })
      }
    }

    window.addEventListener('garden-notification' as any, handleCustomNotification)

    // Mock some notifications for demo
    const demoNotifications = () => {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('garden-notification', {
          detail: {
            type: 'watering_due',
            title: 'Watering Reminder',
            message: 'Plot A3 tomatoes need watering in the next hour',
            data: { plotId: 'a3' }
          }
        }))
      }, 5000)

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('garden-notification', {
          detail: {
            type: 'harvest_ready',
            title: 'Harvest Ready!',
            message: 'Your lettuce in Plot B2 is ready to harvest',
            data: { plotId: 'b2', plantType: 'lettuce' }
          }
        }))
      }, 15000)
    }

    // Only show demo notifications in development
    if (process.env.NODE_ENV === 'development') {
      demoNotifications()
    }

    return () => {
      window.removeEventListener('garden-notification' as any, handleCustomNotification)
    }
  }, [isAuthenticated, user])

  // Listen for service worker messages (push notifications)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
        const { title, body, data } = event.data.payload
        
        toast(body, {
          icon: '🔔',
          duration: 6000,
          position: 'top-right'
        })
      }
    }

    navigator.serviceWorker.addEventListener('message', handleMessage)

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage)
    }
  }, [])

  return null // This component doesn't render anything
}

export default NotificationHandler