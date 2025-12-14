import { getAppUrl, normalizeUrl } from "~/utils/api/url";

const ENFYRA_API_PREFIX = "/enfyra/api";

export interface StreamOptions {
  onMessage: (chunk: string) => void
  onComplete?: () => void
  onError?: (error: Error) => void
}

export const useStreamingAPI = () => {

  const connectSSE = (url: string, options: StreamOptions & { queryParams?: Record<string, string> }) => {
    const { queryParams, ...streamOptions } = options
    
    const config: any = useRuntimeConfig().public.enfyraSDK;
    const apiUrl = getAppUrl();
    const apiPrefix = config?.apiPrefix || ENFYRA_API_PREFIX;
    
    const basePath = url
      .replace(/^\/+/, "");
    
    const fullBaseURL = normalizeUrl(apiUrl, apiPrefix);
    
    let fullUrl = normalizeUrl(fullBaseURL, basePath);
    
    if (queryParams && Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams()
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      })
      fullUrl = `${fullUrl}?${params.toString()}`
    }

    const eventSource = new EventSource(fullUrl)
    let isCompleted = false
    let hasErrorBeenReported = false

    eventSource.onmessage = (event) => {
      if (isCompleted) {
        return
      }
      
      streamOptions.onMessage(event.data)
    }
    
    eventSource.onerror = (error) => {
      if (isCompleted) {
        eventSource.close()
        return
      }
      
      if (hasErrorBeenReported) {
        return
      }
      
      if (eventSource.readyState === EventSource.CLOSED) {
        hasErrorBeenReported = true
        eventSource.close()
        if (!isCompleted) {
          streamOptions.onError?.(new Error('SSE connection closed'))
        }
      } else if (eventSource.readyState === EventSource.CONNECTING) {
        return
      } else {
        hasErrorBeenReported = true
        streamOptions.onError?.(new Error('SSE connection error'))
      }
    }

    eventSource.addEventListener('done', () => {
      if (!isCompleted) {
        isCompleted = true
        hasErrorBeenReported = true
        eventSource.close()
        streamOptions.onComplete?.()
      }
    })

    return eventSource
  }

  return {
    connectSSE,
  }
}
