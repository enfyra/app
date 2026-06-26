<script setup lang="ts">
const colorMode = useColorMode();
const { $primaryColor } = useNuxtApp();

const isDark = computed(() => colorMode.value === "dark");
const themeLabel = computed(() => (isDark.value ? "Dark" : "Light"));
const themeIcon = computed(() => (isDark.value ? "lucide:moon" : "lucide:sun"));

function toggleTheme() {
  colorMode.preference = isDark.value ? "light" : "dark";
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  toggleTheme();
}
</script>

<template>
  <div class="space-y-1 rounded-[var(--radius-subcontrol)]">
    <div
      role="button"
      tabindex="0"
      class="flex w-full cursor-pointer items-center gap-2 rounded-[var(--radius-subcontrol)] px-2.5 py-2 text-left text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--nav-item-hover-bg)] hover:text-[var(--nav-item-hover-text)]"
      @click="toggleTheme"
      @keydown="handleKeydown"
    >
      <UIcon :name="themeIcon" class="h-5 w-5 shrink-0 text-[var(--text-tertiary)]" />
      <span class="min-w-0 flex-1 truncate">{{ themeLabel }}</span>
      <USwitch
        size="sm"
        :model-value="isDark"
        :ui="{ base: 'ring-1 ring-inset ring-[var(--border-default)]' }"
        @update:model-value="toggleTheme"
        @click.stop
      />
    </div>

    <div class="px-2.5 pb-2">
      <div class="mb-2.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
        <UIcon name="lucide:palette" class="h-3.5 w-3.5" />
        <span>Accent</span>
      </div>
      <div class="grid grid-cols-6 gap-2">
        <button
          v-for="color in $primaryColor.colors"
          :key="color.value"
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-full transition-transform duration-150 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)]"
          :class="$primaryColor.current.value === color.value ? 'ring-2 ring-inset ring-[var(--md-primary)]' : 'ring-1 ring-inset ring-[var(--border-default)]'"
          :aria-label="`Use ${color.label} accent`"
          :aria-pressed="$primaryColor.current.value === color.value"
          :title="color.label"
          @click="$primaryColor.set(color.value)"
        >
          <span class="h-5 w-5 rounded-full" :style="{ backgroundColor: color.swatch }" />
        </button>
      </div>
    </div>
  </div>
</template>
