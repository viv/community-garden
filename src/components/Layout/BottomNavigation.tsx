import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  HomeIcon,
  MapIcon,
  BeakerIcon,
  DropletIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  MapIcon as MapIconSolid,
  BeakerIcon as BeakerIconSolid,
  DropletIcon as DropletIconSolid,
  ClipboardDocumentListIcon as ClipboardDocumentListIconSolid
} from '@heroicons/react/24/solid'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  iconSolid: React.ComponentType<{ className?: string }>
  badge?: number
}

const navigation: NavItem[] = [
  {
    name: 'Home',
    href: '/dashboard',
    icon: HomeIcon,
    iconSolid: HomeIconSolid
  },
  {
    name: 'Plots',
    href: '/plots',
    icon: MapIcon,
    iconSolid: MapIconSolid
  },
  {
    name: 'Plants',
    href: '/plants',
    icon: BeakerIcon,
    iconSolid: BeakerIconSolid
  },
  {
    name: 'Water',
    href: '/watering',
    icon: DropletIcon,
    iconSolid: DropletIconSolid,
    badge: 3
  },
  {
    name: 'Tasks',
    href: '/tasks',
    icon: ClipboardDocumentListIcon,
    iconSolid: ClipboardDocumentListIconSolid,
    badge: 2
  }
]

const BottomNavigation = () => {
  const location = useLocation()

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-bottom z-30">
      <nav className="flex justify-around items-center h-16 px-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href || 
                         (item.href !== '/dashboard' && location.pathname.startsWith(item.href))
          const Icon = isActive ? item.iconSolid : item.icon

          return (
            <NavLink
              key={item.name}
              to={item.href}
              className="flex flex-col items-center justify-center flex-1 h-full relative group"
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={`flex flex-col items-center justify-center space-y-1 p-2 rounded-lg transition-colors duration-200
                          ${isActive 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100'
                          }`}
              >
                <div className="relative">
                  <Icon className="w-6 h-6" />
                  {item.badge && (
                    <span className="absolute -top-2 -right-2 inline-flex items-center justify-center 
                                   w-4 h-4 text-xs font-medium text-white bg-red-500 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-xs font-medium transition-colors duration-200
                                ${isActive 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100'
                                }`}>
                  {item.name}
                </span>
              </motion.div>

              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute top-0 left-1/2 w-8 h-1 bg-green-500 rounded-full"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  style={{ x: '-50%' }}
                />
              )}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}

export default BottomNavigation