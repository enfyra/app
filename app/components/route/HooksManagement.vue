<template>
  <CommonFormCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Hooks</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Pre-hooks execute before handlers, post-hooks execute after. Priority determines execution order.
          </p>
        </div>
        <div class="flex gap-2">
          <UButton
            icon="lucide:plus"
            size="sm"
            variant="solid"
            color="primary"
            @click="$emit('create', 'pre')"
          >
            Add Pre-Hook
          </UButton>
          <UButton
            icon="lucide:plus"
            size="sm"
            variant="solid"
            color="secondary"
            @click="$emit('create', 'post')"
          >
            Add Post-Hook
          </UButton>
        </div>
      </div>
    </template>

    <div v-if="loading" class="py-8 text-center">
      <div class="inline-block">
        <CommonLoadingState size="sm" type="spinner" />
      </div>
    </div>

    <div v-else-if="hooks.length > 0" class="space-y-3">
      <div
        v-for="hook in sortedHooks"
        :key="getId(hook)"
        class="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 hover:border-gray-300 dark:hover:border-gray-700 transition-colors cursor-pointer"
        @click="$emit('edit', hook)"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3 flex-1">
            <div class="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
              <UIcon name="lucide:link" class="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="text-sm font-semibold text-gray-900 dark:text-white">
                  {{ hook.name || 'Unnamed Hook' }}
                </h4>
                
                <!-- Pre-Hook Badge -->
                <UBadge
                  v-if="hasPreHook(hook)"
                  size="xs"
                  variant="soft"
                  color="primary"
                >
                  Pre-Hook ({{ getPreHookPriority(hook) || 0 }})
                </UBadge>
                
                <!-- After-Hook Badge -->
                <UBadge
                  v-if="hasAfterHook(hook)"
                  size="xs"
                  variant="soft"
                  color="secondary"
                >
                  After-Hook ({{ getAfterHookPriority(hook) || 0 }})
                </UBadge>
                
                <!-- Both Badge -->
                <UBadge
                  v-if="hasPreHook(hook) && hasAfterHook(hook)"
                  size="xs"
                  variant="solid"
                  color="info"
                >
                  Both
                </UBadge>
                
                <UBadge
                  v-if="hook.isSystem"
                  size="xs"
                  variant="soft"
                  color="info"
                >
                  System
                </UBadge>
                <UBadge
                  v-if="hook.isEnabled !== false"
                  size="xs"
                  variant="soft"
                  color="success"
                >
                  Enabled
                </UBadge>
                <UBadge
                  v-else
                  size="xs"
                  variant="soft"
                  color="neutral"
                >
                  Disabled
                </UBadge>
              </div>
              <p
                v-if="hook.description"
                class="text-xs text-gray-500 dark:text-gray-400 mt-1"
              >
                {{ hook.description }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <USwitch
              v-if="!hook.isSystem"
              :model-value="hook.isEnabled !== false"
              @update:model-value="(val) => $emit('toggle', hook, val)"
              @click.stop
            />
            <UButton
              icon="lucide:edit"
              size="sm"
              variant="ghost"
              color="neutral"
              @click.stop="$emit('edit', hook)"
            />
            <UButton
              v-if="!hook.isSystem"
              icon="lucide:trash-2"
              size="sm"
              variant="ghost"
              color="error"
              @click.stop="$emit('delete', hook)"
            />
          </div>
        </div>
      </div>
    </div>

    <CommonEmptyState
      v-else
      title="No hooks"
      description="No hooks have been configured for this route"
      icon="lucide:link"
      size="sm"
    />
  </CommonFormCard>
</template>

<script setup lang="ts">
interface Props {
  hooks: any[];
  loading: boolean;
  hasPreHook: (hook: any) => boolean;
  hasAfterHook: (hook: any) => boolean;
  getPreHookPriority: (hook: any) => number | null;
  getAfterHookPriority: (hook: any) => number | null;
  getId: (item: any) => string;
}

const props = defineProps<Props>();

defineEmits<{
  create: [type?: 'pre' | 'post'];
  edit: [hook: any];
  toggle: [hook: any, enabled: boolean];
  delete: [hook: any];
}>();

const sortedHooks = computed(() => {
  return [...props.hooks].sort((a: any, b: any) => {
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });
});
</script>

