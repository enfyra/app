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

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: streamOptions.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('Response body is not readable')
      }

      // Read stream
      while (true) {
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
      if (error instanceof Error) {
        streamOptions.onError?.(error)
      }
    }
  }

  /**
   * Server-Sent Events (SSE)
   * Alternative approach using EventSource
   */
  const connectSSE = (url: string, options: StreamOptions) => {
    const eventSource = new EventSource(url)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const content = data.content || data.text || event.data
        options.onMessage(content)
      } catch {
        options.onMessage(event.data)
      }
    }

    eventSource.onerror = (error) => {
      eventSource.close()
      options.onError?.(new Error('SSE connection error'))
    }

    // Listen for completion event
    eventSource.addEventListener('done', () => {
      eventSource.close()
      options.onComplete?.()
    })

    return eventSource
  }

  return {
    fetchStream,
    connectSSE,
  }
}
