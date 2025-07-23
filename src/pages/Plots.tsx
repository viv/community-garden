import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  MapIcon, 
  PlusIcon, 
  FunnelIcon,
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline'

import Card, { CardHeader, CardTitle, CardBody } from '@components/UI/Card'
import Button from '@components/UI/Button'
import Badge from '@components/UI/Badge'
import Input from '@components/UI/Input'

const Plots = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  // Mock data - would come from API
  const plots = [
    {
      id: 'A1',
      number: 'A1',
      assignedTo: 'John Doe',
      dimensions: { width: 4, height: 6 },
      soilType: 'loam',
      sunExposure: 'full',
      status: 'assigned',
      plants: 5,
      lastWatered: '2024-01-20',
      notes: 'Tomatoes and peppers growing well'
    },
    {
      id: 'A2',
      number: 'A2',
      assignedTo: null,
      dimensions: { width: 3, height: 4 },
      soilType: 'sandy',
      sunExposure: 'partial',
      status: 'available',
      plants: 0,
      lastWatered: null,
      notes: ''
    },
    {
      id: 'B1',
      number: 'B1',
      assignedTo: 'Sarah Johnson',
      dimensions: { width: 5, height: 5 },
      soilType: 'clay',
      sunExposure: 'full',
      status: 'assigned',
      plants: 8,
      lastWatered: '2024-01-19',
      notes: 'Herb garden with excellent drainage'
    },
    {
      id: 'B2',
      number: 'B2',
      assignedTo: 'Mike Wilson',
      dimensions: { width: 4, height: 4 },
      soilType: 'loam',
      sunExposure: 'shade',
      status: 'maintenance',
      plants: 0,
      lastWatered: null,
      notes: 'Soil improvement needed'
    }
  ]

  const filteredPlots = plots.filter(plot => {
    const matchesSearch = plot.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plot.assignedTo?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || plot.status === filterStatus

    return matchesSearch && matchesFilter
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge variant="success">Available</Badge>
      case 'assigned':
        return <Badge variant="primary">Assigned</Badge>
      case 'maintenance':
        return <Badge variant="warning">Maintenance</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getSunExposureIcon = (exposure: string) => {
    switch (exposure) {
      case 'full':
        return '☀️'
      case 'partial':
        return '⛅'
      case 'shade':
        return '🌥️'
      default:
        return '☀️'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Garden Plots
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and monitor your garden plots
          </p>
        </div>
        <Button leftIcon={<PlusIcon className="w-4 h-4" />}>
          Add Plot
        </Button>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search plots or gardeners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <FunnelIcon className="w-4 h-4 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Garden Map Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span>Garden Layout</span>
          </CardTitle>
        </CardHeader>
        <CardBody>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 min-h-64 flex items-center justify-center">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <MapIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Interactive garden map coming soon</p>
              <p className="text-sm">Click and drag to arrange plots visually</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Plots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlots.map((plot) => (
          <motion.div
            key={plot.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card 
              clickable
              className="hover:shadow-lg transition-shadow duration-200"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {plot.number}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        Plot {plot.number}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {plot.dimensions.width}m × {plot.dimensions.height}m
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(plot.status)}
                </div>
              </CardHeader>

              <CardBody className="space-y-4">
                {/* Gardener Info */}
                {plot.assignedTo ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        {plot.assignedTo.charAt(0)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {plot.assignedTo}
                    </span>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    No gardener assigned
                  </div>
                )}

                {/* Plot Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Soil:</span>
                    <div className="font-medium capitalize text-gray-900 dark:text-gray-100">
                      {plot.soilType}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Sun:</span>
                    <div className="font-medium flex items-center space-x-1 text-gray-900 dark:text-gray-100">
                      <span>{getSunExposureIcon(plot.sunExposure)}</span>
                      <span className="capitalize">{plot.sunExposure}</span>
                    </div>
                  </div>
                </div>

                {/* Plant Count */}
                {plot.plants > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Plants:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {plot.plants} active
                    </span>
                  </div>
                )}

                {/* Last Watered */}
                {plot.lastWatered && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Last watered:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {new Date(plot.lastWatered).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {/* Notes */}
                {plot.notes && (
                  <div className="text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Notes:</span>
                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                      {plot.notes}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    View Details
                  </Button>
                  {plot.status === 'assigned' && (
                    <Button variant="primary" size="sm" className="flex-1">
                      Manage
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* No results */}
      {filteredPlots.length === 0 && (
        <Card className="text-center py-12">
          <MapIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No plots found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Try adjusting your search or filter criteria
          </p>
          <Button variant="outline">
            Clear Filters
          </Button>
        </Card>
      )}
    </div>
  )
}

export default Plots