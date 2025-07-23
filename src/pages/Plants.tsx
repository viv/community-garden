import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BeakerIcon, 
  PlusIcon, 
  PhotoIcon,
  CalendarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

import Card, { CardHeader, CardTitle, CardBody } from '@components/UI/Card'
import Button from '@components/UI/Button'
import Badge from '@components/UI/Badge'
import Input from '@components/UI/Input'

const Plants = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Mock data - would come from API
  const plants = [
    {
      id: '1',
      name: 'Cherry Tomatoes',
      variety: 'Sweet 100',
      category: 'vegetable',
      plotId: 'A1',
      plantedDate: '2024-01-15',
      expectedHarvestDate: '2024-03-15',
      status: 'growing',
      growthStage: 'flowering',
      daysInStage: 12,
      photos: 3,
      lastMeasurement: { height: 45, unit: 'cm' },
      health: 'excellent'
    },
    {
      id: '2',
      name: 'Basil',
      variety: 'Sweet Genovese',
      category: 'herb',
      plotId: 'B1',
      plantedDate: '2024-01-10',
      expectedHarvestDate: '2024-02-20',
      status: 'ready',
      growthStage: 'mature',
      daysInStage: 5,
      photos: 2,
      lastMeasurement: { height: 20, unit: 'cm' },
      health: 'good'
    },
    {
      id: '3',
      name: 'Lettuce',
      variety: 'Buttercrunch',
      category: 'vegetable',
      plotId: 'A2',
      plantedDate: '2024-01-20',
      expectedHarvestDate: '2024-02-25',
      status: 'growing',
      growthStage: 'sprouting',
      daysInStage: 3,
      photos: 1,
      lastMeasurement: { height: 8, unit: 'cm' },
      health: 'good'
    }
  ]

  const filteredPlants = plants.filter(plant => {
    const matchesSearch = plant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plant.variety.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterCategory === 'all' || plant.category === filterCategory

    return matchesSearch && matchesFilter
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'seed':
        return <Badge variant="secondary">Seed</Badge>
      case 'sprouting':
        return <Badge variant="info">Sprouting</Badge>
      case 'growing':
        return <Badge variant="primary">Growing</Badge>
      case 'flowering':
        return <Badge variant="warning">Flowering</Badge>
      case 'ready':
        return <Badge variant="success">Ready</Badge>
      case 'harvested':
        return <Badge variant="default">Harvested</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent':
        return 'text-green-600 dark:text-green-400'
      case 'good':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'poor':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case 'vegetable':
        return '🥕'
      case 'herb':
        return '🌿'
      case 'flower':
        return '🌸'
      case 'fruit':
        return '🍓'
      default:
        return '🌱'
    }
  }

  const PlantCard = ({ plant }: { plant: typeof plants[0] }) => (
    <motion.div
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
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center text-xl">
                {getCategoryEmoji(plant.category)}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {plant.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {plant.variety}
                </p>
              </div>
            </div>
            {getStatusBadge(plant.growthStage)}
          </div>
        </CardHeader>

        <CardBody className="space-y-4">
          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-500 dark:text-gray-400">Growth Progress</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                Day {plant.daysInStage} in {plant.growthStage}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((plant.daysInStage / 30) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Plant Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Plot:</span>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {plant.plotId}
              </div>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Health:</span>
              <div className={`font-medium capitalize ${getHealthColor(plant.health)}`}>
                {plant.health}
              </div>
            </div>
          </div>

          {/* Planted Date */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Planted:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {new Date(plant.plantedDate).toLocaleDateString()}
            </span>
          </div>

          {/* Expected Harvest */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Expected harvest:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {new Date(plant.expectedHarvestDate).toLocaleDateString()}
            </span>
          </div>

          {/* Height */}
          {plant.lastMeasurement && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Height:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {plant.lastMeasurement.height} {plant.lastMeasurement.unit}
              </span>
            </div>
          )}

          {/* Photos */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Photos:</span>
            <div className="flex items-center space-x-1">
              <PhotoIcon className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {plant.photos}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1">
              View Details
            </Button>
            <Button variant="primary" size="sm" className="flex-1">
              Update
            </Button>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Plants
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track and monitor your plant growth
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline"
            leftIcon={<ChartBarIcon className="w-4 h-4" />}
          >
            Analytics
          </Button>
          <Button leftIcon={<PlusIcon className="w-4 h-4" />}>
            Add Plant
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {plants.length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total Plants
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {plants.filter(p => p.status === 'ready').length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Ready to Harvest
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {plants.filter(p => p.status === 'growing').length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Growing
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {plants.filter(p => p.health === 'excellent').length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Excellent Health
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search plants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            <option value="vegetable">Vegetables</option>
            <option value="herb">Herbs</option>
            <option value="flower">Flowers</option>
            <option value="fruit">Fruits</option>
          </select>

          <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm font-medium rounded-l-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm font-medium rounded-r-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </Card>

      {/* Plants Grid */}
      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredPlants.map((plant) => (
              <PlantCard key={plant.id} plant={plant} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {filteredPlants.map((plant) => (
              <motion.div
                key={plant.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center text-xl">
                        {getCategoryEmoji(plant.category)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {plant.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {plant.variety} • Plot {plant.plotId}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      {getStatusBadge(plant.growthStage)}
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {plant.lastMeasurement?.height} {plant.lastMeasurement?.unit}
                        </div>
                        <div className={`text-xs capitalize ${getHealthColor(plant.health)}`}>
                          {plant.health}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                        <Button variant="primary" size="sm">
                          Update
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* No results */}
      {filteredPlants.length === 0 && (
        <Card className="text-center py-12">
          <BeakerIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No plants found
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

export default Plants