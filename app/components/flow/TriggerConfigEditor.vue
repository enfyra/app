<template>
  <div class="w-full">
    <div v-if="triggerType === 'schedule'" class="rounded-lg border p-4 space-y-4" :style="{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-subtle)' }">
      <UFormField label="Cron Expression" class="w-full">
        <UInput :model-value="parsed.cron" @update:model-value="updateField('cron', $event)" placeholder="0 2 * * *" class="w-full" />
        <template #description>
          <span class="text-xs" style="color: var(--text-tertiary)">e.g. 0 2 * * * = 2AM daily, */5 * * * * = every 5min</span>
        </template>
      </UFormField>
      <div class="border-t" :style="{ borderColor: 'var(--border-subtle)' }" />
      <UFormField label="Timezone" class="w-full">
        <UInputMenu
          :model-value="timezoneItem"
          :items="timezoneItems"
          v-model:search-term="tzSearch"
          :filter="false"
          placeholder="Search timezone..."
          class="w-full"
          by="value"
          @update:model-value="(v: any) => updateField('timezone', v?.value || 'UTC')"
        />
      </UFormField>
    </div>

    <div v-else-if="triggerType === 'event'" class="rounded-lg border p-4 space-y-4" :style="{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-subtle)' }">
      <UFormField label="Table" class="w-full">
        <UInput :model-value="parsed.table" @update:model-value="updateField('table', $event)" placeholder="order_definition" class="w-full" />
      </UFormField>
      <div class="border-t" :style="{ borderColor: 'var(--border-subtle)' }" />
      <UFormField label="Action" class="w-full">
        <USelect :model-value="parsed.action || 'create'" @update:model-value="updateField('action', $event)" :items="eventActions" class="w-full" />
      </UFormField>
    </div>

    <div v-else-if="triggerType === 'webhook'" class="rounded-lg border p-4" :style="{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-subtle)' }">
      <UFormField label="Webhook Path" class="w-full">
        <UInput :model-value="parsed.path" @update:model-value="updateField('path', $event)" placeholder="/hooks/payment" class="w-full" />
        <template #description>
          <span class="text-xs" style="color: var(--text-tertiary)">Endpoint path that triggers this flow</span>
        </template>
      </UFormField>
    </div>

    <div v-else-if="triggerType === 'manual'" class="rounded-lg border p-4" :style="{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-subtle)' }">
      <p class="text-sm" style="color: var(--text-tertiary)">No configuration needed for manual trigger.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue?: any;
  triggerType?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: any];
}>();

const allTimezones = (() => {
  try { return Intl.supportedValuesOf('timeZone'); } catch { return ['UTC', 'Asia/Ho_Chi_Minh', 'Asia/Tokyo', 'Asia/Singapore', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Australia/Sydney']; }
})();
const tzSearch = ref('');
const timezoneItems = computed(() => {
  const q = tzSearch.value.toLowerCase();
  return allTimezones.filter(tz => !q || tz.toLowerCase().includes(q)).slice(0, 20).map(tz => ({ label: tz, value: tz }));
});
const timezoneItem = computed(() => {
  const val = parsed.value.timezone || 'UTC';
  return { label: val, value: val };
});
const eventActions = ['create', 'update', 'delete'];

const parsed = computed(() => {
  if (!props.modelValue) return {};
  if (typeof props.modelValue === 'string') { try { return JSON.parse(props.modelValue); } catch { return {}; } }
  return props.modelValue;
});

function updateField(field: string, value: any) {
  const current = { ...parsed.value };
  current[field] = value;
  emit('update:modelValue', current);
}
</script>
