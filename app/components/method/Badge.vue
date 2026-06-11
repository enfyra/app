<script setup lang="ts">
import { getMethodColors, getMethodLabel, type MethodColorRecord } from '~/utils/http.constants';

const props = withDefaults(
  defineProps<{
    method: MethodColorRecord | string;
    size?: 'xs' | 'sm';
  }>(),
  {
    size: 'xs',
  },
);

const label = computed(() => getMethodLabel(props.method));
const colors = computed(() => getMethodColors(props.method));
</script>

<template>
  <span
    class="inline-flex items-center rounded-md font-mono font-semibold uppercase ring-1 ring-inset"
    :class="size === 'sm' ? 'px-2 py-1 text-xs' : 'px-1.5 py-0.5 text-[11px]'"
    :style="{
      backgroundColor: colors.buttonColor,
      color: colors.textColor,
      '--tw-ring-color': colors.textColor + '33',
    }"
  >
    {{ label }}
  </span>
</template>
