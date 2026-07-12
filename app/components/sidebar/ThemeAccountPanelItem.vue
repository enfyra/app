<script setup lang="ts">
const { $primaryColor } = useNuxtApp();
</script>

<template>
  <div class="space-y-1 rounded-[var(--radius-subcontrol)]">
    <div class="space-y-3 px-2.5 pb-2">
      <div class="flex items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
          <UIcon name="lucide:sun-moon" class="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
          <span class="truncate">Appearance</span>
        </div>
        <UColorModeSwitch
          :ui="{
            base: '!transition-none',
            icon: '!transition-none group-data-[state=unchecked]:!text-[var(--surface-default)]',
          }"
        />
      </div>

      <div>
        <div class="mb-2.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
          <UIcon name="lucide:palette" class="h-3.5 w-3.5" />
          <span>Accent</span>
        </div>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(1.5rem,1fr))] items-center justify-items-center gap-1.5">
          <button
            v-for="color in $primaryColor.colors"
            :key="color.value"
            type="button"
            class="flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-150 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)]"
            :class="$primaryColor.current.value === color.value ? 'ring-2 ring-inset ring-[var(--md-primary)]' : 'ring-1 ring-inset ring-[var(--border-default)]'"
            :aria-label="`Use ${color.label} accent`"
            :aria-pressed="$primaryColor.current.value === color.value"
            :title="color.label"
            @click="$primaryColor.set(color.value)"
          >
            <span class="h-[18px] w-[18px] rounded-full" :style="{ backgroundColor: color.swatch }" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
