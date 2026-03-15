<template>
  <div>
    <template v-if="mode === 'single'">
      <UPopover v-model:open="showModal">
        <UButton
          variant="outline"
          :label="modelValue ? formatDate(modelValue) : 'Date'"
          icon="i-heroicons-calendar"
          size="sm"
          class="min-w-32 min-h-8"
        />
        <template #content="{ close }">
          <div class="filter-date-picker-popover p-3 flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold">Select Date</span>
              <UButton icon="lucide:x" color="neutral" variant="ghost" size="xs" @click="close" />
            </div>
            <UCalendar v-model="tempValue as any" class="w-fit" />
            <UButton color="primary" size="sm" @click="applyAndClose(close)">Apply</UButton>
          </div>
        </template>
      </UPopover>
    </template>

    <template v-else-if="mode === 'range'">
      <div class="flex items-center gap-1">
        <UPopover v-model:open="showFrom">
          <UButton
            variant="outline"
            :label="modelValue?.[0] ? formatDate(modelValue[0]) : 'From'"
            icon="i-heroicons-calendar"
            size="sm"
            class="w-24"
          />
          <template #content="{ close }">
            <div class="filter-date-picker-popover p-3 flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold">From</span>
                <UButton icon="lucide:x" color="neutral" variant="ghost" size="xs" @click="close" />
              </div>
              <UCalendar v-model="tempFrom as any" class="w-fit" />
              <UButton color="primary" size="sm" @click="applyRange('from', close)">Apply</UButton>
            </div>
          </template>
        </UPopover>
        <span class="text-xs text-gray-500">and</span>
        <UPopover v-model:open="showTo">
          <UButton
            variant="outline"
            :label="modelValue?.[1] ? formatDate(modelValue[1]) : 'To'"
            icon="i-heroicons-calendar"
            size="sm"
            class="w-24"
          />
          <template #content="{ close }">
            <div class="filter-date-picker-popover p-3 flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold">To</span>
                <UButton icon="lucide:x" color="neutral" variant="ghost" size="xs" @click="close" />
              </div>
              <UCalendar v-model="tempTo as any" class="w-fit" />
              <UButton color="primary" size="sm" @click="applyRange('to', close)">Apply</UButton>
            </div>
          </template>
        </UPopover>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { CalendarDate } from '@internationalized/date';
import { formatDate } from '~/utils/common/filter/filter-helpers';

const props = defineProps<{
  modelValue: any;
  mode: 'single' | 'range';
}>();

const emit = defineEmits<{
  'update:modelValue': [value: any];
}>();

const today = new Date();
const defaultCalendarDate = new CalendarDate(
  today.getFullYear(),
  today.getMonth() + 1,
  today.getDate()
);

const showModal = ref(false);
const showFrom = ref(false);
const showTo = ref(false);
const tempValue = ref(defaultCalendarDate);
const tempFrom = ref(defaultCalendarDate);
const tempTo = ref(defaultCalendarDate);

watch(showModal, (v) => {
  if (v) {
    const parsed = parseToCalendarDate(props.modelValue);
    tempValue.value = parsed || defaultCalendarDate;
  }
});

watch(showFrom, (v) => {
  if (v) {
    const parsed = parseToCalendarDate(props.modelValue?.[0]);
    tempFrom.value = parsed || defaultCalendarDate;
  }
});

watch(showTo, (v) => {
  if (v) {
    const parsed = parseToCalendarDate(props.modelValue?.[1]);
    tempTo.value = parsed || defaultCalendarDate;
  }
});

function parseToCalendarDate(val: any): CalendarDate | null {
  if (!val) return null;
  try {
    if (val instanceof CalendarDate) return val;
    const str = String(val);
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split('-').map(Number);
      if (y && m && d) return new CalendarDate(y, m, d);
    }
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return null;
    return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
  } catch {
    return null;
  }
}

function calendarDateToISO(cd: CalendarDate | { year: number; month: number; day: number } | null): string {
  if (!cd) return '';
  const y = cd.year;
  const m = String(cd.month).padStart(2, '0');
  const d = String(cd.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function applyAndClose(close: () => void) {
  emit('update:modelValue', calendarDateToISO(tempValue.value));
  close();
}

function applyRange(slot: 'from' | 'to', close: () => void) {
  const currentValue = props.modelValue || ['', ''];
  const iso = slot === 'from'
    ? calendarDateToISO(tempFrom.value)
    : calendarDateToISO(tempTo.value);
  if (slot === 'from') {
    emit('update:modelValue', [iso, currentValue[1]]);
  } else {
    emit('update:modelValue', [currentValue[0], iso]);
  }
  close();
}
</script>