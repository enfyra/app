<template>
  <div>
    <!-- Single Date Picker Button -->
    <UButton
      v-if="mode === 'single'"
      @click="() => openModal()"
      variant="outline"
      :label="modelValue ? formatDate(modelValue) : 'Date'"
      icon="i-heroicons-calendar"
      size="sm"
      class="min-w-32 min-h-8"
    />

    <!-- Date Range Buttons -->
    <div v-else-if="mode === 'range'" class="flex items-center gap-1">
      <UButton
        @click="() => openModal('from')"
        variant="outline"
        :label="modelValue?.[0] ? formatDate(modelValue[0]) : 'From'"
        icon="i-heroicons-calendar"
        size="sm"
        class="w-24"
      />
      <span class="text-xs text-gray-500">and</span>
      <UButton
        @click="() => openModal('to')"
        variant="outline"
        :label="modelValue?.[1] ? formatDate(modelValue[1]) : 'To'"
        icon="i-heroicons-calendar"
        size="sm"
        class="w-24"
      />
    </div>

    <!-- Date Picker Modal -->
    <UModal v-model:open="showModal">
      <template #header>
        <div class="flex justify-between items-center w-full">
          <div class="text-base font-semibold">Select Date</div>
          <UButton
            icon="lucide:x"
            color="error"
            variant="soft"
            @click="showModal = false"
          >
            Close
          </UButton>
        </div>
      </template>
      
      <template #body>
        <div class="p-4">
          <UCalendar v-model="tempValue" />
        </div>
      </template>
      
      <template #footer>
        <div class="flex justify-end w-full">
          <UButton 
            @click="applyValue" 
            color="primary"
          >
            Apply
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { formatDate } from '~/utils/common/filter/filter-helpers';

const props = defineProps<{
  modelValue: any;
  mode: 'single' | 'range';
}>();

const emit = defineEmits<{
  'update:modelValue': [value: any];
}>();

const showModal = ref(false);
const tempValue = ref(null);
const rangeMode = ref<'from' | 'to'>('from');

function openModal(mode?: 'from' | 'to') {
  if (props.mode === 'single') {
    tempValue.value = props.modelValue;
  } else if (props.mode === 'range') {
    rangeMode.value = mode || 'from';
    if (mode === 'from') {
      tempValue.value = props.modelValue?.[0];
    } else {
      tempValue.value = props.modelValue?.[1];
    }
  }

  showModal.value = true;
}

function applyValue() {
  const formatToISO = (date: any) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0]; // Get only date part (YYYY-MM-DD)
  };

  if (props.mode === 'single') {
    emit('update:modelValue', formatToISO(tempValue.value));
  } else if (props.mode === 'range') {
    const currentValue = props.modelValue || ['', ''];
    if (rangeMode.value === 'from') {
      emit('update:modelValue', [formatToISO(tempValue.value), currentValue[1]]);
    } else {
      emit('update:modelValue', [currentValue[0], formatToISO(tempValue.value)]);
    }
  }

  showModal.value = false;
}
</script>