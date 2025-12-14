<script setup lang="ts">
import { marked } from 'marked'
const { initHighlight, highlight, getLanguage } = useHighlight()

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

// Initialize highlight.js on mount
onMounted(async () => {
  await initHighlight()
})

const renderer = new marked.Renderer()
const encodeCopyData = (value: string) => encodeURIComponent(value)
const decodeCopyData = (value: string) => decodeURIComponent(value)
const renderCopyButton = (raw: string) => {
  const encoded = encodeCopyData(raw)
  return `<button type="button" class="absolute top-3 right-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/80 text-gray-700 dark:text-gray-300 transition hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 copy-code-trigger" data-copy-code="${encoded}">
    <svg class="h-4 w-4 copy-icon-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
    <svg class="hidden h-4 w-4 text-emerald-400 copy-icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  </button>`
}
const wrapCodeWithCopy = (content: string, copyButton: string) => `<div class="relative">${copyButton}${content}</div>`
renderer.code = function({ text, lang }: { text: string; lang?: string }): string {
  if (lang && getLanguage(lang)) {
    try {
      const highlighted = highlight(text, lang)
      return wrapCodeWithCopy(`<pre class="!mb-0 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/60 px-4 py-4 pr-12"><code class="hljs language-${lang}">${highlighted}</code></pre>`, renderCopyButton(text))
    } catch (err) {
    }
  }
  const highlighted = highlight(text)
  return wrapCodeWithCopy(`<pre class="!mb-0 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/60 px-4 py-4 pr-12"><code class="hljs">${highlighted}</code></pre>`, renderCopyButton(text))
}

marked.use({ renderer })

interface Message {
  id: string
  type: 'user' | 'bot'
  content: string
  timestamp: Date
  isMarkdown?: boolean
  isStreaming?: boolean
  toolCalls?: Array<{
    id: string
    name: string
    status: 'pending' | 'success' | 'error'
  }>
  tokens?: {
    inputTokens: number
    outputTokens: number
  }
}

