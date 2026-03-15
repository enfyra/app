<script setup lang="ts">
interface EnumOption {
  value: string;
  label?: string;
  icon?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  disabled?: boolean;
}

const props = withDefaults(
  defineProps<{
    modelValue: any;
    options: EnumOption[];
    disabled?: boolean;
    multiple?: boolean;
    nullable?: boolean;
    required?: boolean;
    placeholder?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    layout?: 'inline' | 'grid';
    columns?: number;
  }>(),
  {
    multiple: false,
    nullable: false,
    required: false,
    size: 'sm',
    layout: 'inline',
    columns: 3,
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: any];
}>();

const isInitialized = ref(false);

const selectedValue = computed(() => {
  if (!props.modelValue) return null;
  return typeof props.modelValue === 'object' ? props.modelValue.value : props.modelValue;
});

const selectedValues = computed(() => {
  if (!props.multiple || !Array.isArray(props.modelValue)) return [];
  return props.modelValue.map((v: any) => typeof v === 'object' ? v.value : v);
});

function isSelected(value: string): boolean {
  if (props.multiple) {
    return selectedValues.value.includes(value);
  }
  return selectedValue.value === value;
}

function getOptionColor(option: EnumOption): 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  return option.color || 'neutral';
}

function selectOption(option: EnumOption) {
  if (props.disabled || option.disabled) return;

  if (props.multiple) {
    const currentArray = Array.isArray(props.modelValue) ? props.modelValue : [];
    const existingIndex = currentArray.findIndex((v: any) => {
      const val = typeof v === 'object' ? v.value : v;
      return val === option.value;
    });

    if (existingIndex >= 0) {
      if (props.required) return;
      const newArray = [...currentArray];
      newArray.splice(existingIndex, 1);
      emit('update:modelValue', newArray.length > 0 ? newArray : null);
    } else {
      emit('update:modelValue', [...currentArray, option.value]);
    }
  } else {
    if (selectedValue.value === option.value) {
      if (props.required) return;
      if (props.nullable) {
        emit('update:modelValue', null);
      }
    } else {
      emit('update:modelValue', option.value);
    }
  }
}

watch(() => props.options, (options) => {
  if (isInitialized.value) return;
  if (props.required && !props.modelValue && options.length > 0) {
    isInitialized.value = true;
    emit('update:modelValue', options[0]?.value);
  }
}, { immediate: true });

watch(() => props.modelValue, (val) => {
  if (val !== undefined && val !== null) {
    isInitialized.value = true;
  }
}, { immediate: true });

const gridClass = computed(() => {
  const cols = props.columns || 3;
  const colMap: Record<number, string> = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  };
  return colMap[cols] || 'grid-cols-3';
});

const { isMobile, isTablet } = useScreen();
</script>

<template>
  <div>
    <div
      v-if="layout === 'grid'"
      :class="['grid gap-2', gridClass]"
    >
      <UButton
        v-for="option in options"
        :key="option.value"
        :color="isSelected(option.value) ? getOptionColor(option) : 'neutral'"
        :variant="isSelected(option.value) ? 'solid' : 'outline'"
        :size="size"
        :disabled="disabled || option.disabled"
        :icon="option.icon"
        class="justify-center"
        @click="selectOption(option)"
      >
        {{ option.label || option.value }}
        <UIcon
          v-if="isSelected(option.value)"
          name="lucide:check"
          class="size-3.5 shrink-0 ml-1"
        />
      </UButton>
    </div>

    <div
      v-else
      class="flex flex-wrap gap-2"
    >
      <UButton
        v-for="option in options"
        :key="option.value"
        :color="isSelected(option.value) ? getOptionColor(option) : 'neutral'"
        :variant="isSelected(option.value) ? 'solid' : 'outline'"
        :size="size"
        :disabled="disabled || option.disabled"
        :icon="option.icon"
        class="font-medium"
        @click="selectOption(option)"
      >
        {{ option.label || option.value }}
        <UIcon
          v-if="isSelected(option.value)"
          name="lucide:check"
          class="size-3.5 shrink-0 ml-1"
        />
      </UButton>
    </div>

    <p
      v-if="placeholder && !modelValue"
      class="text-xs text-muted-foreground mt-2"
    >
      {{ placeholder }}
    </p>
  </div>
</template>