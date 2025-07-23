import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { syncService } from '@services/syncService'
import { useOffline } from './useOffline'

interface PhotoUploadOptions {
  maxSizeMB?: number
  maxWidth?: number
  maxHeight?: number
  quality?: number
}

interface PhotoUploadState {
  isUploading: boolean
  progress: number
  error: string | null
}

export function usePhotoUpload(plantId: string, options: PhotoUploadOptions = {}) {
  const [uploadState, setUploadState] = useState<PhotoUploadState>({
    isUploading: false,
    progress: 0,
    error: null
  })

  const { isOnline, addOfflineAction } = useOffline()

  const {
    maxSizeMB = 5,
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8
  } = options

  // Compress image before upload
  const compressImage = useCallback(async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width *= ratio
          height *= ratio
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size <= maxSizeMB * 1024 * 1024) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              })
              resolve(compressedFile)
            } else if (blob) {
              // If still too large, reduce quality further
              canvas.toBlob(
                (secondBlob) => {
                  if (secondBlob) {
                    const finalFile = new File([secondBlob], file.name, {
                      type: file.type,
                      lastModified: Date.now()
                    })
                    resolve(finalFile)
                  } else {
                    reject(new Error('Failed to compress image'))
                  }
                },
                file.type,
                quality * 0.7
              )
            } else {
              reject(new Error('Failed to compress image'))
            }
          },
          file.type,
          quality
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }, [maxSizeMB, maxWidth, maxHeight, quality])

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!isOnline) {
        throw new Error('Upload requires internet connection')
      }

      return syncService.uploadPhoto(
        plantId,
        file,
        (progress) => {
          setUploadState(prev => ({ ...prev, progress }))
        }
      )
    },
    onMutate: () => {
      setUploadState({
        isUploading: true,
        progress: 0,
        error: null
      })
    },
    onSuccess: (data) => {
      setUploadState({
        isUploading: false,
        progress: 100,
        error: null
      })
      toast.success('Photo uploaded successfully!')
      return data
    },
    onError: (error: Error) => {
      setUploadState({
        isUploading: false,
        progress: 0,
        error: error.message
      })
      toast.error(`Upload failed: ${error.message}`)
    }
  })

  const uploadPhoto = useCallback(async (file: File) => {
    try {
      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file')
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        // Compress the image
        const compressedFile = await compressImage(file)
        file = compressedFile
      }

      if (isOnline) {
        return await uploadMutation.mutateAsync(file)
      } else {
        // Store for offline upload
        const reader = new FileReader()
        reader.onload = () => {
          const photoData = {
            name: file.name,
            type: file.type,
            size: file.size,
            data: reader.result as string,
            uploadedAt: new Date().toISOString()
          }

          addOfflineAction({
            type: 'UPLOAD_PHOTO',
            data: {
              plantId,
              photo: photoData
            }
          })

          toast.success('Photo saved for upload when online')
        }
        reader.readAsDataURL(file)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed'
      setUploadState(prev => ({ ...prev, error: message }))
      toast.error(message)
      throw error
    }
  }, [
    plantId,
    maxSizeMB,
    compressImage,
    isOnline,
    uploadMutation,
    addOfflineAction
  ])

  const uploadMultiple = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const results = []

    for (const file of fileArray) {
      try {
        const result = await uploadPhoto(file)
        results.push({ file: file.name, success: true, data: result })
      } catch (error) {
        results.push({ 
          file: file.name, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    return results
  }, [uploadPhoto])

  const resetState = useCallback(() => {
    setUploadState({
      isUploading: false,
      progress: 0,
      error: null
    })
  }, [])

  return {
    uploadPhoto,
    uploadMultiple,
    resetState,
    ...uploadState
  }
}