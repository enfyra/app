<template>
  <div>
    
    <UButton
      @click="openModal"
      variant="outline"
      :label="displayValue"
      icon="i-heroicons-calendar"
      size="sm"
      :class="buttonClass"
      :disabled="disabled"
    />

    <CommonModal v-model="showModal">
      <template #title>
        Select Date
      </template>

      <template #body>
        <div class="p-4">
          <UCalendar v-model="tempValue" />
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end w-full">
          <UButton @click="applyValue" color="primary"> Apply </UButton>
        </div>
      </template>
    </CommonModal>
  </div>
</template>

<script setup lang="ts">
import { CalendarDate } from "@internationalized/date";
import { formatDate } from "~/utils/common/filter/filter-helpers";

const props = defineProps<{
  modelValue: Date | string | null;
  disabled?: boolean;
  class?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | null];
}>();

const showModal = ref(false);

const today = new Date();
const tempValue = ref<CalendarDate | any>(
  new CalendarDate(today.getFullYear(), today.getMonth() + 1, today.getDate())
);

function parseDateString(dateInput: Date | string): { year: number; month: number; day: number } | null {
  if (!dateInput) return null;

  try {
    
    if (dateInput instanceof Date) {
      return {
        year: dateInput.getUTCFullYear(),
        month: dateInput.getUTCMonth(),
        day: dateInput.getUTCDate()
      };
    }

    const dateStr = String(dateInput);

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const parts = dateStr.split('-').map(Number);
      if (parts.length === 3 && parts.every(n => !isNaN(n))) {
        return {
          year: parts[0]!,
          month: parts[1]! - 1,
          day: parts[2]!
        };
      }
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;

    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth(),
      day: date.getUTCDate()
    };
  } catch {
    return null;
  }
}

function formatDateDisplay(dateInput: Date | string): string {
  const parsed = parseDateString(dateInput);
  if (!parsed) return '';

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[parsed.month]} ${parsed.day}, ${parsed.year}`;
}

const normalizedValue = computed(() => {
  if (!props.modelValue) return null;

  const parsed = parseDateString(props.modelValue);
  if (!parsed) return null;

  const year = parsed.year;
  const month = String(parsed.month + 1).padStart(2, '0');
  const day = String(parsed.day).padStart(2, '0');

  return `${year}-${month}-${day}`;
});

const displayValue = computed(() => {
  if (!normalizedValue.value) return "Select date";
  return formatDateDisplay(normalizedValue.value);
});

const buttonClass = computed(() => {
  return ["justify-start", props.class || ""];
});

function openModal() {
  if (normalizedValue.value) {
    try {
      
      const parsed = parseDateString(normalizedValue.value);
      if (parsed) {
        tempValue.value = new CalendarDate(parsed.year, parsed.month + 1, parsed.day);
      } else {
        
        const today = new Date();
        tempValue.value = new CalendarDate(
          today.getFullYear(),
          today.getMonth() + 1,
          today.getDate()
        );
      }
    } catch (error) {
      console.error("Error converting to CalendarDate:", error);
      
      const today = new Date();
      tempValue.value = new CalendarDate(
        today.getFullYear(),
        today.getMonth() + 1,
        today.getDate()
      );
    }
  } else {
    
    const today = new Date();
    tempValue.value = new CalendarDate(
      today.getFullYear(),
      today.getMonth() + 1,
      today.getDate()
    );
  }

  showModal.value = true;
}

function applyValue() {
  if (tempValue.value) {
    try {
      const year = tempValue.value.year;
      const month = String(tempValue.value.month).padStart(2, '0');
      const day = String(tempValue.value.day).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      emit("update:modelValue", dateString);
    } catch (error) {
      console.error("Error creating Date object:", error);
      emit("update:modelValue", null);
    }
  } else {
    emit("update:modelValue", null);
  }

  showModal.value = false;
}
</script>
