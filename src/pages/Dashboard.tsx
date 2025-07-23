import React from 'react'
import { motion } from 'framer-motion'
import {
  MapIcon,
  BeakerIcon,
  DropletIcon,
  StarIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  SunIcon
} from '@heroicons/react/24/outline'

import { useAuth } from '@hooks/useAuth'
import Card, { CardHeader, CardTitle, CardBody } from '@components/UI/Card'
import Button from '@components/UI/Button'
import Badge from '@components/UI/Badge'
import Avatar from '@components/UI/Avatar'

const Dashboard = () => {
  const { user } = useAuth()

  // Mock data - would come from API
  const stats = {
    totalPlots: 12,
    activePlots: 8,
    totalPlants: 45,
    readyToHarvest: 7,
    pendingTasks: 5,
    wateringDue: 3
  }

  const recentActivity = [
    {
      id: 1,
      type: 'harvest',
      description: 'Harvested 2kg tomatoes from Plot A3',
      time: '2 hours ago',
      user: 'John Doe'
    },
    {
      id: 2,
      type: 'watering',
      description: 'Watered Plot B2 - Lettuce bed',
      time: '4 hours ago',
      user: 'Sarah Johnson'
    },
    {
      id: 3,
      type: 'planting',
      description: 'Planted carrots in Plot C1',
      time: '6 hours ago',
      user: 'Mike Wilson'
    }
  ]

  const upcomingTasks = [
    {
      id: 1,
      title: 'Water greenhouse plants',
      priority: 'high' as const,
      dueTime: '30 min',
      plot: 'Greenhouse A'
    },
    {
      id: 2,
      title: 'Harvest cherry tomatoes',
      priority: 'medium' as const,
      dueTime: '2 hours',
      plot: 'Plot A3'
    },
    {
      id: 3,
      title: 'Apply fertilizer to herbs',
      priority: 'low' as const,
      dueTime: 'Tomorrow',
      plot: 'Herb Garden'
    }
  ]

  const quickActions = [
    {
      name: 'Log Watering',
      icon: DropletIcon,
      color: 'bg-blue-500',
      href: '/watering'
    },
    {
      name: 'Record Harvest',
      icon: StarIcon,
      color: 'bg-yellow-500',
      href: '/harvests'
    },
    {
      name: 'Add Plant',
      icon: BeakerIcon,
      color: 'bg-green-500',
      href: '/plants'
    },
    {
      name: 'Create Task',
      icon: PlusIcon,
      color: 'bg-purple-500',
      href: '/tasks'
    }
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Welcome Section */}
      <motion.div variants={itemVariants}>
        <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                Welcome back, {user?.name}! 🌱
              </h1>
              <p className="text-green-100">
                Here's what's happening in your garden today
              </p>
            </div>
            <div className="hidden md:flex items-center space-x-2">
              <SunIcon className="w-8 h-8 text-yellow-300" />
              <div className="text-right">
                <div className="text-lg font-semibold">24°C</div>
                <div className="text-sm text-green-100">Sunny</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <MapIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.activePlots}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Active Plots
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <BeakerIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.totalPlants}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Total Plants
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <StarIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.readyToHarvest}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Ready to Harvest
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <ClipboardDocumentListIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.pendingTasks}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Pending Tasks
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <DropletIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.wateringDue}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Watering Due
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                <ChartBarIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  87%
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Garden Health
                </div>
              </div>
            </div>
          </Card>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <motion.a
                  key={action.name}
                  href={action.href}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex flex-col items-center p-6 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 
                           hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 
                           transition-colors duration-200 group"
                >
                  <div className={`${action.color} p-3 rounded-lg mb-3 group-hover:scale-110 transition-transform duration-200`}>
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-center">
                    {action.name}
                  </span>
                </motion.a>
              ))}
            </div>
          </CardBody>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Tasks */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Upcoming Tasks</CardTitle>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {upcomingTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {task.priority === 'high' && (
                          <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                        )}
                        <Badge 
                          variant={
                            task.priority === 'high' ? 'danger' : 
                            task.priority === 'medium' ? 'warning' : 'default'
                          }
                          size="xs"
                        >
                          {task.priority}
                        </Badge>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {task.title}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {task.plot} • Due in {task.dueTime}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Complete
                    </Button>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <Avatar
                      fallback={activity.user.charAt(0)}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        <span className="font-medium">{activity.user}</span>{' '}
                        {activity.description}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {activity.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default Dashboard