const messages = ref<Message[]>([])
const inputMessage = ref('')
const isTyping = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const { connectSSE } = useStreamingAPI()
const { isMounted } = useMounted()
const currentEventSource = ref<EventSource | null>(null)
const isStreamCompleted = ref(false)

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
  pending: loadingConversation,
} = useApi(() => '/ai_conversation_definition', {
  query: computed(() => {
    if (!conversationId.value) {
      return null
    }
    const idField = getIdFieldName()
    const fields = getConversationFields() || '*'
    return {
      fields,
      filter: {
        [idField]: {
          _eq: conversationId.value,
        },
      },
    }
  }),
  immediate: false,
  errorContext: 'Load Conversation',
});

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
      const newMessages = data.data.map((item: any) => {
        let toolCalls = undefined
        if (item.toolCalls) {
          if (typeof item.toolCalls === 'string') {
            try {
              toolCalls = JSON.parse(item.toolCalls)
            } catch {
              toolCalls = null
            }
          } else if (Array.isArray(item.toolCalls)) {
            toolCalls = item.toolCalls
          }
        }
        
        return {
          id: item.id.toString(),
          type: item.role === 'user' ? 'user' : 'bot',
          content: item.content,
          timestamp: new Date(item.createdAt),
          isMarkdown: item.role === 'assistant',
          toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
          tokens: item.inputTokens || item.outputTokens ? {
            inputTokens: item.inputTokens || 0,
            outputTokens: item.outputTokens || 0,
          } : undefined,
        }
      }).reverse()

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
const copyFeedbackTimers = new WeakMap<HTMLElement, number>()
const handleCopyButtonClick = async (event: MouseEvent) => {
  const target = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-copy-code]')
  if (!target) {
    return
  }
  const encoded = target.getAttribute('data-copy-code')
  if (!encoded) {
    return
  }
  const iconCopy = target.querySelector<HTMLElement>('.copy-icon-copy')
  const iconCheck = target.querySelector<HTMLElement>('.copy-icon-check')
  try {
    await copyCode(decodeCopyData(encoded))
    if (iconCopy) {
      iconCopy.classList.add('hidden')
    }
    if (iconCheck) {
      iconCheck.classList.remove('hidden')
    }
    const existingTimer = copyFeedbackTimers.get(target)
    if (existingTimer) {
      window.clearTimeout(existingTimer)
    }
    const timeout = window.setTimeout(() => {
      if (iconCopy) {
        iconCopy.classList.remove('hidden')
      }
      if (iconCheck) {
        iconCheck.classList.add('hidden')
      }
      copyFeedbackTimers.delete(target)
    }, 1600)
    copyFeedbackTimers.set(target, timeout)
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

  if (currentEventSource.value) {
    currentEventSource.value.close()
    currentEventSource.value = null
  }
  isStreamCompleted.value = false

  const userMsg = inputMessage.value
  inputMessage.value = ''
  
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto'
      const lineHeight = parseInt(getComputedStyle(textareaRef.value).lineHeight) || 24
      textareaRef.value.style.height = lineHeight + 'px'
      textareaRef.value.style.overflowY = 'hidden'
    }
  })

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
    const apiUrl = '/ai-agent/chat/stream'

    const queryParams: Record<string, string> = {
      message: userMsg,
    }

    if (conversationId.value) {
      const convId = Array.isArray(conversationId.value) 
        ? conversationId.value[0] 
        : conversationId.value
      if (convId) {
        queryParams.conversation = convId
      }
    }

    if (selectedAiConfig.value) {
      queryParams.config = getId(selectedAiConfig.value)
    }

    const eventSource = connectSSE(apiUrl, {
      queryParams,
      onMessage: (chunk: string) => {
        try {
          const json = JSON.parse(chunk)

          if (json.type === 'ping') {
            return
          } else if (json.type === 'text' && json.data?.delta) {
            const botMessage = messages.value.find(m => m.id === botMessageId)
            if (botMessage) {
              botMessage.content += json.data.delta
              scrollToBottom(true)
            }
          } else if (json.type === 'tool_call') {
            const botMessage = messages.value.find(m => m.id === botMessageId)
            if (botMessage) {
              if (!botMessage.toolCalls) {
                botMessage.toolCalls = []
              }
              const toolCallId = json.data?.id
              const existingIndex = botMessage.toolCalls.findIndex(tc => tc.id === toolCallId)
              const toolCallData = {
                id: toolCallId || Date.now().toString(),
                name: json.data?.name || 'unknown',
                status: (json.data?.status || 'pending') as 'pending' | 'success' | 'error'
              }
              if (existingIndex >= 0) {
                botMessage.toolCalls[existingIndex] = toolCallData
              } else {
                botMessage.toolCalls.push(toolCallData)
              }
              scrollToBottom(true)
            }
          } else if (json.type === 'tokens' && json.data) {
            const botMessage = messages.value.find(m => m.id === botMessageId)
            if (botMessage) {
              botMessage.tokens = {
                inputTokens: json.data.inputTokens || 0,
                outputTokens: json.data.outputTokens || 0,
              }
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
            isStreamCompleted.value = true
            const botMessage = messages.value.find(m => m.id === botMessageId)
            if (botMessage) {
              botMessage.isStreaming = false
            }
            isTyping.value = false
            if (currentEventSource.value) {
              currentEventSource.value.close()
              currentEventSource.value = null
            }
            nextTick(() => {
              if (textareaRef.value) {
                textareaRef.value.style.height = 'auto'
                const lineHeight = parseInt(window.getComputedStyle(textareaRef.value).lineHeight) || 24
                textareaRef.value.style.height = lineHeight + 'px'
                textareaRef.value.style.overflowY = 'hidden'
              }
            })
            scrollToBottom(true)
          }
        } catch (err) {
        }
      },
      onComplete: () => {
        if (isStreamCompleted.value) {
          return
        }
        
        isStreamCompleted.value = true
        const botMessage = messages.value.find(m => m.id === botMessageId)
        if (botMessage) {
          botMessage.isStreaming = false
        }
        isTyping.value = false
        if (currentEventSource.value) {
          currentEventSource.value.close()
          currentEventSource.value = null
        }
        nextTick(() => {
          if (textareaRef.value) {
            textareaRef.value.style.height = 'auto'
            const lineHeight = parseInt(getComputedStyle(textareaRef.value).lineHeight) || 24
            textareaRef.value.style.height = lineHeight + 'px'
            textareaRef.value.style.overflowY = 'hidden'
          }
        })
        scrollToBottom(true)
      },
      onError: (error: Error) => {
        if (isStreamCompleted.value) {
          return
        }

        const botMessage = messages.value.find(m => m.id === botMessageId)
        if (botMessage) {
          botMessage.isStreaming = false
          botMessage.content = error.message || 'Stream connection lost'
        }
        isTyping.value = false
        currentEventSource.value = null
      },
    })

    currentEventSource.value = eventSource
  } catch (error) {
    isTyping.value = false
    currentEventSource.value = null
  }
}

