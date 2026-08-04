<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-3" role="listbox" aria-label="Guard target type">
    <div
      v-for="option in options"
      :key="option.value"
      :class="[
        'relative rounded-xl border p-4 cursor-pointer transition-colors transition-border-color',
        modelValue === option.value
          ? option.activeClass
          : 'border-transparent surface-muted hover:border-[var(--border-default)]',
        disabled ? 'opacity-50 pointer-events-none' : '',
      ]"
      @click="!disabled && emit('update:modelValue', option.value)"
      role="option"
      :tabindex="disabled ? -1 : 0"
      :aria-selected="modelValue === option.value"
      :aria-disabled="disabled"
      @keydown.enter.prevent="!disabled && emit('update:modelValue', option.value)"
      @keydown.space.prevent="!disabled && emit('update:modelValue', option.value)"
    >
      <div v-if="modelValue === option.value" class="absolute top-2 right-2">
        <UIcon name="lucide:check-circle-2" :class="['w-5 h-5', option.checkColor]" />
      </div>

      <div class="flex items-start gap-3">
        <div
          :class="[
            'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
            modelValue === option.value ? option.iconBg : 'bg-[var(--surface-muted)]',
          ]"
        >
          <UIcon
            :name="option.icon"
            :class="[
              'w-5 h-5',
              modelValue === option.value ? 'text-white' : 'text-[var(--text-tertiary)]',
            ]"
          />
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="text-sm font-semibold mb-0.5" :class="modelValue === option.value ? 'text-current' : 'text-[var(--text-primary)]'">
            {{ option.label }}
          </h4>
          <p class="text-xs leading-relaxed" :class="modelValue === option.value ? 'text-current opacity-90' : 'text-[var(--text-tertiary)]'">
            {{ option.description }}
          </p>
        </div>
      </div>

      <div class="mt-3 pt-3" :style="{ borderTop: modelValue === option.value ? '1px solid color-mix(in srgb, currentColor 24%, transparent)' : '1px solid var(--border-default)' }">
        <div class="flex flex-wrap gap-1">
          <UBadge
            v-for="tag in option.tags"
            :key="tag.label"
            :color="tag.color"
            variant="soft"
            size="xs"
          >
            {{ tag.label }}
          </UBadge>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: string | null;
  disabled?: boolean;
}>(), {
  disabled: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const options = [
  {
    value: 'route',
    label: 'Route Guard',
    icon: 'lucide:route',
    activeClass: 'eapp-primary-soft',
    checkColor: 'eapp-primary-text',
    iconBg: 'eapp-primary-solid',
    description: 'Protect REST endpoints. Choose one route and optional HTTP methods, or apply it to every route.',
    tags: [
      { label: 'REST', color: 'info' as const },
      { label: 'Route or global', color: 'neutral' as const },
      { label: 'HTTP methods', color: 'secondary' as const },
    ],
  },
  {
    value: 'graphql',
    label: 'GraphQL Guard',
    icon: 'lucide:braces',
    activeClass: 'eapp-primary-soft',
    checkColor: 'eapp-primary-text',
    iconBg: 'eapp-primary-solid',
    description: 'Protect GraphQL queries and mutations. Choose a table and optionally limit the guard to one operation.',
    tags: [
      { label: 'GraphQL', color: 'warning' as const },
      { label: 'Table', color: 'neutral' as const },
      { label: 'Operation', color: 'neutral' as const },
    ],
  },
];
</script>
