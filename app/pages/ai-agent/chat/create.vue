<script setup lang="ts">
import { marked } from 'marked'
import hljs from 'highlight.js'

const router = useRouter()

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

const conversationId = ref<string | null>(null)

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
        config: selectedAiConfig.value.id,
      }),
      streamOptions: {
        onMessage: (chunk: string) => {
          try {
            const json = JSON.parse(chunk)

            if (!conversationId.value) {
              const convId = json.data?.metadata?.conversation || json.data?.conversation
              if (convId) {
                conversationId.value = convId.toString()
                console.log('✅ Got conversation ID:', conversationId.value)
              }
            }

            if (json.type === 'text' && json.data?.delta) {
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

          if (conversationId.value) {
            setTimeout(() => {
              console.log('🚀 Streaming complete, navigating to:', conversationId.value)
              router.replace(`/ai-agent/chat/${conversationId.value}`)
            }, 300)
          }
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

const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
</script>

<template>
  <div class="flex flex-col -m-3 md:-m-6 h-full">
    <!-- Messages Area -->
    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto px-6 py-6"
    >
      <div class="max-w-4xl mx-auto space-y-6">
        <Transition name="ai-chat-fade" mode="out-in">
          <!-- Empty state when no messages -->
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

          <!-- Messages -->
          <div v-else class="space-y-6">
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

              <!-- Message content -->
              <div class="flex-1 min-w-0">
                <div
                  class="inline-block max-w-full rounded-2xl px-4 py-3"
                  :class="message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-100'"
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
          </div>
        </Transition>
      </div>
    </div>

    <!-- Input Area -->
    <div class="border-t border-gray-800 bg-gray-900/80 backdrop-blur-sm flex-shrink-0">
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
                :placeholder="hasConfigs ? 'Type your message...' : 'Please select an AI configuration first'"
                :disabled="!hasConfigs || isTyping"
                @keydown.enter.exact.prevent="sendMessage"
                @input="(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = 'auto'
                  target.style.height = Math.min(target.scrollHeight, 150) + 'px'
                }"
              />

              <!-- Send Button - inside wrapper -->
              <button
                v-if="hasConfigs"
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

  <!-- Config Drawer -->
  <AiConfigDrawer
    v-model="showConfigDrawer"
    :current-config="selectedAiConfig"
    @select="handleConfigSelect"
  />
</template>
