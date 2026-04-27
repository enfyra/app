<script setup lang="ts">
import type { RuntimeGuide } from '~/types/runtime-monitor';

defineProps<{ guide: RuntimeGuide }>();
</script>

<template>
  <section class="surface-card rounded-lg p-4">
    <div class="mb-3 border-b border-[var(--border-default)] pb-3">
      <div class="font-medium text-[var(--text-primary)]">{{ guide.title }}</div>
      <div class="mt-1 text-xs text-[var(--text-tertiary)]">
        {{ guide.description }}
      </div>
    </div>

    <div class="grid gap-3 xl:grid-cols-2">
      <div
        v-for="group in guide.groups"
        :key="group.title"
        class="rounded-lg border border-[var(--border-default)] p-3"
      >
        <div class="text-xs font-medium text-[var(--text-tertiary)]">{{ group.title }}</div>
        <div class="mt-3 divide-y divide-[var(--border-default)]">
          <div
            v-for="[name, description] in group.items"
            :key="name"
            class="grid gap-1 py-2 text-sm sm:grid-cols-[150px_1fr]"
          >
            <div class="font-medium text-[var(--text-primary)]">{{ name }}</div>
            <div class="text-[var(--text-tertiary)]">{{ description }}</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
