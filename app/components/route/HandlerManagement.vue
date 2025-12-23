<template>
  <CommonFormCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Handlers</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Handlers for this route
          </p>
        </div>
        <UButton
          icon="lucide:plus"
          size="sm"
          variant="solid"
          color="primary"
          @click="$emit('create')"
        >
          Add Handler
        </UButton>
      </div>
    </template>

    <div v-if="loading" class="py-8 text-center">
      <div class="inline-block">
        <CommonLoadingState size="sm" type="spinner" />
      </div>
    </div>

    <div v-else-if="handlers.length > 0" class="space-y-3">
      <div
        v-for="(handler, index) in handlers"
        :key="handler._isDefault ? 'default' : handler.id || index"
        :class="[
          'p-4 rounded-lg border transition-colors cursor-pointer',
          handler._isDefault
            ? 'border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 hover:border-primary-300 dark:hover:border-primary-700'
            : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 hover:border-gray-300 dark:hover:border-gray-700'
        ]"
        @click="$emit('edit', handler)"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3 flex-1">
            <div :class="[
              'w-10 h-10 rounded-lg flex items-center justify-center',
              handler._isDefault
                ? 'bg-primary-100 dark:bg-primary-900/40'
                : 'bg-success-100 dark:bg-success-900/20'
            ]">
              <UIcon 
                :name="handler._isDefault ? 'lucide:sparkles' : 'lucide:command'" 
                :class="[
                  'w-5 h-5',
                  handler._isDefault
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-success-600 dark:text-success-400'
                ]"
              />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h4 class="text-sm font-semibold text-gray-900 dark:text-white">
                  {{ handler.name || handler.logic?.substring(0, 30) || 'Unnamed Handler' }}
                </h4>
                <UBadge
                  v-if="handler._isDefault"
                  size="xs"
                  variant="soft"
                  color="primary"
                >
                  Default
                </UBadge>
                <UBadge
                  v-if="handler.method"
                  size="xs"
                  variant="soft"
                  color="success"
                >
                  {{ handler.method.method }}
                </UBadge>
                <UBadge
                  v-if="handler.isSystem"
                  size="xs"
                  variant="soft"
                  color="info"
                >
                  System
                </UBadge>
              </div>
              <p
                v-if="handler.description"
                class="text-xs text-gray-500 dark:text-gray-400 mt-1"
              >
                {{ handler.description }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              :icon="handler._isDefault ? 'lucide:plus' : 'lucide:edit'"
              size="sm"
              variant="ghost"
              :color="handler._isDefault ? 'primary' : 'neutral'"
              @click.stop="$emit('edit', handler)"
            >
              {{ handler._isDefault ? 'Create' : '' }}
            </UButton>
            <UButton
              v-if="!handler.isSystem && !handler._isDefault"
              icon="lucide:trash-2"
              size="sm"
              variant="ghost"
              color="error"
              @click.stop="$emit('delete', handler)"
            />
          </div>
        </div>
      </div>
    </div>

    <CommonEmptyState
      v-else
      title="No handlers"
      description="No handlers have been configured for this route"
      icon="lucide:command"
      size="sm"
    />
  </CommonFormCard>
</template>

<script setup lang="ts">
interface Props {
  handlers: any[];
  loading: boolean;
  hasMainTable?: boolean;
}

defineProps<Props>();

defineEmits<{
  create: [];
  edit: [handler: any];
  delete: [handler: any];
}>();
</script>

