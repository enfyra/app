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
            modelValue === option.value
              ? option.iconBg
              : 'bg-[var(--surface-muted)]',
          ]"
        >
          <UIcon
            :name="option.icon"
            :class="[
              'w-5 h-5',
              modelValue === option.value
                ? 'text-white'
                : 'text-[var(--text-tertiary)]',
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

      <div class="mt-3 pt-3" style="border-top: 1px solid var(--border-default)">
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
    value: 'pre_auth',
    label: 'Pre-Auth',
    icon: 'lucide:shield-alert',
    activeClass: 'border-amber-400/60 bg-amber-50 dark:bg-amber-950/20',
    checkColor: 'text-amber-500',
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500',
    description: 'Runs before authentication. No user info available. Use for IP-based rules and global rate limiting.',
    tags: [
      { label: 'Before JWT', color: 'warning' as const },
      { label: 'IP only', color: 'neutral' as const },
      { label: 'Fastest reject', color: 'success' as const },
    ],
  },
  {
    value: 'post_auth',
    label: 'Post-Auth',
    icon: 'lucide:shield-check',
    activeClass: 'border-blue-400/60 bg-blue-50 dark:bg-blue-950/20',
    checkColor: 'text-blue-500',
    iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-500',
    description: 'Runs after authentication and role check. User info available. Use for per-user rate limiting and user-scoped rules.',
    tags: [
      { label: 'After Role check', color: 'info' as const },
      { label: 'Has user', color: 'primary' as const },
      { label: 'User scoping', color: 'secondary' as const },
    ],
  },
];
</script>
