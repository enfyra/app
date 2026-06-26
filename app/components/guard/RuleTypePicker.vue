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
    iconColor: 'eapp-status-warning-text',
    iconBg: 'bg-[var(--status-warning-base)]',
    activeClass: 'eapp-status-warning-soft',
    checkColor: 'eapp-status-warning-text',
    description: 'Limit requests per IP address. Best for preventing abuse from a single source.',
    requiresAuth: false,
  },
  {
    value: 'rate_limit_by_user',
    label: 'Rate Limit by User',
    icon: 'lucide:user-check',
    iconColor: 'eapp-primary-text',
    iconBg: 'eapp-primary-solid',
    activeClass: 'eapp-primary-soft',
    checkColor: 'eapp-primary-text',
    description: 'Limit requests per authenticated user. Requires Post-Auth position.',
    requiresAuth: true,
  },
  {
    value: 'rate_limit_by_route',
    label: 'Rate Limit by Route',
    icon: 'lucide:route',
    iconColor: 'eapp-primary-text',
    iconBg: 'eapp-primary-solid',
    activeClass: 'eapp-primary-soft',
    checkColor: 'eapp-primary-text',
    description: 'Limit total requests to this route regardless of source. Protects against traffic spikes.',
    requiresAuth: false,
  },
  {
    value: 'ip_whitelist',
    label: 'IP Whitelist',
    icon: 'lucide:shield-check',
    iconColor: 'eapp-status-success-text',
    iconBg: 'bg-[var(--status-success-base)]',
    activeClass: 'eapp-status-success-soft',
    checkColor: 'eapp-status-success-text',
    description: 'Only allow requests from specific IPs or CIDR ranges. All other IPs are blocked.',
    requiresAuth: false,
  },
  {
    value: 'ip_blacklist',
    label: 'IP Blacklist',
    icon: 'lucide:shield-x',
    iconColor: 'eapp-status-danger-text',
    iconBg: 'bg-[var(--status-danger-base)]',
    activeClass: 'eapp-status-danger-soft',
    checkColor: 'eapp-status-danger-text',
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
