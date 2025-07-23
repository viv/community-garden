import { useState, useEffect, useCallback } from 'react'
import { storageService } from '@services/storageService'

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize value from storage
  useEffect(() => {
    const loadValue = async () => {
      try {
        const item = await storageService.getItem<T>(key)
        if (item !== null) {
          setStoredValue(item)
        }
      } catch (error) {
        console.warn(`Failed to load ${key} from storage:`, error)
      } finally {
        setIsLoading(false)
      }
    }

    loadValue()
  }, [key])

  const setValue = useCallback(async (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      await storageService.setItem(key, valueToStore)
    } catch (error) {
      console.error(`Failed to save ${key} to storage:`, error)
    }
  }, [key, storedValue])

  const removeValue = useCallback(async () => {
    try {
      setStoredValue(initialValue)
      await storageService.removeItem(key)
    } catch (error) {
      console.error(`Failed to remove ${key} from storage:`, error)
    }
  }, [key, initialValue])

  return [storedValue, setValue, removeValue]
}