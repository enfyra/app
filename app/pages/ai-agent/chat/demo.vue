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
renderer.code = function({ text, lang }: { text: string; lang?: string }): string {
  if (lang && getLanguage(lang)) {
    try {
      const highlighted = highlight(text, lang)
      return `<pre class="!mb-0 overflow-x-auto rounded-lg border border-gray-800 bg-black/60 px-4 py-4 pr-12"><code class="hljs language-${lang}">${highlighted}</code></pre>`
    } catch (err) {
    }
  }
  const highlighted = highlight(text)
  return `<pre class="!mb-0 overflow-x-auto rounded-lg border border-gray-800 bg-black/60 px-4 py-4 pr-12"><code class="hljs">${highlighted}</code></pre>`
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

const messages = ref<Message[]>([
  {
    id: '1',
    type: 'user',
    content: 'Cho tôi xem các bảng không phải system',
    timestamp: new Date(),
  },
  {
    id: '2',
    type: 'bot',
    content: 'Tôi sẽ kiểm tra các bảng trong hệ thống cho bạn.',
    timestamp: new Date(),
    isMarkdown: true,
    isStreaming: false,
    toolCalls: [
      {
        id: 'tc1',
        name: 'list_tables',
        status: 'success',
      },
      {
        id: 'tc2',
        name: 'get_table_details',
        status: 'success',
      },
    ],
    tokens: {
      inputTokens: 7543,
      outputTokens: 26,
    },
  },
  {
    id: '3',
    type: 'bot',
    content: 'Đang xử lý yêu cầu của bạn...',
    timestamp: new Date(),
    isMarkdown: true,
    isStreaming: true,
    toolCalls: [
      {
        id: 'tc3',
        name: 'search_database',
        status: 'pending',
      },
    ],
  },
  {
    id: '4',
    type: 'bot',
    content: 'Có lỗi xảy ra khi thực thi tool.',
    timestamp: new Date(),
    isMarkdown: true,
    isStreaming: false,
    toolCalls: [
      {
        id: 'tc4',
        name: 'execute_query',
        status: 'error',
      },
    ],
  },
  {
    id: '5',
    type: 'bot',
    content: 'Đang thực thi nhiều tool calls cùng lúc.',
    timestamp: new Date(),
    isMarkdown: true,
    isStreaming: true,
    toolCalls: [
      {
        id: 'tc5',
        name: 'fetch_data',
        status: 'pending',
      },
      {
        id: 'tc6',
        name: 'process_data',
        status: 'success',
      },
      {
        id: 'tc7',
        name: 'validate_data',
        status: 'error',
      },
    ],
  },
])

const renderMarkdown = (content: string) => {
  return marked.parse(content)
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

const { registerPageHeader } = usePageHeaderRegistry()

registerPageHeader({
  title: 'Tool Calls Demo',
  gradient: 'blue',
})
</script>

<template>
  <div class="flex flex-col -m-3 md:-m-6 h-full">
    <div class="flex-1 overflow-y-auto px-6 py-6">
      <div class="max-w-4xl mx-auto space-y-6">
        <div class="space-y-6">
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
                    : 'bg-gray-900 border border-gray-800 px-4 py-3 max-w-[80%] inline-block',
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
                    <div v-html="renderMarkdown(message.content)" />
                    <div
                      v-if="message.isStreaming && (!message.toolCalls || message.toolCalls.length === 0)"
                      class="inline-flex items-center gap-0.5 mt-1"
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
                  class="mt-2"
                >
                  <template v-if="message.toolCalls[0]?.status !== undefined">
                    <div
                      class="bg-gray-800/50 border border-gray-700 rounded overflow-hidden"
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
                    class="flex items-center gap-1.5 px-2 py-1 bg-gray-800/50 border border-gray-700 rounded text-xs text-gray-400"
                  >
                    <Icon name="lucide:wrench" class="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{{ message.toolCalls.length }} tool call{{ message.toolCalls.length > 1 ? 's' : '' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

