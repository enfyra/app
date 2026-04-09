<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
    <div
      v-for="option in options"
      :key="option.value"
      :class="[
        'relative rounded-xl border p-4 cursor-pointer transition-all',
        modelValue === option.value
          ? option.activeClass
          : 'border-transparent surface-muted hover:border-[var(--border-default)]',
        disabled ? 'opacity-50 pointer-events-none' : '',
      ]"
      @click="!disabled && emit('update:modelValue', option.value)"
    >
      <div
        v-if="modelValue === option.value"
        class="absolute top-2 right-2"
      >
        <UIcon
          name="lucide:check-circle-2"
          :class="['w-5 h-5', option.checkColor]"
        />
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
          <h4 class="text-sm font-semibold text-[var(--text-primary)] mb-0.5">
            {{ option.label }}
          </h4>
          <p class="text-xs text-[var(--text-tertiary)] leading-relaxed">
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
  'update:modelValue': [value: string];
}>();

const options = [
  {
    value: 'and',
    label: 'AND',
    icon: 'lucide:shield-check',
    activeClass: 'border-violet-400/60 bg-violet-50 dark:bg-violet-950/20',
    checkColor: 'text-violet-500',
    iconBg: 'bg-gradient-to-br from-violet-500 to-indigo-500',
    description: 'All rules and sub-guards must pass. If any one fails, the request is blocked.',
  },
  {
    value: 'or',
    label: 'OR',
    icon: 'lucide:split',
    activeClass: 'border-cyan-400/60 bg-cyan-50 dark:bg-cyan-950/20',
    checkColor: 'text-cyan-500',
    iconBg: 'bg-gradient-to-br from-cyan-500 to-teal-500',
    description: 'At least one rule or sub-guard must pass. The request is blocked only if all fail.',
  },
];
</script>
