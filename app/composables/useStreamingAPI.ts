export interface StreamOptions {
  onMessage: (chunk: string) => void
  onComplete?: () => void
  onError?: (error: Error) => void
}

export const useStreamingAPI = () => {

  const connectSSE = (url: string, options: StreamOptions & { queryParams?: Record<string, string> }) => {
    const { queryParams, ...streamOptions } = options
    
    let fullUrl = url
    if (queryParams && Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams()
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      })
      fullUrl = `${url}?${params.toString()}`
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
