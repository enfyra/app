<template>
  <div class="w-full">
    <div v-if="triggerType === 'schedule'" class="rounded-xl border p-4 space-y-5" :style="{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-subtle)' }">
      <div class="space-y-4">
        <div>
          <p class="text-sm font-semibold" style="color: var(--text-primary)">Schedule</p>
          <p class="mt-1 text-sm" style="color: var(--text-secondary)">
            Pick a common cadence or keep a custom cron expression for precise automation.
          </p>
        </div>
        <div class="grid gap-3 md:grid-cols-2">
          <div class="rounded-lg border px-3 py-2 text-sm" :style="{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }">
            <p class="text-xs font-medium uppercase tracking-wide" style="color: var(--text-tertiary)">Cadence</p>
            <p class="mt-1 font-semibold" style="color: var(--text-primary)">{{ scheduleLabel }}</p>
          </div>
          <div class="rounded-lg border px-3 py-2 text-sm" :style="{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }">
            <p class="text-xs font-medium uppercase tracking-wide" style="color: var(--text-tertiary)">Timezone</p>
            <p class="mt-1 font-semibold" style="color: var(--text-primary)">{{ selectedTimezone }}</p>
          </div>
        </div>
      </div>

      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <button
          v-for="preset in schedulePresets"
          :key="preset.key"
          type="button"
          class="rounded-lg border p-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--theme-focus-ring-strong)]"
          :class="selectedPresetKey === preset.key ? 'ring-2 ring-[var(--theme-focus-ring-strong)]' : 'hover:border-[var(--md-primary)]'"
          :style="{ borderColor: selectedPresetKey === preset.key ? 'var(--md-primary)' : 'var(--border-subtle)', backgroundColor: selectedPresetKey === preset.key ? 'var(--bg-primary)' : 'transparent' }"
          @click="applyPreset(preset.cron)"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-semibold" style="color: var(--text-primary)">{{ preset.label }}</span>
            <UBadge v-if="preset.recommended" size="xs" color="primary" variant="soft">Ops</UBadge>
          </div>
          <p class="mt-1 text-xs" style="color: var(--text-tertiary)">{{ preset.description }}</p>
          <code class="mt-3 block rounded-md px-2 py-1 text-xs" :style="{ backgroundColor: 'var(--surface-muted)', color: 'var(--text-secondary)' }">{{ preset.cron }}</code>
        </button>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <UFormField label="Cron expression" class="w-full">
          <UInput :model-value="selectedCron" @update:model-value="updateField('cron', $event)" placeholder="0 2 * * *" class="w-full" />
          <template #description>
            <span class="text-xs" style="color: var(--text-tertiary)">Five-field cron: minute hour day month weekday.</span>
          </template>
        </UFormField>

        <UFormField label="Timezone" class="w-full">
          <UInputMenu
            :model-value="timezoneItem"
            :items="timezoneItems"
            v-model:search-term="tzSearch"
            :filter="false"
            placeholder="Search all timezones..."
            class="w-full"
            by="value"
            @update:model-value="selectTimezone"
          />
          <template #description>
            <span class="text-xs" style="color: var(--text-tertiary)">All IANA timezones are available. Type a city or region to filter.</span>
          </template>
        </UFormField>
      </div>

      <div class="space-y-2">
        <p class="text-xs font-medium uppercase tracking-wide" style="color: var(--text-tertiary)">Suggested timezones</p>
        <div class="flex flex-wrap gap-2">
        <UButton
          v-for="tz in quickTimezones"
          :key="tz"
          type="button"
          size="xs"
          :variant="selectedTimezone === tz ? 'solid' : 'soft'"
          color="neutral"
          @click="setTimezone(tz)"
        >
          {{ tz }}
        </UButton>
        </div>
      </div>
    </div>

    <div v-else-if="triggerType === 'event'" class="rounded-lg border p-4 space-y-4" :style="{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-subtle)' }">
      <UFormField label="Table" class="w-full">
        <UInput :model-value="parsed.table" @update:model-value="updateField('table', $event)" placeholder="order" class="w-full" />
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

const schedulePresets = [
  { key: '5m', label: 'Every 5 minutes', description: 'Fast polling for short operational checks.', cron: '*/5 * * * *', recommended: true },
  { key: '15m', label: 'Every 15 minutes', description: 'Balanced cadence for health reconciliation.', cron: '*/15 * * * *', recommended: true },
  { key: 'hourly', label: 'Hourly', description: 'Runs at the start of every hour.', cron: '0 * * * *' },
  { key: 'daily', label: 'Daily at 02:00', description: 'Low-traffic daily maintenance window.', cron: '0 2 * * *' },
  { key: 'weekly', label: 'Weekly Monday', description: 'Runs every Monday at 02:00.', cron: '0 2 * * 1' },
  { key: 'monthly', label: 'Monthly', description: 'Runs on the first day of each month.', cron: '0 2 1 * *' },
];

const quickTimezones = ['UTC', 'Asia/Ho_Chi_Minh', 'Asia/Singapore', 'Asia/Tokyo', 'Europe/London', 'America/New_York'];

const allTimezones = (() => {
  try { return Intl.supportedValuesOf('timeZone'); } catch { return ['UTC', 'Asia/Ho_Chi_Minh', 'Asia/Tokyo', 'Asia/Singapore', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Australia/Sydney']; }
})();
const tzSearch = ref('');
const timezoneItems = computed(() => {
  const q = tzSearch.value.toLowerCase();
  return allTimezones.filter(tz => !q || tz.toLowerCase().includes(q)).map(tz => ({ label: tz, value: tz }));
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

const selectedCron = computed(() => parsed.value.cron || '');
const selectedTimezone = computed(() => parsed.value.timezone || 'UTC');
const selectedPresetKey = computed(() => schedulePresets.find(preset => preset.cron === selectedCron.value)?.key || 'custom');
const scheduleLabel = computed(() => {
  const preset = schedulePresets.find(item => item.key === selectedPresetKey.value);
  if (preset) return preset.label;
  return selectedCron.value ? 'Custom schedule' : 'No schedule configured';
});

function updateField(field: string, value: any) {
  const current = { ...parsed.value };
  current[field] = value;
  emit('update:modelValue', current);
}

function applyPreset(cron: string) {
  updateField('cron', cron);
}

function setTimezone(timezone: string) {
  tzSearch.value = '';
  updateField('timezone', timezone);
}

function selectTimezone(value: any) {
  tzSearch.value = '';
  updateField('timezone', value?.value || 'UTC');
}
</script>
