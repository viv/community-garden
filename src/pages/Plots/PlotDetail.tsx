import React from 'react'
import { useParams } from 'react-router-dom'

const PlotDetail: React.FC = () => {
  const { plotId } = useParams<{ plotId: string }>()

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Plot Detail
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Plot ID: {plotId}
        </p>
        <div className="mt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This is a placeholder component for plot details.
          </p>
        </div>
      </div>
    </div>
  )
}

export default PlotDetail