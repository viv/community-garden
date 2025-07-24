import React from 'react'

const Help: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Help
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          This is a placeholder component for help documentation.
        </p>
      </div>
    </div>
  )
}

export default Help