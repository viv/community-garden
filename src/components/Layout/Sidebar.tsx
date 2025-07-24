import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  HomeIcon,
  MapIcon,
  BeakerIcon,
  WrenchScrewdriverIcon,
  StarIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  MapIcon as MapIconSolid,
  BeakerIcon as BeakerIconSolid,
  WrenchScrewdriverIcon as WrenchScrewdriverIconSolid,
  StarIcon as StarIconSolid,
  ClipboardDocumentListIcon as ClipboardDocumentListIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  QuestionMarkCircleIcon as QuestionMarkCircleIconSolid
} from '@heroicons/react/24/solid'

import { useAuth } from '@hooks/useAuth'
import Button from '@components/UI/Button'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  iconSolid: React.ComponentType<{ className?: string }>
  badge?: number
  description: string
}

const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    iconSolid: HomeIconSolid,
    description: 'Overview and quick actions'
  },
  {
    name: 'Plots',
    href: '/plots',
    icon: MapIcon,
    iconSolid: MapIconSolid,
    description: 'Manage garden plots'
  },
  {
    name: 'Plants',
    href: '/plants',
    icon: BeakerIcon,
    iconSolid: BeakerIconSolid,
    description: 'Track plant growth'
  },
  {
    name: 'Watering',
    href: '/watering',
    icon: WrenchScrewdriverIcon,
    iconSolid: WrenchScrewdriverIconSolid,
    badge: 3,
    description: 'Watering schedules'
  },
  {
    name: 'Harvests',
    href: '/harvests',
    icon: StarIcon,
    iconSolid: StarIconSolid,
    description: 'Track harvests'
  },
  {
    name: 'Tasks',
    href: '/tasks',
    icon: ClipboardDocumentListIcon,
    iconSolid: ClipboardDocumentListIconSolid,
    badge: 2,
    description: 'Garden tasks'
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: ChartBarIcon,
    iconSolid: ChartBarIconSolid,
    description: 'Performance insights'
  }
]

const secondaryNavigation: NavItem[] = [
  {
    name: 'Settings',
    href: '/settings',
    icon: Cog6ToothIcon,
    iconSolid: Cog6ToothIconSolid,
    description: 'App preferences'
  },
  {
    name: 'Help',
    href: '/help',
    icon: QuestionMarkCircleIcon,
    iconSolid: QuestionMarkCircleIconSolid,
    description: 'Get support'
  }
]

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, className = '' }) => {
  const location = useLocation()
  const { user } = useAuth()

  const NavItem: React.FC<{ item: NavItem; isActive: boolean }> = ({ item, isActive }) => {
    const Icon = isActive ? item.iconSolid : item.icon

    return (
      <NavLink
        to={item.href}
        className={({ isActive }) =>
          `group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
           ${isActive
             ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-100 shadow-sm'
             : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
           }`
        }
      >
        <div className="flex items-center w-full">
          <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400 group-hover:text-gray-500'}`} />
          <span className="flex-1">{item.name}</span>
          {item.badge && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-medium 
                           bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 rounded-full">
              {item.badge}
            </span>
          )}
        </div>
      </NavLink>
    )
  }

  return (
    <div className={`flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Mobile Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 md:hidden">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white">
            🌱
          </div>
          <span className="font-semibold text-green-600 dark:text-green-400">Garden Hub</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="p-2 -mr-2"
          aria-label="Close menu"
        >
          <XMarkIcon className="w-6 h-6" />
        </Button>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {user?.role}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
                           (item.href !== '/dashboard' && location.pathname.startsWith(item.href))
            
            return (
              <motion.div
                key={item.name}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <NavItem item={item} isActive={isActive} />
              </motion.div>
            )
          })}
        </div>

        {/* Divider */}
        <div className="pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-1">
            {secondaryNavigation.map((item) => {
              const isActive = location.pathname === item.href
              
              return (
                <motion.div
                  key={item.name}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <NavItem item={item} isActive={isActive} />
                </motion.div>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          <p>Garden Hub v1.0.0</p>
          <p className="mt-1">Made with 🌱 for gardeners</p>
        </div>
      </div>
    </div>
  )
}

export default Sidebar