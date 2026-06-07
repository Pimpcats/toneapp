import { useCallback, useEffect, useState } from 'react'

// A tiny typed localStorage-backed state hook. Reads once on mount, writes on
// change, and tolerates private-mode / quota errors gracefully.
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // ignore write errors (private mode, quota, etc.)
    }
  }, [key, value])

  const reset = useCallback(() => setValue(initial), [initial])

  return [value, setValue, reset] as const
}
