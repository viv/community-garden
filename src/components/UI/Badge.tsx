import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const badgeVariants = cva(
  'inline-flex items-center rounded-full font-medium',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
        primary: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
        secondary: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
        success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
        warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
        danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
        info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
        outline: 'border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300'
      },
      size: {
        xs: 'px-2 py-0.5 text-xs',
        sm: 'px-2.5 py-0.5 text-xs',
        md: 'px-3 py-1 text-sm',
        lg: 'px-4 py-1.5 text-sm'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm'
    }
  }
)

export interface BadgeProps 
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  children: React.ReactNode
}

const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant, 
  size, 
  className,
  ...props 
}) => {
  return (
    <span 
      className={badgeVariants({ variant, size, className })}
      {...props}
    >
      {children}
    </span>
  )
}

export default Badge