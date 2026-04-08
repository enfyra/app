<template>
  <div class="grid grid-cols-1 gap-2">
    <div
      v-for="option in filteredOptions"
      :key="option.value"
      :class="[
        'relative rounded-xl border p-3 cursor-pointer transition-all',
        modelValue === option.value
          ? option.activeClass
          : 'border-transparent surface-muted hover:border-[var(--border-default)]',
        disabled ? 'opacity-50 pointer-events-none' : '',
      ]"
      @click="!disabled && emit('update:modelValue', option.value)"
    >
      <div class="flex items-center gap-3">
        <div
          :class="[
            'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
            modelValue === option.value ? option.iconBg : 'bg-[var(--surface-muted)]',
          ]"
        >
          <UIcon
            :name="option.icon"
            :class="[
              'w-4.5 h-4.5',
              modelValue === option.value ? 'text-white' : option.iconColor,
            ]"
          />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <h4 class="text-sm font-semibold text-[var(--text-primary)]">
              {{ option.label }}
            </h4>
            <UIcon
              v-if="modelValue === option.value"
              name="lucide:check-circle-2"
              :class="['w-4 h-4', option.checkColor]"
            />
          </div>
          <p class="text-xs text-[var(--text-tertiary)] leading-relaxed">
            {{ option.description }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string | null;
  disabled?: boolean;
  guardPosition?: string | null;
}>(), {
  disabled: false,
  guardPosition: null,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const allOptions = [
  {
    value: 'rate_limit_by_ip',
    label: 'Rate Limit by IP',
    icon: 'lucide:gauge',
    iconColor: 'text-amber-500',
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500',
    activeClass: 'border-amber-400/60 bg-amber-50 dark:bg-amber-950/20',
    checkColor: 'text-amber-500',
    description: 'Limit requests per IP address. Best for preventing abuse from a single source.',
    requiresAuth: false,
  },
  {
    value: 'rate_limit_by_user',
    label: 'Rate Limit by User',
    icon: 'lucide:user-check',
    iconColor: 'text-blue-500',
    iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-500',
    activeClass: 'border-blue-400/60 bg-blue-50 dark:bg-blue-950/20',
    checkColor: 'text-blue-500',
    description: 'Limit requests per authenticated user. Requires Post-Auth position.',
    requiresAuth: true,
  },
  {
    value: 'rate_limit_by_route',
    label: 'Rate Limit by Route',
    icon: 'lucide:route',
    iconColor: 'text-purple-500',
    iconBg: 'bg-gradient-to-br from-purple-500 to-violet-500',
    activeClass: 'border-purple-400/60 bg-purple-50 dark:bg-purple-950/20',
    checkColor: 'text-purple-500',
    description: 'Limit total requests to this route regardless of source. Protects against traffic spikes.',
    requiresAuth: false,
  },
  {
    value: 'ip_whitelist',
    label: 'IP Whitelist',
    icon: 'lucide:shield-check',
    iconColor: 'text-emerald-500',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-500',
    activeClass: 'border-emerald-400/60 bg-emerald-50 dark:bg-emerald-950/20',
    checkColor: 'text-emerald-500',
    description: 'Only allow requests from specific IPs or CIDR ranges. All other IPs are blocked.',
    requiresAuth: false,
  },
  {
    value: 'ip_blacklist',
    label: 'IP Blacklist',
    icon: 'lucide:shield-x',
    iconColor: 'text-red-500',
    iconBg: 'bg-gradient-to-br from-red-500 to-rose-500',
    activeClass: 'border-red-400/60 bg-red-50 dark:bg-red-950/20',
    checkColor: 'text-red-500',
    description: 'Block requests from specific IPs or CIDR ranges. All other IPs are allowed.',
    requiresAuth: false,
  },
];

const filteredOptions = computed(() => {
  if (props.guardPosition === 'pre_auth') {
    return allOptions.filter((o) => !o.requiresAuth);
  }
  return allOptions;
});
</script>
