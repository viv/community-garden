import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HomeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'

import Button from '@components/UI/Button'
import Card from '@components/UI/Card'

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🌱</span>
          </div>
          
          <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            404
          </h1>
          
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Page Not Found
          </h2>
          
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Oops! The page you're looking for seems to have wandered off into the garden. 
            Let's help you find your way back.
          </p>

          <div className="space-y-4">
            <Link to="/dashboard">
              <Button 
                fullWidth
                leftIcon={<HomeIcon className="w-4 h-4" />}
              >
                Go to Dashboard
              </Button>
            </Link>
            
            <Button 
              variant="outline"
              fullWidth
              onClick={() => window.history.back()}
              leftIcon={<ArrowLeftIcon className="w-4 h-4" />}
            >
              Go Back
            </Button>
          </div>
        </Card>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            If you believe this is an error, please{' '}
            <Link to="/help" className="text-green-600 hover:text-green-500">
              contact support
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default NotFound