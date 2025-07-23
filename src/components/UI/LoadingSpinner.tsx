import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const spinnerVariants = cva(
  'inline-block animate-spin rounded-full border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]',
  {
    variants: {
      size: {
        xs: 'w-4 h-4 border-2',
        sm: 'w-6 h-6 border-2',
        md: 'w-8 h-8 border-2',
        lg: 'w-12 h-12 border-3',
        xl: 'w-16 h-16 border-4'
      },
      color: {
        primary: 'text-green-600',
        secondary: 'text-gray-600',
        white: 'text-white',
        current: 'text-current'
      }
    },
    defaultVariants: {
      size: 'md',
      color: 'primary'
    }
  }
)

export interface LoadingSpinnerProps extends VariantProps<typeof spinnerVariants> {
  className?: string
  label?: string
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size, 
  color, 
  className,
  label = 'Loading...'
}) => {
  return (
    <div className="flex items-center justify-center">
      <div
        className={spinnerVariants({ size, color, className })}
        role="status"
        aria-label={label}
      >
        <span className="sr-only">{label}</span>
      </div>
    </div>
  )
}

export default LoadingSpinner