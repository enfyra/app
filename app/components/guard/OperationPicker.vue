<template>
  <div class="grid grid-cols-2 md:grid-cols-3 gap-2" role="listbox" aria-label="GraphQL operation">
    <div
      v-for="option in options"
      :key="option.value ?? '__all__'"
      :class="[
        'relative rounded-xl border p-3 cursor-pointer transition-colors transition-border-color',
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
      <div class="flex items-center gap-2">
        <div
          :class="[
            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
            modelValue === option.value ? option.iconBg : 'bg-[var(--surface-muted)]',
          ]"
        >
          <UIcon
            :name="option.icon"
            :class="[
              'w-4 h-4',
              modelValue === option.value ? 'text-white' : 'text-[var(--text-tertiary)]',
            ]"
          />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="text-sm font-semibold text-[var(--text-primary)] truncate">
              {{ option.label }}
            </span>
            <UIcon
              v-if="modelValue === option.value"
              name="lucide:check-circle-2"
              :class="['w-4 h-4 flex-shrink-0', option.checkColor]"
            />
          </div>
          <p class="text-xs text-[var(--text-tertiary)] leading-relaxed truncate">
            {{ option.description }}
          </p>
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
  'update:modelValue': [value: string | null];
}>();

const options = [
  {
    value: null,
    label: 'All operations',
    icon: 'lucide:asterisk',
    activeClass: 'eapp-primary-soft',
    checkColor: 'eapp-primary-text',
    iconBg: 'eapp-primary-solid',
    description: 'Matches every GraphQL operation',
  },
  {
    value: 'QUERY',
    label: 'Query',
    icon: 'lucide:search',
    activeClass: 'eapp-primary-soft',
    checkColor: 'eapp-primary-text',
    iconBg: 'eapp-primary-solid',
    description: 'Reads (list / find one)',
  },
  {
    value: 'CREATE',
    label: 'Create',
    icon: 'lucide:plus-circle',
    activeClass: 'eapp-status-success-soft',
    checkColor: 'eapp-status-success-text',
    iconBg: 'bg-[var(--status-success-base)]',
    description: 'Insert mutations',
  },
  {
    value: 'UPDATE',
    label: 'Update',
    icon: 'lucide:pencil',
    activeClass: 'eapp-status-warning-soft',
    checkColor: 'eapp-status-warning-text',
    iconBg: 'bg-[var(--status-warning-base)]',
    description: 'Patch mutations',
  },
  {
    value: 'DELETE',
    label: 'Delete',
    icon: 'lucide:trash-2',
    activeClass: 'eapp-status-danger-soft',
    checkColor: 'eapp-status-danger-text',
    iconBg: 'bg-[var(--status-danger-base)]',
    description: 'Remove mutations',
  },
];
</script>
