<template>
  <div>
    <UButton
      type="button"
      @click="openModal"
      variant="outline"
      :label="displayValue"
      icon="i-heroicons-calendar-days"
      size="sm"
      :class="buttonClass"
      :disabled="disabled"
    />

    <CommonDrawer v-model="showDrawer" nested direction="right">
      <template #header>
        <div>
          <h3 class="text-base font-semibold text-zinc-950 dark:text-white">
            Select date and time
          </h3>
          <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Choose a date, then adjust the exact time.
          </p>
        </div>
      </template>

      <template #body>
        <div class="space-y-5">
          <div class="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
            <p class="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Selected
            </p>
            <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <p class="text-base font-semibold text-zinc-950 dark:text-white">
                {{ draftDateLabel }}
              </p>
              <span class="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <p class="font-mono text-base font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">
                {{ draftTimeLabel }}
              </p>
            </div>
          </div>

          <div class="flex justify-center">
            <UCalendar v-model="tempValue" />
          </div>

          <div class="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <UIcon name="lucide:clock-3" class="size-4 text-zinc-500 dark:text-zinc-400" />
                <p class="text-sm font-semibold text-zinc-900 dark:text-white">
                  Time
                </p>
              </div>
              <UButton type="button" color="neutral" variant="ghost" size="sm" @click="setNow">
                Now
              </UButton>
            </div>

            <div class="space-y-2">
              <p class="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Hour
              </p>
              <div class="grid grid-cols-6 gap-1.5">
                <button
                  v-for="hour in hourOptions"
                  :key="hour"
                  type="button"
                  :class="timeOptionClass(tempHour === hour)"
                  @click="setHour(hour)"
                >
                  {{ hour }}
                </button>
              </div>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between gap-3">
                <p class="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Minute
                </p>
                <div class="flex items-center gap-1.5">
                  <span class="text-xs text-zinc-500 dark:text-zinc-400">Exact</span>
                  <input
                    v-model="tempMinute"
                    inputmode="numeric"
                    maxlength="2"
                    aria-label="Exact minute"
                    class="h-7 w-10 rounded-md border border-zinc-300 bg-white text-center font-mono text-sm tabular-nums text-zinc-950 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    @input="normalizeMinuteTyping"
                    @blur="normalizeMinuteInput"
                  >
                </div>
              </div>
              <div class="grid grid-cols-6 gap-1.5">
                <button
                  v-for="minute in minuteOptions"
                  :key="minute"
                  type="button"
                  :class="timeOptionClass(tempMinute === minute)"
                  @click="setMinute(minute)"
                >
                  {{ minute }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full justify-between gap-3">
          <UButton type="button" color="neutral" variant="ghost" @click="clearValue">
            Clear
          </UButton>
          <UButton type="button" color="primary" @click="applyValue">
            Apply
          </UButton>
        </div>
      </template>
    </CommonDrawer>
  </div>
</template>

<script setup lang="ts">
import { CalendarDate } from "@internationalized/date";

const props = defineProps<{
  modelValue: Date | string | null;
  disabled?: boolean;
  class?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | null];
}>();

const showDrawer = ref(false);
const now = new Date();
const tempValue = ref<CalendarDate | any>(
  new CalendarDate(now.getFullYear(), now.getMonth() + 1, now.getDate()),
);
const tempHour = ref(String(now.getHours()).padStart(2, "0"));
const tempMinute = ref(String(now.getMinutes()).padStart(2, "0"));
const hourOptions = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const minuteOptions = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function clampInt(value: string | number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function parseDateTime(value: Date | string | null): DateTimeParts | null {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
      hour: value.getHours(),
      minute: value.getMinutes(),
    };
  }

  const raw = String(value).trim();
  const localMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
  if (localMatch && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
    return {
      year: Number(localMatch[1]),
      month: Number(localMatch[2]),
      day: Number(localMatch[3]),
      hour: Number(localMatch[4] || 0),
      minute: Number(localMatch[5] || 0),
    };
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  return {
    year: parsed.getFullYear(),
    month: parsed.getMonth() + 1,
    day: parsed.getDate(),
    hour: parsed.getHours(),
    minute: parsed.getMinutes(),
  };
}

function setTempFromParts(parts: DateTimeParts | null) {
  const fallback = new Date();
  const next = parts || {
    year: fallback.getFullYear(),
    month: fallback.getMonth() + 1,
    day: fallback.getDate(),
    hour: fallback.getHours(),
    minute: fallback.getMinutes(),
  };
  tempValue.value = new CalendarDate(next.year, next.month, next.day);
  setTime(next.hour, next.minute);
}

const displayValue = computed(() => {
  const parts = parseDateTime(props.modelValue);
  if (!parts) return "Select date and time";

  const date = new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
});

const buttonClass = computed(() => ["justify-start", props.class || ""]);
const draftDateLabel = computed(() => {
  const date = new Date(tempValue.value.year, tempValue.value.month - 1, tempValue.value.day);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
});
const draftTimeLabel = computed(() => {
  const date = new Date(2000, 0, 1, clampInt(tempHour.value, 0, 23), clampInt(tempMinute.value, 0, 59));
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
});

function setTime(hour: number, minute: number) {
  tempHour.value = String(clampInt(hour, 0, 23)).padStart(2, "0");
  tempMinute.value = String(clampInt(minute, 0, 59)).padStart(2, "0");
}

function setHour(hour: string) {
  tempHour.value = hour;
}

function setMinute(minute: string) {
  tempMinute.value = minute;
}

function timeOptionClass(selected: boolean): string {
  return [
    "h-9 rounded-md border text-sm font-medium tabular-nums transition-colors",
    selected
      ? "border-primary-500 bg-primary-500 text-white shadow-sm"
      : "border-zinc-200 bg-white text-zinc-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-primary-700 dark:hover:bg-primary-950/30 dark:hover:text-primary-200",
  ].join(" ");
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "").slice(0, 2);
}

function normalizeMinuteTyping() {
  tempMinute.value = digitsOnly(tempMinute.value);
}

function normalizeMinuteInput() {
  tempMinute.value = String(clampInt(tempMinute.value, 0, 59)).padStart(2, "0");
}

function setNow() {
  const current = new Date();
  tempValue.value = new CalendarDate(
    current.getFullYear(),
    current.getMonth() + 1,
    current.getDate(),
  );
  setTime(current.getHours(), current.getMinutes());
}

function openModal() {
  setTempFromParts(parseDateTime(props.modelValue));
  showDrawer.value = true;
}

function applyValue() {
  const hour = clampInt(tempHour.value, 0, 23);
  const minute = clampInt(tempMinute.value, 0, 59);
  setTime(hour, minute);

  const date = new Date(
    tempValue.value.year,
    tempValue.value.month - 1,
    tempValue.value.day,
    hour,
    minute,
    0,
    0,
  );

  emit("update:modelValue", date.toISOString());
  showDrawer.value = false;
}

function clearValue() {
  emit("update:modelValue", null);
  showDrawer.value = false;
}
</script>
