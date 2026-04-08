<template>
  <CommonFormCard>
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-2">
          <UIcon
            name="lucide:shield"
            class="w-5 h-5 text-amber-600 dark:text-amber-400"
          />
          <h3 class="text-lg font-semibold text-[var(--text-primary)]">
            Guards
          </h3>
          <UBadge
            v-if="totalGuards > 0"
            color="neutral"
            variant="soft"
            size="xs"
          >
            {{ totalGuards }}
          </UBadge>
        </div>
        <UButton
          icon="lucide:plus"
          label="Create Guard"
          size="sm"
          variant="solid"
          color="primary"
          @click="$emit('createGuard')"
        />
      </div>
    </template>

    <Transition name="loading-fade" mode="out-in">
      <CommonLoadingState
        v-if="loading"
        title="Loading guards..."
        size="sm"
        type="form"
        context="inline"
      />
      <div v-else>
        <div v-if="guards.length > 0" class="space-y-3">
          <div
            v-for="guard in guards"
            :key="getId(guard)"
            class="flex items-center justify-between gap-3 p-3 rounded-xl border border-transparent surface-muted hover:border-[var(--border-default)] transition-all cursor-pointer"
            @click="navigateTo(`/settings/guards/${getId(guard)}`)"
          >
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div
                class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-amber-500 to-orange-500"
              >
                <UIcon name="lucide:shield" class="w-4 h-4 text-white" />
              </div>
              <div class="min-w-0 flex-1">
                <h4
                  class="text-sm font-medium text-[var(--text-primary)] truncate"
                >
                  {{ guard.name }}
                </h4>
                <p class="text-xs text-[var(--text-tertiary)]">
                  {{ guard.description || `${(guard.combinator || 'and').toUpperCase()} combinator` }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <UBadge
                :color="guard.position === 'pre_auth' ? 'warning' : 'info'"
                variant="soft"
                size="xs"
              >
                {{ guard.position === 'pre_auth' ? 'Pre-Auth' : 'Post-Auth' }}
              </UBadge>
              <UBadge
                :color="guard.isEnabled ? 'success' : 'warning'"
                variant="soft"
                size="xs"
              >
                {{ guard.isEnabled ? 'On' : 'Off' }}
              </UBadge>
              <UIcon
                name="lucide:chevron-right"
                class="w-4 h-4 text-[var(--text-tertiary)]"
              />
            </div>
          </div>

          <div v-if="globalGuards.length > 0" class="mt-4">
            <div class="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
              Global Guards (also apply to this route)
            </div>
            <div
              v-for="guard in globalGuards"
              :key="getId(guard)"
              class="flex items-center justify-between gap-3 p-3 rounded-xl border border-transparent surface-muted hover:border-[var(--border-default)] transition-all cursor-pointer mb-2"
              @click="navigateTo(`/settings/guards/${getId(guard)}`)"
            >
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <div
                  class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-slate-500 to-gray-600"
                >
                  <UIcon name="lucide:globe" class="w-4 h-4 text-white" />
                </div>
                <div class="min-w-0 flex-1">
                  <h4
                    class="text-sm font-medium text-[var(--text-primary)] truncate"
                  >
                    {{ guard.name }}
                  </h4>
                  <p class="text-xs text-[var(--text-tertiary)]">
                    {{ guard.description || 'Global guard' }}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-1.5 flex-shrink-0">
                <UBadge color="error" variant="soft" size="xs">
                  Global
                </UBadge>
                <UBadge
                  :color="guard.position === 'pre_auth' ? 'warning' : 'info'"
                  variant="soft"
                  size="xs"
                >
                  {{ guard.position === 'pre_auth' ? 'Pre-Auth' : 'Post-Auth' }}
                </UBadge>
                <UIcon
                  name="lucide:chevron-right"
                  class="w-4 h-4 text-[var(--text-tertiary)]"
                />
              </div>
            </div>
          </div>
        </div>

        <CommonEmptyState
          v-else-if="globalGuards.length === 0"
          title="No guards"
          description="No guards are assigned to this route. Create a guard to add rate limiting or IP filtering."
          icon="lucide:shield"
          size="sm"
        />

        <div v-else>
          <div class="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
            Global Guards (apply to all routes)
          </div>
          <div
            v-for="guard in globalGuards"
            :key="getId(guard)"
            class="flex items-center justify-between gap-3 p-3 rounded-xl border border-transparent surface-muted hover:border-[var(--border-default)] transition-all cursor-pointer mb-2"
            @click="navigateTo(`/settings/guards/${getId(guard)}`)"
          >
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div
                class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-slate-500 to-gray-600"
              >
                <UIcon name="lucide:globe" class="w-4 h-4 text-white" />
              </div>
              <div class="min-w-0 flex-1">
                <h4
                  class="text-sm font-medium text-[var(--text-primary)] truncate"
                >
                  {{ guard.name }}
                </h4>
              </div>
            </div>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <UBadge color="error" variant="soft" size="xs"> Global </UBadge>
              <UIcon
                name="lucide:chevron-right"
                class="w-4 h-4 text-[var(--text-tertiary)]"
              />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </CommonFormCard>
</template>

<script setup lang="ts">
interface Props {
  guards: any[];
  globalGuards: any[];
  loading: boolean;
}

const props = defineProps<Props>();
defineEmits<{
  createGuard: [];
}>();

const { getId } = useDatabase();

const totalGuards = computed(
  () => props.guards.length + props.globalGuards.length,
);
</script>
