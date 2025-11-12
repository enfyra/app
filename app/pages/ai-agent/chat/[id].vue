<script setup lang="ts">
import { marked } from 'marked'
import hljs from 'highlight.js'

const route = useRoute()
const conversationId = computed(() => route.params.id)
const { getIdFieldName, getId } = useDatabase()
const toast = useToast()

const conversationTableName = 'ai_conversation_definition'
const { getIncludeFields: getConversationFields } = useSchema(conversationTableName)
marked.setOptions({
  breaks: true,
  gfm: true,
})

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
  toolCall?: {
    name: string
  }
}

const messages = ref<Message[]>([])
const inputMessage = ref('')
const isTyping = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)
const { fetchStream } = useStreamingAPI()
const { isMounted } = useMounted()

const showConfigDrawer = ref(false)
const selectedAiConfig = ref<any>(null)
const { aiConfig, aiConfigs } = useGlobalState()

const { registerPageHeader } = usePageHeaderRegistry()

registerPageHeader({
  title: 'AI Assistant',
  gradient: 'blue',
})

useHeaderActionRegistry({
  id: 'ai-config',
  label: 'AI Configuration',
  icon: 'lucide:settings',
  variant: 'soft',
  color: 'primary',
  size: 'lg',
  onClick: () => {
    showConfigDrawer.value = true
  },
})

const handleConfigSelect = async (config: any) => {
  selectedAiConfig.value = config

  const { execute: updateConversation, error: updateError } = useApi(() => '/ai_conversation_definition', {
    method: 'patch',
    errorContext: 'Update Conversation Config',
  })

  const idField = getIdFieldName()
  await updateConversation({
    id: conversationId.value,
    body: {
      config: { [idField]: getId(config) }
    }
  })

  if (!updateError.value) {
    toast.add({
      title: 'Config Updated',
      description: `Conversation now uses "${config.name || config.provider}"`,
      color: 'success',
    })
  }
}

const historyPage = ref(1)
const historyLimit = 20
const hasMoreHistory = ref(false)
const isLoadingMore = ref(false)

const {
  data: conversationData,
  execute: loadConversation,
} = useApi(() => '/ai_conversation_definition', {
  query: computed(() => {
    const idField = getIdFieldName()
    return {
      fields: getConversationFields(),
      filter: {
        [idField]: {
          _eq: conversationId.value,
        },
      },
    }
  }),
  errorContext: 'Load Conversation',
})

