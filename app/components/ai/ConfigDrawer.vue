<script setup lang="ts">
interface Config {
  id: string | number
  name?: string
  description?: string
  provider?: string
  model?: string
  [key: string]: any
}

interface Props {
  modelValue: boolean
  currentConfig?: Config | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'select', config: Config): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  currentConfig: null,
})

const emit = defineEmits<Emits>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const selectedConfig = ref<Config | null>(props.currentConfig)
const { isMobile, isTablet } = useScreen()

// Get AI configs from global state
const { aiConfigs } = useGlobalState()
const configs = computed(() => aiConfigs.value || [])
const loading = ref(false)

// Watch for config changes from parent
watch(() => props.currentConfig, (newConfig) => {
  selectedConfig.value = newConfig
})

// Initialize selected config when drawer opens
watch(isOpen, (isOpen) => {
  if (isOpen) {
    selectedConfig.value = props.currentConfig
  }
})

const selectConfig = (config: Config) => {
  selectedConfig.value = config
}

const applyConfig = () => {
  if (selectedConfig.value) {
    emit('select', selectedConfig.value)
    closeDrawer()
  }
}

const closeDrawer = () => {
  isOpen.value = false
}
</script>

<template>
  <CommonDrawer
    :handle="false"
    handle-only
    v-model="isOpen"
    direction="right"
  >
    <template #header>
      <div :class="(isMobile || isTablet) ? 'flex items-center gap-2 min-w-0 flex-1' : 'flex items-center gap-3'">
        <div
          :class="(isMobile || isTablet) ? 'w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg flex-shrink-0' : 'w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg'"
        >
          <Icon name="lucide:brain" :class="(isMobile || isTablet) ? 'text-xs text-white' : 'text-sm text-white'" />
        </div>
        <div class="min-w-0 flex-1">
          <h2 :class="(isMobile || isTablet) ? 'text-base font-semibold text-foreground truncate' : 'text-xl font-semibold text-foreground'">
            AI Configuration
          </h2>
          <p :class="(isMobile || isTablet) ? 'text-xs text-muted-foreground truncate' : 'text-sm text-muted-foreground'">
            Select configuration for your conversation
          </p>
        </div>
      </div>
    </template>

      <template #body>
        <div :class="(isMobile || isTablet) ? 'space-y-3' : 'space-y-6'">
          <!-- Configs List Section -->
          <div :class="(isMobile || isTablet) ? 'bg-gray-800/50 rounded-lg border border-muted/30 p-3' : 'bg-gray-800/50 rounded-xl border border-muted/30 p-6'">
            <div :class="(isMobile || isTablet) ? 'flex items-center gap-1.5 mb-3' : 'flex items-center gap-2 mb-4'">
              <Icon name="lucide:settings-2" class="text-info" :size="(isMobile || isTablet) ? '16' : '18'" />
              <h3 :class="(isMobile || isTablet) ? 'text-sm font-semibold text-foreground' : 'text-lg font-semibold text-foreground'">
                Available Configurations
              </h3>
            </div>

            <Transition name="loading-fade" mode="out-in">
              <CommonLoadingState
                v-if="loading"
                title="Loading configurations..."
                description="Fetching available AI configs"
                size="sm"
                type="spinner"
                context="page"
              />

              <div v-else-if="configs.length > 0" :class="(isMobile || isTablet) ? 'space-y-2' : 'space-y-3'">
                <div
                  v-for="config in configs"
                  :key="config.id"
                  class="border rounded-lg cursor-pointer transition-all duration-200"
                  :class="[
                    (isMobile || isTablet) ? 'p-3' : 'p-4',
                    selectedConfig?.id === config.id
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/50'
                  ]"
                  @click="selectConfig(config)"
                >
                  <div class="flex items-start gap-3">
                    <div
                      class="rounded-lg flex items-center justify-center flex-shrink-0"
                      :class="[
                        (isMobile || isTablet) ? 'w-8 h-8' : 'w-10 h-10',
                        selectedConfig?.id === config.id
                          ? 'bg-primary/20'
                          : 'bg-gray-800'
                      ]"
                    >
                      <Icon
                        name="lucide:cpu"
                        :class="[
                          (isMobile || isTablet) ? 'w-4 h-4' : 'w-5 h-5',
                          selectedConfig?.id === config.id
                            ? 'text-primary'
                            : 'text-gray-400'
                        ]"
                      />
                    </div>
                    <div class="flex-1 min-w-0">
                      <h4 :class="(isMobile || isTablet) ? 'text-sm font-medium text-white mb-1' : 'font-medium text-white mb-1'">
                        {{ config.name || `Config #${config.id}` }}
                      </h4>
                      <p v-if="config.description" :class="(isMobile || isTablet) ? 'text-xs text-gray-400 line-clamp-2' : 'text-sm text-gray-400 line-clamp-2'">
                        {{ config.description }}
                      </p>
                      <div :class="(isMobile || isTablet) ? 'flex items-center gap-1.5 mt-1.5' : 'flex items-center gap-2 mt-2'">
                        <span :class="(isMobile || isTablet) ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'" class="rounded-full bg-gray-800 text-gray-300">
                          {{ config.provider || 'Unknown' }}
                        </span>
                        <span v-if="config.model" :class="(isMobile || isTablet) ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'" class="rounded-full bg-gray-800 text-gray-300">
                          {{ config.model }}
                        </span>
                      </div>
                    </div>
                    <Icon
                      v-if="selectedConfig?.id === config.id"
                      name="lucide:check-circle"
                      :class="(isMobile || isTablet) ? 'w-4 h-4' : 'w-5 h-5'"
                      class="text-primary flex-shrink-0"
                    />
                  </div>
                </div>
              </div>

              <CommonEmptyState
                v-else
                title="No configurations available"
                description="Please create an AI configuration first"
                icon="lucide:settings"
                size="sm"
              />
            </Transition>
          </div>

          <!-- Actions Section -->
          <div :class="(isMobile || isTablet) ? 'bg-gray-800/50 rounded-lg border border-muted/30 p-3' : 'bg-gray-800/50 rounded-xl border border-muted/30 p-4'">
            <div class="flex items-center justify-between">
              <div v-if="!isMobile && !isTablet" class="flex items-center gap-2">
                <Icon
                  name="lucide:info"
                  class="text-muted-foreground"
                  size="16"
                />
                <span class="text-sm text-muted-foreground">
                  {{ selectedConfig ? 'Ready to apply configuration' : 'Please select a configuration' }}
                </span>
              </div>
              <div :class="(isMobile || isTablet) ? 'flex gap-1.5 w-full justify-end' : 'flex gap-3'">
                <UButton
                  variant="ghost"
                  color="neutral"
                  @click="closeDrawer"
                  :size="(isMobile || isTablet) ? 'sm' : 'md'"
                  :icon="(isMobile || isTablet) ? 'lucide:x' : undefined"
                >
                  {{ (isMobile || isTablet) ? '' : 'Cancel' }}
                </UButton>
                <UButton
                  variant="solid"
                  color="primary"
                  @click="applyConfig"
                  :disabled="!selectedConfig"
                  :size="(isMobile || isTablet) ? 'sm' : 'md'"
                  :icon="(isMobile || isTablet) ? 'lucide:check' : undefined"
                >
                  {{ (isMobile || isTablet) ? '' : 'Apply' }}
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </template>
    </CommonDrawer>
</template>

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