const { execute: cancelStream } = useApi(() => '/ai-agent/cancel', {
  method: 'post',
  errorContext: 'Cancel Stream',
})

const stopStreaming = async () => {
  if (!currentEventSource.value && !isTyping.value) {
    return
  }

  if (conversationId.value) {
    const convId = Array.isArray(conversationId.value) 
      ? conversationId.value[0] 
      : conversationId.value
    if (convId) {
      try {
        await cancelStream({
          body: {
            conversation: convId,
          },
        })
      } catch (error) {
      }
    }
  }

  if (currentEventSource.value) {
    currentEventSource.value.close()
    currentEventSource.value = null
  }

  const streamingBotMessage = messages.value.find(m => m.type === 'bot' && m.isStreaming)
  if (streamingBotMessage) {
    streamingBotMessage.isStreaming = false
    if (!streamingBotMessage.content || streamingBotMessage.content.trim() === '') {
      streamingBotMessage.content = 'Error: Request aborted by client'
    }
  }

  isTyping.value = false
  isStreamCompleted.value = false
}

const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const expandedToolCalls = ref<Record<string, boolean>>({})

const toggleToolCalls = (messageId: string) => {
  expandedToolCalls.value[messageId] = !expandedToolCalls.value[messageId]
}

const getDisplayToolCall = (toolCalls: Array<{ id: string; name: string; status: 'pending' | 'success' | 'error' }>) => {
  const pending = toolCalls.find(tc => tc.status === 'pending')
  return pending || toolCalls[toolCalls.length - 1]
}

const getSortedToolCalls = (toolCalls: Array<{ id: string; name: string; status: 'pending' | 'success' | 'error' }>) => {
  return [...toolCalls].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (a.status !== 'pending' && b.status === 'pending') return 1
    return 0
  })
}

const getLineHeight = (element: HTMLElement) => {
  return parseInt(window.getComputedStyle(element).lineHeight) || 24
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isTyping.value) {
    event.preventDefault()
    stopStreaming()
  }
}

watch(conversationId, async (newId, oldId) => {
    await loadConversation()
}, {immediate: true})

onMounted(async () => {
  if (aiConfig.value && Object.keys(aiConfig.value).length > 0) {
    selectedAiConfig.value = aiConfig.value
  }

  await loadChatHistory()

  const section = document.querySelector('section.overflow-y-auto')
  if (section) {
    section.classList.add('!overflow-hidden')
  }

  window.addEventListener('keydown', handleKeyDown)
  if (messagesContainer.value) {
    messagesContainer.value.addEventListener('click', handleCopyButtonClick)
  }

  setTimeout(() => {
    scrollToBottom(true)
    nextTick(() => {
      if (textareaRef.value) {
        textareaRef.value.focus()
      }
    })
  }, 500)
})

