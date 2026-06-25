<template>
  <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
    <button
      v-for="template in templates"
      :key="template.key"
      type="button"
      :class="[
        'group h-full text-left rounded-lg border-2 p-4 transition-colors',
        modelValue === template.key
          ? 'border-[var(--state-primary-outline-border)] bg-[var(--state-primary-soft-bg)] shadow-panel-sm'
          : 'surface-card border-transparent hover:border-[var(--border-default)] hover:bg-[var(--surface-muted)]',
      ]"
      @click="emit('update:modelValue', template.key)"
    >
      <div class="flex items-start gap-3">
        <div
          :class="[
            'flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors',
            modelValue === template.key
              ? 'bg-[var(--action-primary-bg)] text-[var(--action-primary-text)]'
              : 'bg-[var(--surface-muted)] text-[var(--text-tertiary)] group-hover:text-[var(--state-primary-soft-text)]',
          ]"
        >
          <UIcon :name="template.icon" class="size-5" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <h3
              :class="[
                'truncate text-sm font-semibold',
                modelValue === template.key ? 'text-[var(--state-primary-soft-text)]' : 'text-[var(--text-primary)]',
              ]"
            >
              {{ template.title }}
            </h3>
            <span
              :class="[
                'inline-flex h-6 min-w-20 items-center justify-center rounded-md px-2 text-[11px] font-medium',
                modelValue === template.key
                  ? 'bg-[var(--state-primary-outline-border)] text-[var(--state-primary-soft-text)]'
                  : 'bg-[var(--surface-muted)] text-[var(--text-tertiary)]',
              ]"
            >
              {{ template.position === 'pre_auth' ? 'Pre-Auth' : 'Post-Auth' }}
            </span>
          </div>
          <p
            :class="[
              'mt-1 line-clamp-2 min-h-8 text-xs leading-4',
              modelValue === template.key ? 'text-[var(--state-primary-description-text)]' : 'text-[var(--text-tertiary)]',
            ]"
          >
            {{ template.description }}
          </p>
          <div class="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <span
              :class="[
                'truncate text-xs font-medium',
                modelValue === template.key ? 'text-[var(--state-primary-soft-text)]' : 'text-[var(--text-secondary)]',
              ]"
            >
              {{ formatRuleType(template.ruleType) }}
            </span>
            <span
              :class="[
                'flex size-5 items-center justify-center rounded-full border transition-colors',
                modelValue === template.key
                  ? 'border-[var(--action-primary-bg)] bg-[var(--action-primary-bg)] text-[var(--action-primary-text)]'
                  : 'border-[var(--border-default)] text-transparent',
              ]"
            >
              <UIcon name="lucide:check" class="size-3.5" />
            </span>
          </div>
        </div>
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { GuardTemplate } from '~/types/guard-template';

defineProps<{
  modelValue: string | null;
  templates: GuardTemplate[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

function formatRuleType(type: string) {
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
</script>
