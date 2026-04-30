<script setup lang="ts">
import type { RuntimeSeverity } from '~/types/runtime-monitor';
import { badgeColor } from '~/utils/runtime-monitor/core';

const props = withDefaults(
  defineProps<{
    severity: RuntimeSeverity;
    messages?: string[];
    okLabel?: string;
    warningLabel?: string;
    errorLabel?: string;
  }>(),
  {
    messages: () => [],
    okLabel: 'Healthy',
    warningLabel: 'Attention',
    errorLabel: 'Critical',
  },
);

const label = computed(() => {
  if (props.severity === 'error') return props.errorLabel;
  if (props.severity === 'warning') return props.warningLabel;
  return props.okLabel;
});

const activeMessages = computed(() =>
  props.messages.map((message) => message.trim()).filter(Boolean),
);

const iconName = computed(() =>
  props.severity === 'error' ? 'lucide:circle-alert' : 'lucide:triangle-alert',
);

const showTooltipIcon = computed(
  () => props.severity !== 'ok' && activeMessages.value.length > 0,
);
</script>

<template>
  <div class="inline-flex items-center gap-1.5">
    <UBadge :color="badgeColor(severity)" variant="soft">
      {{ label }}
    </UBadge>
    <UTooltip
      v-if="showTooltipIcon"
      :delay-duration="0"
    >
      <UButton
        :icon="iconName"
        :color="badgeColor(severity)"
        variant="ghost"
        size="xs"
        class="h-6 w-6 p-0"
        aria-label="Warning details"
      />
      <template #content>
        <div class="max-w-xs space-y-1 p-1 text-xs">
          <div
            v-for="message in activeMessages"
            :key="message"
            class="leading-snug"
          >
            {{ message }}
          </div>
        </div>
      </template>
    </UTooltip>
  </div>
</template>
