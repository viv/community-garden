import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bars3Icon,
  BellIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline'

import { useAuth } from '@hooks/useAuth'
import { useTheme } from '@hooks/useTheme'
import { usePWA } from '@hooks/usePWA'
import Avatar from '@components/UI/Avatar'
import Button from '@components/UI/Button'

interface HeaderProps {
  onMenuClick: () => void
  isMobile: boolean
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, isMobile }) => {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { theme, setTheme, toggleTheme } = useTheme()
  const { isUpdateAvailable, updateApp } = usePWA()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <SunIcon className="w-5 h-5" />
      case 'dark':
        return <MoonIcon className="w-5 h-5" />
      default:
        return <ComputerDesktopIcon className="w-5 h-5" />
    }
  }

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 safe-top">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          {isMobile && (
            <Button
              id="menu-button"
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="p-2 -ml-2"
              aria-label="Open menu"
            >
              <Bars3Icon className="w-6 h-6" />
            </Button>
          )}

          {/* Logo/Brand */}
          <Link 
            to="/dashboard" 
            className="flex items-center space-x-2 font-semibold text-green-600 dark:text-green-400"
          >
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white">
              🌱
            </div>
            {!isMobile && <span>Garden Hub</span>}
          </Link>
        </div>

        {/* Center Section - Search (Desktop) */}
        {!isMobile && (
          <div className="flex-1 max-w-lg mx-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search plants, plots, tasks..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 
                         focus:ring-2 focus:ring-green-500 focus:border-transparent
                         placeholder-gray-500 dark:placeholder-gray-400"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Right Section */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Update Available */}
          {isUpdateAvailable && (
            <Button
              variant="primary"
              size="sm"
              onClick={updateApp}
              className="hidden md:inline-flex"
            >
              Update Available
            </Button>
          )}

          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="p-2 relative"
            aria-label="Notifications"
          >
            <BellIcon className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </Button>

          {/* Theme Toggle */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="p-2"
              aria-label="Toggle theme"
            >
              {getThemeIcon()}
            </Button>

            <AnimatePresence>
              {showThemeMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg 
                           border border-gray-200 dark:border-gray-700 py-1 z-50"
                  onBlur={() => setShowThemeMenu(false)}
                >
                  <button
                    onClick={() => {
                      setTheme('light')
                      setShowThemeMenu(false)
                    }}
                    className={`w-full px-4 py-2 text-left flex items-center space-x-3 text-sm
                              hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                              ${theme === 'light' ? 'bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-400' : ''}`}
                  >
                    <SunIcon className="w-4 h-4" />
                    <span>Light</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setTheme('dark')
                      setShowThemeMenu(false)
                    }}
                    className={`w-full px-4 py-2 text-left flex items-center space-x-3 text-sm
                              hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                              ${theme === 'dark' ? 'bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-400' : ''}`}
                  >
                    <MoonIcon className="w-4 h-4" />
                    <span>Dark</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setTheme('system')
                      setShowThemeMenu(false)
                    }}
                    className={`w-full px-4 py-2 text-left flex items-center space-x-3 text-sm
                              hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                              ${theme === 'system' ? 'bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-400' : ''}`}
                  >
                    <ComputerDesktopIcon className="w-4 h-4" />
                    <span>System</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Avatar 
                src={user?.avatar} 
                alt={user?.name} 
                size="sm"
                fallback={user?.name?.charAt(0) || 'U'}
              />
              {!isMobile && (
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {user?.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {user?.role}
                  </div>
                </div>
              )}
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg 
                           border border-gray-200 dark:border-gray-700 py-1 z-50"
                  onBlur={() => setShowUserMenu(false)}
                >
                  <Link
                    to="/profile"
                    onClick={() => setShowUserMenu(false)}
                    className="w-full px-4 py-2 text-left flex items-center space-x-3 text-sm text-gray-700 dark:text-gray-300
                             hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <UserCircleIcon className="w-4 h-4" />
                    <span>Profile</span>
                  </Link>
                  
                  <Link
                    to="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="w-full px-4 py-2 text-left flex items-center space-x-3 text-sm text-gray-700 dark:text-gray-300
                             hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Cog6ToothIcon className="w-4 h-4" />
                    <span>Settings</span>
                  </Link>
                  
                  <hr className="my-1 border-gray-200 dark:border-gray-700" />
                  
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left flex items-center space-x-3 text-sm text-red-600 dark:text-red-400
                             hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header