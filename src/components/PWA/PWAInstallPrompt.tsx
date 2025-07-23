import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  XMarkIcon, 
  ArrowDownTrayIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline'

import { usePWA } from '@hooks/usePWA'
import Button from '@components/UI/Button'
import Card from '@components/UI/Card'

const PWAInstallPrompt = () => {
  const { platform, install, dismissInstallPrompt } = usePWA()

  const getInstallInstructions = () => {
    switch (platform) {
      case 'ios':
        return {
          title: 'Install Garden Hub',
          description: 'Add to your home screen for quick access',
          steps: [
            'Tap the share button at the bottom of your screen',
            'Scroll down and tap "Add to Home Screen"',
            'Tap "Add" to confirm'
          ],
          icon: DevicePhoneMobileIcon
        }
      case 'android':
        return {
          title: 'Install Garden Hub',
          description: 'Get the full app experience',
          steps: [
            'Tap "Install" below',
            'Follow the browser prompts',
            'Find the app on your home screen'
          ],
          icon: DevicePhoneMobileIcon
        }
      default:
        return {
          title: 'Install Garden Hub',
          description: 'Install for offline access and better performance',
          steps: [
            'Click "Install" below',
            'Follow the browser prompts',
            'Access from your desktop or taskbar'
          ],
          icon: ComputerDesktopIcon
        }
    }
  }

  const installInfo = getInstallInstructions()
  const Icon = installInfo.icon

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-4"
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-sm"
        >
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white text-xl">
                  🌱
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {installInfo.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {installInfo.description}
                  </p>
                </div>
              </div>
              
              <button
                onClick={dismissInstallPrompt}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-3">
                <Icon className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Benefits of installing:
                </span>
              </div>
              
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Work offline when no internet is available</li>
                <li>• Faster loading and better performance</li>
                <li>• Quick access from your home screen</li>
                <li>• Native app-like experience</li>
              </ul>
            </div>

            {platform === 'ios' ? (
              <div className="space-y-3">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">How to install:</span>
                  <ol className="mt-2 space-y-1 list-decimal list-inside">
                    {installInfo.steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            ) : (
              <div className="flex space-x-3">
                <Button
                  onClick={install}
                  className="flex-1"
                  leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
                >
                  Install App
                </Button>
                
                <Button
                  variant="outline"
                  onClick={dismissInstallPrompt}
                >
                  Not now
                </Button>
              </div>
            )}

            {platform === 'ios' && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={dismissInstallPrompt}
                  fullWidth
                  size="sm"
                >
                  Maybe later
                </Button>
              </div>
            )}
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default PWAInstallPrompt