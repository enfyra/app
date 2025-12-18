<script setup lang="ts">
import { marked } from 'marked'
const { initHighlight, highlight, getLanguage } = useHighlight()

marked.setOptions({
  breaks: true,
  gfm: true,
})

onMounted(async () => {
  await initHighlight()
})

const renderer = new marked.Renderer()
const encodeCopyData = (value: string) => encodeURIComponent(value)
const decodeCopyData = (value: string) => decodeURIComponent(value)
const renderCopyButton = (raw: string) => {
  const encoded = encodeCopyData(raw)
  return `<button type="button" class="absolute top-3 right-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-700 bg-gray-900/80 text-gray-300 transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 copy-code-trigger" data-copy-code="${encoded}">
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
      return wrapCodeWithCopy(`<pre class="!mb-0 overflow-x-auto rounded-lg border border-gray-800 bg-black/60 px-4 py-4 pr-12"><code class="hljs language-${lang}">${highlighted}</code></pre>`, renderCopyButton(text))
    } catch (err) {
    }
  }
  const highlighted = highlight(text)
  return wrapCodeWithCopy(`<pre class="!mb-0 overflow-x-auto rounded-lg border border-gray-800 bg-black/60 px-4 py-4 pr-12"><code class="hljs">${highlighted}</code></pre>`, renderCopyButton(text))
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

const conversationId = ref<string | null>(null)
const { getId } = useDatabase()

const showConfigDrawer = ref(false)
const selectedAiConfig = ref<any>(null)
const { aiConfig, aiConfigs } = useGlobalState()

const hasConfigs = computed(() => aiConfigs.value && aiConfigs.value.length > 0)

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

onMounted(() => {
  if (aiConfig.value && Object.keys(aiConfig.value).length > 0) {
    selectedAiConfig.value = aiConfig.value
  }

  const section = document.querySelector('section.overflow-y-auto')
  if (section) {
    section.classList.add('!overflow-hidden')
  }
  if (messagesContainer.value) {
    messagesContainer.value.addEventListener('click', handleCopyButtonClick)
  }

  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.focus()
    }
  })
})

onBeforeUnmount(() => {
  if (currentEventSource.value) {
    currentEventSource.value.close()
    currentEventSource.value = null
  }
  if (messagesContainer.value) {
    messagesContainer.value.removeEventListener('click', handleCopyButtonClick)
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

const handleConfigSelect = (config: any) => {
  selectedAiConfig.value = config
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
      const lineHeight = parseInt(window.getComputedStyle(textareaRef.value).lineHeight) || 24
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
            
            const convId = json.data?.metadata?.conversation || json.data?.conversation
            if (convId) {
              conversationId.value = convId.toString()
            }
            
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
            
            if (conversationId.value) {
              navigateTo(`/ai-agent/chat/${conversationId.value}`, { replace: true })
            } else {
              scrollToBottom(true)
            }
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
        
        if (conversationId.value) {
          navigateTo(`/ai-agent/chat/${conversationId.value}`, { replace: true })
        } else {
          scrollToBottom(true)
        }
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

const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
</script>

<template>
  <div class="flex flex-col -m-3 md:-m-6 h-full">
    
    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto px-6 py-6"
    >
      <div class="max-w-4xl mx-auto space-y-6">
        <Transition name="ai-chat-fade" mode="out-in">
          
          <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full py-12 text-center">
            <div class="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center mb-4">
              <Icon name="lucide:message-circle" class="w-10 h-10 text-cyan-400" />
            </div>
            <h3 class="text-xl font-semibold text-white mb-2">Start a New Conversation</h3>
            <p class="text-gray-400 max-w-md">
              Type your message below to begin chatting with the AI assistant.
              <span v-if="!selectedAiConfig" class="block mt-2 text-orange-400">
                Don't forget to select an AI configuration first!
              </span>
            </p>
          </div>

          <div v-else class="space-y-6">
            <div
              v-for="message in messages"
              :key="message.id"
              class="flex gap-3 group"
              :class="message.type === 'user' ? 'flex-row-reverse' : ''"
            >
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

              <div class="flex-1 min-w-0" :class="message.type === 'user' ? 'flex justify-end' : ''">
                <div
                  class="rounded-2xl transition-all duration-200 overflow-hidden"
                  :class="[
                    message.type === 'user'
                      ? 'bg-blue-600 text-white px-4 py-3 max-w-[80%] inline-block'
                      : 'bg-gray-900 border border-gray-800 px-4 py-3 inline-block',
                  ]"
                >
                  <div
                    v-if="message.type === 'user'"
                    class="text-sm leading-relaxed whitespace-pre-wrap break-words"
                  >
                    {{ message.content }}
                  </div>
                  <div
                    v-else
                    class="space-y-3"
                  >
                    <div class="ai-chat-prose prose-invert prose-sm max-w-none text-gray-200">
                      <div v-if="message.content" v-html="renderMarkdown(message.content)" />
                      <div
                        v-if="message.isStreaming"
                        class="inline-flex items-center gap-0.5"
                        :class="message.content ? 'mt-1' : ''"
                      >
                        <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style="animation-delay: 0ms" />
                        <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style="animation-delay: 120ms" />
                        <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style="animation-delay: 240ms" />
                      </div>
                    </div>
                  </div>

                  <div
                    class="text-xs mt-2 opacity-60 flex items-center gap-2"
                    :class="message.type === 'user' ? 'text-blue-100' : 'text-gray-500'"
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
                        class="bg-gray-800/50 border border-gray-700 rounded overflow-hidden w-fit"
                        :class="{
                          'cursor-pointer hover:bg-gray-800/70 transition-colors': message.toolCalls.length > 1
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
                              'text-gray-400': toolCall.status === 'pending',
                              'text-green-400': toolCall.status === 'success',
                              'text-red-400': toolCall.status === 'error',
                              'border-b border-gray-700/50': index < getSortedToolCalls(message.toolCalls).length - 1
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
                                'text-gray-400': getDisplayToolCall(message.toolCalls)!.status === 'pending',
                                'text-green-400': getDisplayToolCall(message.toolCalls)!.status === 'success',
                                'text-red-400': getDisplayToolCall(message.toolCalls)!.status === 'error',
                              }"
                            >{{ getDisplayToolCall(message.toolCalls)!.name }}</span>
                            <span class="text-[10px] opacity-50">+{{ message.toolCalls.length - 1 }}</span>
                          </template>
                        </div>
                      </div>
                    </template>
                    <div
                      v-else
                      class="flex items-center gap-1.5 px-2 py-1 bg-gray-800/50 border border-gray-700 rounded text-xs text-gray-400 w-fit"
                    >
                      <Icon name="lucide:wrench" class="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{{ message.toolCalls.length }} tool call{{ message.toolCalls.length > 1 ? 's' : '' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <div class=" flex-shrink-0">
      <div class="px-6 py-4">
        <div class="max-w-4xl mx-auto">
          <form @submit.prevent="sendMessage">
            
            <div class="relative flex items-center gap-2 px-4 py-3 bg-gray-900 border border-gray-700 rounded-2xl hover:border-gray-600 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-colors">
              
              <textarea
                ref="textareaRef"
                v-model="inputMessage"
                rows="1"
                class="flex-1 bg-transparent text-gray-100 placeholder-gray-500 resize-none outline-none max-h-[150px] py-1"
                style="field-sizing: content;"
                :placeholder="hasConfigs ? 'Type your message...' : 'Please select an AI configuration first'"
                :disabled="!hasConfigs || isTyping"
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

              <button
                v-if="isTyping"
                type="button"
                disabled
                class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-red-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white transition-colors"
              >
                <Icon name="lucide:square" class="w-3.5 h-3.5" />
              </button>
              <button
                v-else-if="hasConfigs"
                type="submit"
                :disabled="!inputMessage.trim()"
                class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white transition-colors"
              >
                <Icon name="lucide:send" class="w-4 h-4" />
              </button>
            </div>
          </form>

          <div class="text-xs text-gray-500 mt-2 text-center">
            <template v-if="hasConfigs">
              Press Enter to send • Shift + Enter for new line
            </template>
            <template v-else>
              <span class="text-orange-400">No AI configuration available. Please create one first.</span>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>

  <AiConfigDrawer
    v-model="showConfigDrawer"
    :current-config="selectedAiConfig"
    @select="handleConfigSelect"
  />
</template>

