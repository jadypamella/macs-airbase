import { useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'

/**
 * Reusable hook for calling the backend API via the Supabase edge function proxy.
 */
export function useApiProxy() {
  const call = useCallback(async <T = unknown>(
    endpoint: string,
    method: string = 'GET',
    body?: Record<string, unknown>
  ): Promise<T | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('api-proxy', {
        body: { endpoint, method, body },
      })
      if (error) throw error
      return data as T
    } catch (e) {
      console.error(`API proxy error [${method} ${endpoint}]:`, e)
      return null
    }
  }, [])

  return { call }
}
