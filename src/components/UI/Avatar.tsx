import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const avatarVariants = cva(
  'inline-flex items-center justify-center rounded-full bg-gray-500 text-white font-medium overflow-hidden',
  {
    variants: {
      size: {
        xs: 'w-6 h-6 text-xs',
        sm: 'w-8 h-8 text-sm',
        md: 'w-10 h-10 text-base',
        lg: 'w-12 h-12 text-lg',
        xl: 'w-16 h-16 text-xl',
        '2xl': 'w-20 h-20 text-2xl'
      }
    },
    defaultVariants: {
      size: 'md'
    }
  }
)

export interface AvatarProps extends VariantProps<typeof avatarVariants> {
  src?: string
  alt?: string
  fallback?: string
  className?: string
  onClick?: () => void
}

const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  alt, 
  fallback = '?', 
  size, 
  className,
  onClick 
}) => {
  const [imageError, setImageError] = React.useState(false)
  const [imageLoaded, setImageLoaded] = React.useState(false)

  const handleImageError = () => {
    setImageError(true)
    setImageLoaded(false)
  }

  const handleImageLoad = () => {
    setImageLoaded(true)
    setImageError(false)
  }

  const showImage = src && !imageError && imageLoaded
  const showFallback = !src || imageError || !imageLoaded

  return (
    <div 
      className={avatarVariants({ size, className })}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {src && (
        <img
          src={src}
          alt={alt || 'Avatar'}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            showImage ? 'opacity-100' : 'opacity-0'
          }`}
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      )}
      
      {showFallback && (
        <span className={`transition-opacity duration-200 ${
          showImage ? 'opacity-0 absolute' : 'opacity-100'
        }`}>
          {fallback.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  )
}

export default Avatar