watch(conversationData, (data) => {
  const record = data?.data?.[0]
  if (record?.config) {
    selectedAiConfig.value = record.config
  }
}, { immediate: true })

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

      if (historyPage.value === 1) {
        messages.value = newMessages
      } else {
        messages.value = [...newMessages, ...messages.value]
      }
    }

    if (historyPage.value > 1) {
      isLoadingMore.value = false
    }

    const total = data.meta?.totalCount || 0
    const currentCount = historyPage.value * historyLimit
    hasMoreHistory.value = currentCount < total
  }
}, { immediate: true })
const loadMoreHistory = async () => {
  if (loadingHistory.value || !hasMoreHistory.value || isLoadingMore.value) return

  isLoadingMore.value = true
  const scrollHeightBefore = messagesContainer.value?.scrollHeight || 0

  historyPage.value++

  try {
    await loadChatHistory()

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

watch(loadingHistory, (isLoading) => {
  if (!isLoading && messages.value.length > 0 && !isLoadingMore.value && historyPage.value === 1) {
    setTimeout(() => {
      scrollToBottom(true)
    }, 150)
  }
})

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

const renderMarkdown = (content: string) => {
  if (!content) return ''
  return marked(content)
}

const copyCode = async (code: string) => {
  try {
    await navigator.clipboard.writeText(code)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

const sendMessage = async () => {
  if (!inputMessage.value.trim() || isTyping.value) return
  if (!selectedAiConfig.value) {
    showConfigDrawer.value = true
    return
  }

  const userMsg = inputMessage.value
  inputMessage.value = ''

  messages.value.push({
    id: Date.now().toString(),
    type: 'user',
    content: userMsg,
    timestamp: new Date(),
  })

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

  try {
    const apiUrl = '/enfyra/api/ai-agent/chat/stream'

    await fetchStream(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userMsg,
        config: selectedAiConfig.value ? getId(selectedAiConfig.value) : undefined,
        conversation: conversationId.value,
      }),
      streamOptions: {
        onMessage: (chunk: string) => {
          try {
            const json = JSON.parse(chunk)

            if (json.type === 'ping') {
              return
            } else if (json.type === 'text' && json.data?.delta) {
              const botMessage = messages.value.find(m => m.id === botMessageId)
              if (botMessage) {
                botMessage.content += json.data.delta
                botMessage.toolCall = undefined
                scrollToBottom(true)
              }
            } else if (json.type === 'tool_call') {
              const botMessage = messages.value.find(m => m.id === botMessageId)
              if (botMessage) {
                botMessage.toolCall = {
                  name: json.data?.name || 'unknown'
                }
                scrollToBottom(true)
              }
            } else if (json.type === 'error') {
              const botMessage = messages.value.find(m => m.id === botMessageId)
              if (botMessage) {
                botMessage.isStreaming = false
                botMessage.content = json.data?.error || 'An error occurred while processing your request.'
              }
              isTyping.value = false
              scrollToBottom(true)
            } else if (json.type === 'done') {
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
          const isAborted = error.name === 'AbortError'

          if (!isAborted) {
            console.error('Streaming error:', error)
          }

          const botMessage = messages.value.find(m => m.id === botMessageId)
          if (botMessage) {
            botMessage.isStreaming = false
            if (!isAborted && !botMessage.content) {
              botMessage.content = 'An error occurred while processing your request.'
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

const { execute: cancelStream } = useApi(() => '/ai-agent/cancel', {
  method: 'post',
  errorContext: 'Cancel Stream',
})

const stopStreaming = async () => {
  if (conversationId.value) {
    await cancelStream({
      body: {
        conversation: conversationId.value,
      },
    })
  }

  const streamingBotMessage = messages.value.find(m => m.type === 'bot' && m.isStreaming)
  if (streamingBotMessage) {
    streamingBotMessage.isStreaming = false
    streamingBotMessage.toolCall = undefined
    if (!streamingBotMessage.content) {
      streamingBotMessage.content = 'Request cancelled.'
    }
  }

  isTyping.value = false
}

const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isTyping.value) {
    event.preventDefault()
    stopStreaming()
  }
}

onMounted(async () => {
  if (aiConfig.value && Object.keys(aiConfig.value).length > 0) {
    selectedAiConfig.value = aiConfig.value
  }

  await loadConversation()
  await loadChatHistory()

  const section = document.querySelector('section.overflow-y-auto')
  if (section) {
    section.classList.add('!overflow-hidden')
  }

  window.addEventListener('keydown', handleKeyDown)

  setTimeout(() => {
    scrollToBottom(true)
  }, 500)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

</script>

<template>
  <div class="flex flex-col -mx-3 md:-mx-6 h-full">
    <!-- Messages Area -->
    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto px-6 py-6"
    >
      <div class="max-w-4xl mx-auto space-y-6">
        <Transition name="ai-chat-fade" mode="out-in">
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
                    class="space-y-3"
                  >
                    <!-- Tool Call Indicator -->
                    <div
                      v-if="message.toolCall"
                      class="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-xs text-gray-400"
                    >
                      <Icon name="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
                      <span>{{ message.toolCall.name }}</span>
                    </div>

                    <div class="ai-chat-prose prose-invert prose-sm max-w-none text-gray-200">
                      <div v-html="renderMarkdown(message.content)" />
                      <span v-if="message.isStreaming && !message.toolCall" class="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse" />
                    </div>
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
                  <div class="w-2 h-2 rounded-full bg-gray-600 ai-chat-bounce" style="animation-delay: 0ms" />
                  <div class="w-2 h-2 rounded-full bg-gray-600 ai-chat-bounce" style="animation-delay: 150ms" />
                  <div class="w-2 h-2 rounded-full bg-gray-600 ai-chat-bounce" style="animation-delay: 300ms" />
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Input Area -->
    <div class="border-t border-gray-800 bg-gray-900/80 backdrop-blur-sm flex-shrink-0 lg:-mb-6 -mb-32">
      <div class="px-6 py-4">
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

              <!-- Send/Stop Button - inside wrapper -->
              <button
                v-if="isTyping"
                type="button"
                @click="stopStreaming"
                class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                <Icon name="lucide:square" class="w-3.5 h-3.5" />
              </button>
              <button
                v-else
                type="submit"
                :disabled="!inputMessage.trim()"
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

  <!-- Config Drawer -->
  <AiConfigDrawer
    v-model="showConfigDrawer"
    :current-config="selectedAiConfig"
    @select="handleConfigSelect"
  />
</template>
