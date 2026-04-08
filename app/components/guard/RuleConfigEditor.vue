<template>
  <div class="space-y-4">
    <template v-if="isRateLimit">
      <UFormField label="Max Requests" required>
        <UInput
          :model-value="String(localConfig.maxRequests ?? '')"
          @update:model-value="(v: any) => updateField('maxRequests', Number(v))"
          type="number"
          placeholder="100"
        />
      </UFormField>
      <UFormField label="Per Seconds (window)" required>
        <UInput
          :model-value="String(localConfig.perSeconds ?? '')"
          @update:model-value="(v: any) => updateField('perSeconds', Number(v))"
          type="number"
          placeholder="60"
        />
      </UFormField>
      <div class="p-3 rounded-lg bg-[var(--surface-muted)]">
        <p class="text-xs text-[var(--text-tertiary)]">
          Allows <span class="font-medium text-[var(--text-primary)]">{{ localConfig.maxRequests || '?' }}</span>
          requests per
          <span class="font-medium text-[var(--text-primary)]">{{ localConfig.perSeconds || '?' }}</span>
          second{{ (localConfig.perSeconds || 0) > 1 ? 's' : '' }} using a sliding window.
        </p>
      </div>
    </template>

    <template v-else-if="isIpList">
      <UFormField :label="ruleType === 'ip_whitelist' ? 'Allowed IPs' : 'Blocked IPs'" required>
        <div class="space-y-2">
          <div
            v-for="(ip, index) in (localConfig.ips as string[])"
            :key="index"
            class="flex items-center gap-2"
          >
            <UInput
              :model-value="ip"
              @update:model-value="(v: any) => updateIp(Number(index), String(v))"
              placeholder="192.168.1.0/24 or 10.0.0.1"
              class="flex-1"
            />
            <UButton
              icon="lucide:x"
              color="error"
              variant="ghost"
              size="xs"
              @click="removeIp(Number(index))"
            />
          </div>
          <UButton
            icon="lucide:plus"
            label="Add IP"
            size="xs"
            variant="soft"
            color="primary"
            @click="addIp"
          />
        </div>
      </UFormField>
      <div class="p-3 rounded-lg bg-[var(--surface-muted)]">
        <p class="text-xs text-[var(--text-tertiary)]">
          Supports exact IPs (e.g. <code class="text-[var(--text-secondary)]">10.0.0.1</code>) and
          CIDR ranges (e.g. <code class="text-[var(--text-secondary)]">192.168.0.0/16</code>).
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: Record<string, any>;
  ruleType: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>];
}>();

const isRateLimit = computed(() =>
  ['rate_limit_by_ip', 'rate_limit_by_user', 'rate_limit_by_route'].includes(props.ruleType),
);

const isIpList = computed(() =>
  ['ip_whitelist', 'ip_blacklist'].includes(props.ruleType),
);

const localConfig = computed(() => {
  const config = props.modelValue || {};
  if (isRateLimit.value) {
    return {
      maxRequests: config.maxRequests ?? 100,
      perSeconds: config.perSeconds ?? 60,
    };
  }
  if (isIpList.value) {
    return {
      ips: Array.isArray(config.ips) ? config.ips : [],
    };
  }
  return config;
});

function updateField(key: string, value: any) {
  emit('update:modelValue', { ...localConfig.value, [key]: value });
}

function updateIp(index: number, value: string) {
  const ips = [...(localConfig.value.ips || [])];
  ips[index] = value;
  emit('update:modelValue', { ...localConfig.value, ips });
}

function addIp() {
  const ips = [...(localConfig.value.ips || []), ''];
  emit('update:modelValue', { ...localConfig.value, ips });
}

function removeIp(index: number) {
  const ips = [...(localConfig.value.ips || [])];
  ips.splice(index, 1);
  emit('update:modelValue', { ...localConfig.value, ips });
}
</script>
