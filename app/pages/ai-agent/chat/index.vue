<template>
  <div class="space-y-6">
    <Transition name="loading-fade" mode="out-in">
      <CommonLoadingState
        v-if="!isMounted || loading"
        title="Loading conversations..."
        description="Fetching your AI conversations"
        size="sm"
        type="card"
        context="page"
      />

      <div
        v-else-if="conversations.length > 0"
        class="space-y-3"
      >
        <div
          v-for="conversation in conversations"
          :key="conversation.id"
          class="group border border-gray-700 rounded-lg p-3 md:p-4 hover:border-primary/50 hover:bg-gray-800/50 transition-colors duration-200 bg-gray-900 cursor-pointer"
          @click="navigateToChat(conversation)"
        >
          <div class="flex items-start gap-2 md:gap-4">
            <!-- Avatar -->
            <div class="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Icon name="lucide:message-circle" class="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-white mb-1.5 md:mb-2 truncate text-sm md:text-base">
                {{ conversation.title || `Conversation #${conversation.id}` }}
              </h3>
              <div class="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-xs text-gray-500">
                <span class="flex items-center gap-1">
                  <Icon name="lucide:calendar" class="w-3 h-3 flex-shrink-0" />
                  <span class="truncate">{{ formatDate(conversation.createdAt) }}</span>
                </span>
                <span class="flex items-center gap-1" v-if="conversation.messageCount">
                  <Icon name="lucide:message-square" class="w-3 h-3 flex-shrink-0" />
                  <span>{{ conversation.messageCount }} messages</span>
                </span>
              </div>
            </div>

            <!-- Action Button -->
            <UButton
              icon="lucide:trash-2"
              variant="ghost"
              color="error"
              size="sm"
              square
              class="flex-shrink-0 md:hidden"
              :loading="getDeleteLoader(conversation.id).isLoading"
              @click.stop="deleteConversation(conversation)"
            />
            <UButton
              icon="lucide:trash-2"
              variant="ghost"
              color="error"
              size="md"
              square
              class="flex-shrink-0 hidden md:flex"
              :loading="getDeleteLoader(conversation.id).isLoading"
              @click.stop="deleteConversation(conversation)"
            />
          </div>
        </div>
      </div>

      <CommonEmptyState
        v-else
        title="No conversations yet"
        description="Start your first conversation with the AI assistant"
        icon="lucide:message-circle"
        size="sm"
      />
    </Transition>

    <!-- Pagination -->
    <div
      v-if="!loading && conversations.length > 0 && total > pageLimit"
      class="flex items-center justify-between mt-6"
    >
      <UPagination
        v-model:page="page"
        :items-per-page="pageLimit"
        :total="total"
        show-edges
        :sibling-count="1"
        :to="
          (p) => ({
            path: route.path,
            query: { ...route.query, page: p },
          })
        "
        :ui="{
          item: 'h-9 w-9 rounded-xl transition-all duration-300',
        }"
      />
      <p class="hidden md:block text-sm text-gray-400">
        Showing <span class="text-gray-200">{{ (page - 1) * pageLimit + 1 }}-{{ Math.min(page * pageLimit, total) }}</span> of <span class="text-gray-200">{{ total }}</span> results
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const route = useRoute()
const { checkPermissionCondition } = usePermissions()

// Pagination
const page = ref(1)
const pageLimit = 9

// Page header
const { registerPageHeader } = usePageHeaderRegistry()
registerPageHeader({
  title: 'AI Chat',
  description: 'Manage your conversations with the AI assistant',
  gradient: 'cyan',
})

// Fetch conversations
const {
  data: apiData,
  pending: loading,
  execute: fetchConversations,
} = useApi(() => '/ai_conversation_definition', {
  query: computed(() => ({
    fields: ['*'].join(','),
    limit: pageLimit,
    page: page.value,
    meta: '*',
    sort: ['-createdAt'].join(','),
  })),
  errorContext: 'Fetch Conversations',
})

const conversations = computed(() => apiData.value?.data || [])
const total = computed(() => apiData.value?.meta?.totalCount || 0)

// Mounted state for skeleton loading
const { isMounted } = useMounted()

// Watch route query for pagination
watch(
  () => route.query.page,
  async (newVal) => {
    page.value = newVal ? Number(newVal) : 1
    await fetchConversations()
  },
  { immediate: true }
)

// Navigate to conversation detail
const navigateToChat = (conversation: any) => {
  router.push(`/ai-agent/chat/${conversation.id}`)
}

// Navigate to create new conversation page
const createNewConversation = () => {
  router.push('/ai-agent/chat/create')
}

// Delete conversation with loader
const { confirm } = useConfirm()
const toast = useToast()
const { createLoader } = useLoader()
const deleteLoaders = ref<Record<string, any>>({})

function getDeleteLoader(conversationId: string) {
  if (!deleteLoaders.value[conversationId]) {
    deleteLoaders.value[conversationId] = createLoader()
  }
  return deleteLoaders.value[conversationId]
}

const deleteConversation = async (conversation: any) => {
  const ok = await confirm({
    title: 'Delete Conversation',
    content: `Are you sure you want to delete "${conversation.title || `Conversation #${conversation.id}`}"? This action cannot be undone.`,
  })

  if (!ok) return

  const loader = getDeleteLoader(conversation.id)

  const { execute: deleteApi, error: deleteError } = useApi(
    () => `/ai_conversation_definition/${conversation.id}`,
    {
      method: 'delete',
      errorContext: 'Delete Conversation',
    }
  )

  await loader.withLoading(async () => {
    await deleteApi()
  })

  if (!deleteError.value) {
    toast.add({
      title: 'Success',
      description: `Conversation "${conversation.title || `#${conversation.id}`}" has been deleted successfully!`,
      color: 'success',
    })

    // Check if we're deleting the last item on the current page
    if (conversations.value.length === 1 && page.value > 1) {
      page.value = page.value - 1
      await router.push({
        path: route.path,
        query: { ...route.query, page: page.value },
      })
    } else {
      await fetchConversations()
    }
  }
}

// Format date
const formatDate = (date: string) => {
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

// Setup header actions
useHeaderActionRegistry({
  id: 'create-conversation',
  label: 'New Conversation',
  icon: 'lucide:plus',
  variant: 'solid',
  color: 'primary',
  onClick: createNewConversation,
})
</script>

<style scoped>
.loading-fade-enter-active,
.loading-fade-leave-active {
  transition: opacity 0.2s ease;
}

.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