onBeforeUnmount(async () => {
  if (currentEventSource.value) {
    if (conversationId.value) {
      await cancelStream({
        body: {
          conversation: conversationId.value,
        },
      })
    }
    currentEventSource.value.close()
    currentEventSource.value = null
  }
  window.removeEventListener('keydown', handleKeyDown)
  if (messagesContainer.value) {
    messagesContainer.value.removeEventListener('click', handleCopyButtonClick)
  }
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
                  class="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center"
                >
                  <Icon name="lucide:bot" class="w-5 h-5 text-white" />
                </div>
                <div
                  v-else
                  class="w-8 h-8 rounded-full bg-gradient-to-br from-success-500 to-success-600 flex items-center justify-center"
                >
                  <Icon name="lucide:user" class="w-5 h-5 text-white" />
                </div>
              </div>

              <!-- Message Content -->
              <div class="flex-1 min-w-0" :class="message.type === 'user' ? 'flex justify-end' : ''">
                <div
                  class="rounded-xl transition-all duration-200 overflow-hidden"
                  :class="[
                    message.type === 'user'
                      ? 'bg-brand-500 text-white px-4 py-3 max-w-[80%] inline-block shadow-theme-xs'
                      : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-4 py-3 inline-block shadow-theme-xs',
                  ]"
                >
                  <!-- User message - plain text -->
                  <div
                    v-if="message.type === 'user'"
                    class="text-sm leading-relaxed whitespace-pre-wrap break-words"
                  >
                    {{ message.content }}
                  </div>

                  <!-- Bot message - always render markdown -->
                  <div
                    v-else
                    class="space-y-3"
                  >
                    <div class="ai-chat-prose prose-sm max-w-none" style="color: var(--text-primary);">
                      <div v-html="renderMarkdown(message.content)" />
                      <div
                        v-if="message.isStreaming"
                        class="inline-flex items-center gap-0.5 mt-1"
                      >
                        <span class="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce" style="animation-delay: 0ms" />
                        <span class="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce" style="animation-delay: 120ms" />
                        <span class="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce" style="animation-delay: 240ms" />
                      </div>
                    </div>
                  </div>

                  <!-- Timestamp and Tokens -->
                  <div
                    class="text-xs mt-2 opacity-60 flex items-center gap-2"
                    :class="message.type === 'user' ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'"
                  >
                    <span>{{ formatTime(message.timestamp) }}</span>
                    <span
                      v-if="message.type === 'bot' && message.tokens"
                      class="text-[10px] opacity-50 token-info select-text"
                      style="user-select: text; -webkit-user-select: text; -moz-user-select: text;"
                    >
                      • {{ message.tokens.inputTokens.toLocaleString() }} in / {{ message.tokens.outputTokens.toLocaleString() }} out
                    </span>
                  </div>

                  <div
                    v-if="message.type === 'bot' && message.toolCalls && message.toolCalls.length > 0"
                    class="mt-3"
                  >
                    <template v-if="message.toolCalls[0]?.status !== undefined">
                      <div
                        class="bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden w-fit"
                        :class="{
                          'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800/70 transition-colors': message.toolCalls.length > 1
                        }"
                        @click="message.toolCalls.length > 1 && toggleToolCalls(message.id)"
                      >
                        <div
                          v-if="message.toolCalls.length === 1 || expandedToolCalls[message.id]"
                          class="space-y-px"
                        >
                          <div
                            v-for="(toolCall, index) in getSortedToolCalls(message.toolCalls)"
                            :key="toolCall.id"
                            class="flex items-center gap-1.5 px-2 py-1 text-xs"
                            :class="{
                              'text-gray-500 dark:text-gray-400': toolCall.status === 'pending',
                              'text-success-600 dark:text-success-500': toolCall.status === 'success',
                              'text-error-600 dark:text-error-500': toolCall.status === 'error',
                              'border-b border-gray-200 dark:border-gray-700/50': index < getSortedToolCalls(message.toolCalls).length - 1
                            }"
                          >
                            <Icon
                              v-if="toolCall.status === 'pending'"
                              name="lucide:loader-2"
                              class="w-3.5 h-3.5 animate-spin flex-shrink-0"
                            />
                            <Icon
                              v-else-if="toolCall.status === 'success'"
                              name="lucide:check-circle"
                              class="w-3.5 h-3.5 flex-shrink-0"
                            />
                            <Icon
                              v-else-if="toolCall.status === 'error'"
                              name="lucide:x-circle"
                              class="w-3.5 h-3.5 flex-shrink-0"
                            />
                            <span class="flex-1">{{ toolCall.name }}</span>
                          </div>
                        </div>
                        <div
                          v-else
                          class="flex items-center gap-1.5 px-2 py-1 text-xs"
                        >
                          <template v-if="getDisplayToolCall(message.toolCalls)">
                            <Icon
                              v-if="getDisplayToolCall(message.toolCalls)!.status === 'pending'"
                              name="lucide:loader-2"
                              class="w-3.5 h-3.5 animate-spin flex-shrink-0"
                            />
                            <Icon
                              v-else-if="getDisplayToolCall(message.toolCalls)!.status === 'success'"
                              name="lucide:check-circle"
                              class="w-3.5 h-3.5 flex-shrink-0"
                            />
                            <Icon
                              v-else-if="getDisplayToolCall(message.toolCalls)!.status === 'error'"
                              name="lucide:x-circle"
                              class="w-3.5 h-3.5 flex-shrink-0"
                            />
                            <span
                              class="flex-1"
                              :class="{
                                'text-gray-500 dark:text-gray-400': getDisplayToolCall(message.toolCalls)!.status === 'pending',
                                'text-success-600 dark:text-success-500': getDisplayToolCall(message.toolCalls)!.status === 'success',
                                'text-error-600 dark:text-error-500': getDisplayToolCall(message.toolCalls)!.status === 'error',
                              }"
                            >{{ getDisplayToolCall(message.toolCalls)!.name }}</span>
                            <span class="text-[10px] opacity-50">+{{ message.toolCalls.length - 1 }}</span>
                          </template>
                        </div>
                      </div>
                    </template>
                    <div
                      v-else
                      class="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-500 dark:text-gray-400 w-fit"
                    >
                      <Icon name="lucide:wrench" class="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{{ message.toolCalls.length }} tool call{{ message.toolCalls.length > 1 ? 's' : '' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Typing Indicator - only show when bot is thinking, not streaming -->
            <div v-if="isTyping && messages[messages.length - 1]?.type === 'user'" class="flex gap-3">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
                  <Icon name="lucide:bot" class="w-5 h-5 text-white" />
                </div>
              </div>
              <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-5 py-4 shadow-theme-xs">
                <div class="flex gap-1.5">
                  <div class="w-2 h-2 rounded-full bg-brand-500 ai-chat-bounce" style="animation-delay: 0ms" />
                  <div class="w-2 h-2 rounded-full bg-brand-500 ai-chat-bounce" style="animation-delay: 150ms" />
                  <div class="w-2 h-2 rounded-full bg-brand-500 ai-chat-bounce" style="animation-delay: 300ms" />
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Input Area -->
    <div class="flex-shrink-0">
      <div class="px-6 py-4">
        <div class="max-w-4xl mx-auto">
          <form @submit.prevent="sendMessage">
            <!-- Wrapper with border (looks like single input) -->
            <div class="relative flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl hover:border-gray-400 dark:hover:border-gray-600 focus-within:border-brand-300 dark:focus-within:border-brand-800 focus-within:ring-3 focus-within:ring-brand-500/10 transition-colors shadow-theme-xs">
              <!-- Text Input - no border, no padding -->
              <textarea
                ref="textareaRef"
                v-model="inputMessage"
                rows="1"
                class="flex-1 bg-transparent text-gray-800 dark:text-white/90 placeholder:text-gray-400 dark:placeholder:text-white/30 resize-none outline-none max-h-[150px] py-1 text-sm"
                style="field-sizing: content;"
                placeholder="Type your message..."
                @keydown.enter.exact.prevent="sendMessage"
                @input="(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = 'auto'
                  if (target.value.trim()) {
                    const newHeight = Math.min(target.scrollHeight, 150)
                    target.style.height = newHeight + 'px'
                    target.style.overflowY = newHeight >= 150 ? 'auto' : 'hidden'
                  } else {
                    const lineHeight = getLineHeight(target)
                    target.style.height = lineHeight + 'px'
                    target.style.overflowY = 'hidden'
                  }
                }"
              />

              <!-- Send/Stop Button - inside wrapper -->
              <button
                v-if="isTyping"
                type="button"
                @click="stopStreaming"
                class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-error-500 hover:bg-error-600 text-white transition-colors"
              >
                <Icon name="lucide:square" class="w-3.5 h-3.5" />
              </button>
              <button
                v-else
                type="submit"
                :disabled="!inputMessage.trim()"
                class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white transition-colors"
              >
                <Icon name="lucide:send" class="w-4 h-4" />
              </button>
            </div>
          </form>

          <!-- Helper Text -->
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
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

