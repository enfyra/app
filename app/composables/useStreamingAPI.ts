/**
 * Composable for handling streaming API responses
 * Supports Server-Sent Events (SSE) and streaming fetch
 */

export interface StreamOptions {
  onMessage: (chunk: string) => void
  onComplete?: () => void
  onError?: (error: Error) => void
  signal?: AbortSignal
}

export const useStreamingAPI = () => {
  /**
   * Fetch with streaming response
   * Example: OpenAI-style streaming
   */
  const fetchStream = async (url: string, options: RequestInit & { streamOptions: StreamOptions }) => {
    const { streamOptions, ...fetchOptions } = options
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined = undefined
    let abortHandler: (() => void) | undefined = undefined

    console.log('[fetchStream] Starting fetch, signal:', streamOptions.signal)

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: streamOptions.signal,
      })

      console.log('[fetchStream] Fetch response received, status:', response.status)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('Response body is not readable')
      }

      // Listen to abort signal and cancel reader immediately
      abortHandler = () => {
        console.log('[fetchStream] Abort handler called! Cancelling reader...')
        if (reader) {
          reader.cancel().catch((err) => {
            // Ignore AbortError - it's expected when cancelling
            if (err.name !== 'AbortError') {
              console.error('[fetchStream] Error cancelling reader on abort:', err)
            } else {
              console.log('[fetchStream] Reader cancelled successfully (AbortError is expected)')
            }
          })
        } else {
          console.warn('[fetchStream] Abort handler called but reader is undefined')
        }
      }

      if (streamOptions.signal) {
        streamOptions.signal.addEventListener('abort', abortHandler)
        console.log('[fetchStream] Abort listener added to signal')
      } else {
        console.warn('[fetchStream] No abort signal provided')
      }

      // Read stream
      while (true) {
        // Check if aborted before reading next chunk
        if (streamOptions.signal?.aborted) {
          break
        }

        const { done, value } = await reader.read()

        if (done) {
          streamOptions.onComplete?.()
          break
        }

        // Decode chunk
        const chunk = decoder.decode(value, { stream: true })

        // Parse streaming data (adjust based on your API format)
        const lines = chunk.split('\n').filter(line => line.trim() !== '')

        for (const line of lines) {
          try {
            // Handle different streaming formats
            if (line.startsWith('data: ')) {
              const data = line.slice(6) // Remove 'data: ' prefix

              if (data === '[DONE]') {
                if (reader) {
                  await reader.cancel()
                }
                streamOptions.onComplete?.()
                return
              }

              // Parse JSON if needed and pass to consumer
              streamOptions.onMessage(data)
            } else {
              // Plain text streaming
              streamOptions.onMessage(line)
            }
          } catch (err) {
            console.error('Error parsing line:', err)
          }
        }
      }
    } catch (error) {
      // Ensure reader is cancelled when aborting
      if (reader) {
        try {
          await reader.cancel()
        } catch (cancelError) {
          console.error('Error cancelling reader:', cancelError)
        }
      }

      if (error instanceof Error) {
        streamOptions.onError?.(error)
      }
    } finally {
      // Cleanup abort listener
      if (streamOptions.signal && abortHandler) {
        streamOptions.signal.removeEventListener('abort', abortHandler)
      }
    }
  }

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
    fetchStream,
    connectSSE,
  }
}
