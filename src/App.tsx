import React, { Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useInView } from 'react-intersection-observer'

import { useAuth } from '@hooks/useAuth'
import { useTheme } from '@hooks/useTheme'
import { usePWA } from '@hooks/usePWA'
import { useOffline } from '@hooks/useOffline'

import Layout from '@components/Layout/Layout'
import LoadingSpinner from '@components/UI/LoadingSpinner'
import ErrorBoundary from '@components/ErrorBoundary'
import OfflineBanner from '@components/UI/OfflineBanner'
import PWAInstallPrompt from '@components/PWA/PWAInstallPrompt'
import NotificationHandler from '@components/Notifications/NotificationHandler'

// Lazy loaded pages for code splitting
const Dashboard = React.lazy(() => import('@pages/Dashboard'))
const Login = React.lazy(() => import('@pages/Auth/Login'))
const Register = React.lazy(() => import('@pages/Auth/Register'))
const ForgotPassword = React.lazy(() => import('@pages/Auth/ForgotPassword'))
const ResetPassword = React.lazy(() => import('@pages/Auth/ResetPassword'))
const Plots = React.lazy(() => import('@pages/Plots'))
const PlotDetail = React.lazy(() => import('@pages/Plots/PlotDetail'))
const Plants = React.lazy(() => import('@pages/Plants'))
const PlantDetail = React.lazy(() => import('@pages/Plants/PlantDetail'))
const Watering = React.lazy(() => import('@pages/Watering'))
const Harvests = React.lazy(() => import('@pages/Harvests'))
const Tasks = React.lazy(() => import('@pages/Tasks'))
const Analytics = React.lazy(() => import('@pages/Analytics'))
const Profile = React.lazy(() => import('@pages/Profile'))
const Settings = React.lazy(() => import('@pages/Settings'))
const Help = React.lazy(() => import('@pages/Help'))
const NotFound = React.lazy(() => import('@pages/NotFound'))

// Loading component with skeleton UI
const PageLoader = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
)

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth()
  
  if (isLoading) {
    return <PageLoader />
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

// Public route wrapper (redirect if authenticated)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth()
  
  if (isLoading) {
    return <PageLoader />
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }
  
  return <>{children}</>
}

function App() {
  const { theme } = useTheme()
  const { isOnline, syncStatus } = useOffline()
  const { canInstall, showInstallPrompt } = usePWA()

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.add(prefersDark ? 'dark' : 'light')
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  // Handle PWA updates
  useEffect(() => {
    // Listen for app updates
    const handleAppUpdate = (event: CustomEvent) => {
      if (event.detail.isUpdate) {
        // Show update notification
        console.log('App update available')
      }
    }

    window.addEventListener('sw-update' as any, handleAppUpdate)
    return () => window.removeEventListener('sw-update' as any, handleAppUpdate)
  }, [])

  return (
    <ErrorBoundary>
      <div className="App min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        {/* Offline status banner */}
        {!isOnline && <OfflineBanner syncStatus={syncStatus} />}
        
        {/* PWA install prompt */}
        {canInstall && showInstallPrompt && <PWAInstallPrompt />}
        
        {/* Notification handler for push notifications */}
        <NotificationHandler />
        
        <AnimatePresence mode="wait">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } />
              
              <Route path="/register" element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              } />
              
              <Route path="/forgot-password" element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              } />
              
              <Route path="/reset-password" element={
                <PublicRoute>
                  <ResetPassword />
                </PublicRoute>
              } />

              {/* Protected routes with layout */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                
                {/* Plot management */}
                <Route path="plots" element={<Plots />} />
                <Route path="plots/:plotId" element={<PlotDetail />} />
                
                {/* Plant management */}
                <Route path="plants" element={<Plants />} />
                <Route path="plants/:plantId" element={<PlantDetail />} />
                
                {/* Garden activities */}
                <Route path="watering" element={<Watering />} />
                <Route path="harvests" element={<Harvests />} />
                <Route path="tasks" element={<Tasks />} />
                
                {/* Analytics and reporting */}
                <Route path="analytics" element={<Analytics />} />
                
                {/* User management */}
                <Route path="profile" element={<Profile />} />
                <Route path="settings" element={<Settings />} />
                <Route path="help" element={<Help />} />
              </Route>

              {/* 404 page */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  )
}

export default App