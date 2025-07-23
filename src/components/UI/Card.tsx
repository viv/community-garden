import React from 'react'
import { motion } from 'framer-motion'
import { cva, type VariantProps } from 'class-variance-authority'

const cardVariants = cva(
  'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-shadow duration-200',
  {
    variants: {
      variant: {
        default: 'hover:shadow-md',
        elevated: 'shadow-lg hover:shadow-xl',
        outlined: 'border-2 hover:border-gray-300 dark:hover:border-gray-600',
        flat: 'shadow-none border-0'
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8'
      }
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md'
    }
  }
)

export interface CardProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  children: React.ReactNode
  clickable?: boolean
  loading?: boolean
}

const Card: React.FC<CardProps> = ({ 
  children, 
  variant, 
  padding, 
  clickable,
  loading,
  className,
  onClick,
  ...props 
}) => {
  const cardClassName = cardVariants({ 
    variant, 
    padding, 
    className: `${clickable ? 'cursor-pointer' : ''} ${className}` 
  })

  const CardComponent = clickable ? motion.div : 'div'
  const motionProps = clickable ? {
    whileHover: { y: -2 },
    whileTap: { scale: 0.98 }
  } : {}

  if (loading) {
    return (
      <div className={cardClassName} {...props}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        </div>
      </div>
    )
  }

  return (
    <CardComponent
      className={cardClassName}
      onClick={onClick}
      {...motionProps}
      {...props}
    >
      {children}
    </CardComponent>
  )
}

// Card sub-components
const CardHeader: React.FC<{ 
  children: React.ReactNode
  className?: string 
}> = ({ children, className = '' }) => (
  <div className={`pb-4 border-b border-gray-200 dark:border-gray-700 ${className}`}>
    {children}
  </div>
)

const CardTitle: React.FC<{ 
  children: React.ReactNode
  className?: string 
}> = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold text-gray-900 dark:text-gray-100 ${className}`}>
    {children}
  </h3>
)

const CardDescription: React.FC<{ 
  children: React.ReactNode
  className?: string 
}> = ({ children, className = '' }) => (
  <p className={`text-sm text-gray-600 dark:text-gray-400 ${className}`}>
    {children}
  </p>
)

const CardBody: React.FC<{ 
  children: React.ReactNode
  className?: string 
}> = ({ children, className = '' }) => (
  <div className={`pt-4 ${className}`}>
    {children}
  </div>
)

const CardFooter: React.FC<{ 
  children: React.ReactNode
  className?: string 
}> = ({ children, className = '' }) => (
  <div className={`pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 ${className}`}>
    {children}
  </div>
)

// Export all components
export default Card
export { CardHeader, CardTitle, CardDescription, CardBody, CardFooter }