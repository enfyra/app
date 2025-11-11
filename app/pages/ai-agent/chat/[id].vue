<script setup lang="ts">
import { marked } from 'marked'
import hljs from 'highlight.js'

const route = useRoute()
const conversationId = computed(() => route.params.id)
const { getIdFieldName } = useDatabase()

// Configure marked options
marked.setOptions({
  breaks: true,
  gfm: true,
})

// Setup syntax highlighting renderer
const renderer = new marked.Renderer()
renderer.code = function({ text, lang }: { text: string; lang?: string }): string {
  if (lang && hljs.getLanguage(lang)) {
    try {
      const highlighted = hljs.highlight(text, { language: lang }).value
      return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`
    } catch (err) {
      console.error('Highlight error:', err)
    }
  }
  const highlighted = hljs.highlightAuto(text).value
  return `<pre><code class="hljs">${highlighted}</code></pre>`
}

marked.use({ renderer })

interface Message {
  id: string
  type: 'user' | 'bot'
  content: string
  timestamp: Date
  isMarkdown?: boolean
  isStreaming?: boolean
}

// Messages list
const messages = ref<Message[]>([])

const inputMessage = ref('')
const isTyping = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)
const { isMobile, isTablet } = useScreen()
const { fetchStream } = useStreamingAPI()
const abortController = ref<AbortController | null>(null)
const { isMounted } = useMounted()

// Config drawer
const showConfigDrawer = ref(false)
const selectedAiConfig = ref<any>(null)
const { aiConfig } = useGlobalState()

// Pagination for chat history
const historyPage = ref(1)
const historyLimit = 20
const hasMoreHistory = ref(false)
const isLoadingMore = ref(false)

// Load chat history for this conversation
const {
  data: historyData,
  pending: loadingHistory,
  execute: loadChatHistory,
} = useApi(() => '/ai_message_definition', {
  query: computed(() => {
    const idField = getIdFieldName()
    return {
      fields: ['*'].join(','),
      sort: ['-createdAt'].join(','),
      meta: '*',
      limit: historyLimit,
      page: historyPage.value,
      filter: {
        conversation: {
          [idField]: {
            _eq: conversationId.value,
          },
        },
      },
    }
  }),
  errorContext: 'Load Chat History',
})

// Watch history data and update messages
watch(historyData, (data) => {
  if (data?.data) {
    if (data.data.length > 0) {
      const newMessages = data.data.map((item: any) => ({
        id: item.id.toString(),
        type: item.role === 'user' ? 'user' : 'bot',
        content: item.content,
        timestamp: new Date(item.createdAt),
        isMarkdown: item.role === 'assistant',
      })).reverse()

      // If first page, replace all messages
      if (historyPage.value === 1) {
        messages.value = newMessages
      } else {
        // If loading more, prepend to existing messages
        messages.value = [...newMessages, ...messages.value]
      }
    }

    // Reset loading more flag
    if (historyPage.value > 1) {
      isLoadingMore.value = false
    }

    // Always check if there are more messages based on meta
    const total = data.meta?.totalCount || 0
    const currentCount = historyPage.value * historyLimit
    hasMoreHistory.value = currentCount < total
  }
}, { immediate: true })

// Load more history
const loadMoreHistory = async () => {
  if (loadingHistory.value || !hasMoreHistory.value || isLoadingMore.value) return

  isLoadingMore.value = true
  const scrollHeightBefore = messagesContainer.value?.scrollHeight || 0

  historyPage.value++

  try {
    await loadChatHistory()

    // Maintain scroll position after loading more
    nextTick(() => {
      if (messagesContainer.value) {
        const scrollHeightAfter = messagesContainer.value.scrollHeight
        messagesContainer.value.scrollTop = scrollHeightAfter - scrollHeightBefore
      }
    })
  } catch (error) {
    console.error('Load more history error:', error)
    isLoadingMore.value = false
  }
}

// Watch loading state and scroll when done (only for initial load, not for load more)
watch(loadingHistory, (isLoading) => {
  if (!isLoading && messages.value.length > 0 && !isLoadingMore.value && historyPage.value === 1) {
    // Wait for DOM to fully render
    setTimeout(() => {
      scrollToBottom(true)
    }, 150)
  }
})

// Auto scroll to bottom when new message
const scrollToBottom = (smooth = false) => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTo({
        top: messagesContainer.value.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      })
    }
  })
}

// Render markdown to HTML
const renderMarkdown = (content: string) => {
  return marked(content)
}

// Copy code to clipboard
const copyCode = async (code: string) => {
  try {
    await navigator.clipboard.writeText(code)
    // TODO: Show toast notification
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

// Send message with streaming
const sendMessage = async () => {
  if (!inputMessage.value.trim() || isTyping.value) return

  const userMsg = inputMessage.value
  inputMessage.value = ''

  // Add user message
  messages.value.push({
    id: Date.now().toString(),
    type: 'user',
    content: userMsg,
    timestamp: new Date(),
  })

  // Create bot message placeholder
  const botMessageId = (Date.now() + 1).toString()
  messages.value.push({
    id: botMessageId,
    type: 'bot',
    content: '',
    timestamp: new Date(),
    isMarkdown: true,
    isStreaming: true,
  })

  isTyping.value = true
  scrollToBottom()

  // Create abort controller for cancellation
  abortController.value = new AbortController()

  try {
    // API endpoint
    const apiUrl = '/enfyra/api/ai-agent/chat/stream'

    await fetchStream(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userMsg,
        config: 1,
        conversation: conversationId.value,
      }),
      streamOptions: {
        signal: abortController.value.signal,
        onMessage: (chunk: string) => {
          try {
            const json = JSON.parse(chunk)

            // Handle different event types
            if (json.type === 'text' && json.data?.delta) {
              const botMessage = messages.value.find(m => m.id === botMessageId)
              if (botMessage) {
                botMessage.content += json.data.delta
                scrollToBottom(true)
              }
            } else if (json.type === 'error') {
              // Streaming error from backend
              const botMessage = messages.value.find(m => m.id === botMessageId)
              if (botMessage) {
                botMessage.isStreaming = false
                botMessage.content = json.data?.error || 'Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu.'
              }
              isTyping.value = false
              scrollToBottom(true)
            } else if (json.type === 'done') {
              // Streaming done
              const botMessage = messages.value.find(m => m.id === botMessageId)
              if (botMessage) {
                botMessage.isStreaming = false
              }
              isTyping.value = false
              scrollToBottom(true)
            }
          } catch (err) {
            console.error('Parse chunk error:', err, chunk)
          }
        },
        onComplete: () => {
          const botMessage = messages.value.find(m => m.id === botMessageId)
          if (botMessage) {
            botMessage.isStreaming = false
          }
          isTyping.value = false
          scrollToBottom(true)
        },
        onError: (error: Error) => {
          console.error('Streaming error:', error)
          const botMessage = messages.value.find(m => m.id === botMessageId)
          if (botMessage) {
            botMessage.isStreaming = false
            if (!botMessage.content) {
              botMessage.content = 'Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu.'
            }
          }
          isTyping.value = false
        },
      },
    })
  } catch (error) {
    console.error('Send message error:', error)
    isTyping.value = false
  }
}

// Stop streaming
const stopStreaming = () => {
  if (abortController.value) {
    abortController.value.abort()
    abortController.value = null
    isTyping.value = false
  }
}

// Format timestamp
const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

onMounted(async () => {
  await loadChatHistory()

  // Disable parent section scroll
  const section = document.querySelector('section.overflow-y-auto')
  if (section) {
    section.classList.add('!overflow-hidden')
  }

  setTimeout(() => {
    scrollToBottom(true)
  }, 500)
})

</script>

<template>
  <div
    class="flex flex-col bg-gray-950 overflow-hidden -m-3 md:-m-6"
    :style="{
      height: 'calc(100vh - 60px)',
      marginBottom: isMobile || isTablet ? '-8rem' : '-1.5rem'
    }"
  >
    <!-- Header -->
    <div class="bg-gray-900/80 backdrop-blur-sm flex-shrink-0 border-b border-gray-800">
      <div :class="[(isMobile || isTablet) ? 'px-4 py-3' : 'px-6 py-4']">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <!-- Bot Avatar -->
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Icon name="lucide:bot" class="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 class="text-lg font-semibold text-gray-100">AI Assistant</h1>
              <div class="flex items-center gap-1.5 text-xs text-gray-400">
                <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>Online</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="lucide:settings"
              square
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Messages Area -->
    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto"
      :class="[(isMobile || isTablet) ? 'px-4 py-4' : 'px-6 py-6']"
    >
      <div class="max-w-4xl mx-auto space-y-6">
        <Transition name="loading-fade" mode="out-in">
          <!-- Loading -->
          <CommonLoadingState
            v-if="!isMounted || (loadingHistory && historyPage === 1)"
            title="Loading messages..."
            description="Fetching chat history"
            size="sm"
            type="spinner"
            context="page"
          />

          <!-- Messages -->
          <div v-else class="space-y-6">
            <!-- Load More Button -->
            <div v-if="hasMoreHistory" class="flex justify-center">
              <UButton
                :loading="isLoadingMore"
                :disabled="isLoadingMore"
                color="neutral"
                variant="outline"
                size="sm"
                @click="loadMoreHistory"
              >
                {{ isLoadingMore ? 'Loading...' : 'Load more messages' }}
              </UButton>
            </div>
            <div
              v-for="message in messages"
              :key="message.id"
              class="flex gap-3 group"
              :class="message.type === 'user' ? 'flex-row-reverse' : ''"
            >
              <!-- Avatar -->
              <div class="flex-shrink-0">
                <div
                  v-if="message.type === 'bot'"
                  class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"
                >
                  <Icon name="lucide:bot" class="w-5 h-5 text-white" />
                </div>
                <div
                  v-else
                  class="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center"
                >
                  <Icon name="lucide:user" class="w-5 h-5 text-white" />
                </div>
              </div>

              <!-- Message Content -->
              <div class="flex-1 min-w-0" :class="message.type === 'user' ? 'flex justify-end' : ''">
                <div
                  class="inline-block rounded-2xl transition-all duration-200"
                  :class="[
                    message.type === 'user'
                      ? 'bg-blue-600 text-white px-4 py-3 max-w-[80%]'
                      : 'bg-gray-900 border border-gray-800 px-4 py-3 w-full',
                  ]"
                >
                  <!-- User message - plain text -->
                  <div
                    v-if="message.type === 'user'"
                    class="text-sm leading-relaxed whitespace-pre-wrap"
                  >
                    {{ message.content }}
                  </div>

                  <!-- Bot message - always render markdown -->
                  <div
                    v-else
                    class="prose prose-invert prose-sm max-w-none text-gray-200"
                  >
                    <div v-html="renderMarkdown(message.content)" />
                    <span v-if="message.isStreaming" class="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse" />
                  </div>

                  <!-- Timestamp -->
                  <div
                    class="text-xs mt-2 opacity-60"
                    :class="message.type === 'user' ? 'text-blue-100' : 'text-gray-500'"
                  >
                    {{ formatTime(message.timestamp) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Typing Indicator - only show when bot is thinking, not streaming -->
            <div v-if="isTyping && messages[messages.length - 1]?.type === 'user'" class="flex gap-3">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Icon name="lucide:bot" class="w-5 h-5 text-white" />
                </div>
              </div>
              <div class="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4">
                <div class="flex gap-1.5">
                  <div class="w-2 h-2 rounded-full bg-gray-600 animate-bounce" style="animation-delay: 0ms" />
                  <div class="w-2 h-2 rounded-full bg-gray-600 animate-bounce" style="animation-delay: 150ms" />
                  <div class="w-2 h-2 rounded-full bg-gray-600 animate-bounce" style="animation-delay: 300ms" />
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Input Area -->
    <div class="border-t border-gray-800 bg-gray-900/80 backdrop-blur-sm flex-shrink-0">
      <div :class="[(isMobile || isTablet) ? 'px-4 py-3' : 'px-6 py-4']">
        <div class="max-w-4xl mx-auto">
          <form @submit.prevent="sendMessage">
            <!-- Wrapper with border (looks like single input) -->
            <div class="relative flex items-center gap-2 px-4 py-3 bg-gray-900 border border-gray-700 rounded-2xl hover:border-gray-600 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-colors">
              <!-- Text Input - no border, no padding -->
              <textarea
                v-model="inputMessage"
                rows="1"
                class="flex-1 bg-transparent text-gray-100 placeholder-gray-500 resize-none outline-none max-h-[150px] py-1"
                style="field-sizing: content;"
                placeholder="Type your message..."
                @keydown.enter.exact.prevent="sendMessage"
                @input="(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = 'auto'
                  target.style.height = Math.min(target.scrollHeight, 150) + 'px'
                }"
              />

              <!-- Send Button - inside wrapper -->
              <button
                type="submit"
                :disabled="!inputMessage.trim() || isTyping"
                class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white transition-colors"
              >
                <Icon name="lucide:send" class="w-4 h-4" />
              </button>
            </div>
          </form>

          <!-- Helper Text -->
          <div class="text-xs text-gray-500 mt-2 text-center">
            Press Enter to send • Shift + Enter for new line
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar */
:deep(*) {
  scrollbar-width: thin;
  scrollbar-color: rgba(75, 85, 99, 0.5) transparent;
}

/* Markdown content styling */
.prose :deep(h1),
.prose :deep(h2),
.prose :deep(h3),
.prose :deep(h4) {
  color: rgb(243, 244, 246);
  font-weight: 600;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

.prose :deep(h3) {
  font-size: 1.125rem;
}

.prose :deep(p) {
  margin: 0.75em 0;
  line-height: 1.7;
}

.prose :deep(strong) {
  color: rgb(243, 244, 246);
  font-weight: 600;
}

.prose :deep(code) {
  color: rgb(134, 239, 172);
  background-color: rgba(0, 0, 0, 0.3);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
}

.prose :deep(code)::before,
.prose :deep(code)::after {
  content: '';
}

.prose :deep(pre) {
  background-color: rgb(17, 24, 39) !important;
  border: 1px solid rgb(55, 65, 81);
  border-radius: 0.75rem;
  padding: 1rem;
  margin: 1em 0;
  overflow-x: auto;
}

.prose :deep(pre code) {
  background-color: transparent;
  color: inherit;
  padding: 0;
  font-size: 0.875rem;
  line-height: 1.6;
}

.prose :deep(ul),
.prose :deep(ol) {
  margin: 0.75em 0;
  padding-left: 1.5em;
}

.prose :deep(li) {
  margin: 0.25em 0;
}

.prose :deep(blockquote) {
  border-left: 4px solid rgb(59, 130, 246);
  background-color: rgba(0, 0, 0, 0.2);
  padding: 0.5rem 1rem;
  margin: 1em 0;
  font-style: normal;
}

.prose :deep(a) {
  color: rgb(96, 165, 250);
  text-decoration: none;
}

.prose :deep(a:hover) {
  text-decoration: underline;
}

:deep(*::-webkit-scrollbar) {
  width: 6px;
}

:deep(*::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(*::-webkit-scrollbar-thumb) {
  background-color: rgba(75, 85, 99, 0.5);
  border-radius: 3px;
}

:deep(*::-webkit-scrollbar-thumb:hover) {
  background-color: rgba(75, 85, 99, 0.8);
}

/* Code block styling */
:deep(pre) {
  position: relative;
}

:deep(pre code) {
  display: block;
  padding: 1rem;
  overflow-x: auto;
  line-height: 1.6;
  font-size: 0.875rem;
}

/* Copy button for code blocks */
:deep(pre)::before {
  content: '';
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 1.5rem;
  height: 1.5rem;
  background: rgba(55, 65, 81, 0.8);
  border-radius: 0.375rem;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

:deep(pre:hover)::before {
  opacity: 1;
}

/* Animations */
@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

.animate-bounce {
  animation: bounce 1s infinite;
}

/* Loading fade transition */
.loading-fade-enter-active,
.loading-fade-leave-active {
  transition: opacity 0.2s ease;
}

.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
}
</style>
