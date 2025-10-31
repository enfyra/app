<script setup lang="ts">
const props = defineProps<{
  icon?: string;
  iconMap?: Record<string, string>;
  labelMap?: Record<string, string>;
  defaultSegmentIcon?: string;
}>();

const route = useRoute();

const segments = computed(() => {
  const pathParts = route.path.split("/").filter(Boolean);
  return pathParts.map((seg, i) => {
    const label = props.labelMap?.[seg] || seg;
    const icon =
      props.iconMap?.[seg] ||
      props.defaultSegmentIcon ||
      "lucide:chevron-right";
    const to = "/" + pathParts.slice(0, i + 1).join("/");
    return { label, icon, to };
  });
});

const rootIcon = computed(() => props.icon || "lucide:home");
</script>

<template>
  <nav
    aria-label="breadcrumb"
    class="flex items-center gap-2.5 text-sm"
    :style="{ color: 'var(--text-quaternary)' }"
  >
    <!-- Home Link with Icon -->
    <NuxtLink
      to="/"
      class="transition-colors duration-200 flex items-center gap-1.5 hover:text-[var(--text-secondary)]"
      :style="{ color: 'var(--text-quaternary)' }"
    >
      <UIcon
        :name="rootIcon"
        class="w-4 h-4"
      />
      <span>Home</span>
    </NuxtLink>

    <template v-for="(seg, i) in segments" :key="seg.to">
      <!-- Separator -->
      <UIcon
        name="lucide:chevron-right"
        class="w-3.5 h-3.5 shrink-0"
        :style="{ color: 'var(--text-quaternary)' }"
      />

      <!-- Link or Current Page -->
      <NuxtLink
        v-if="i < segments.length - 1"
        :to="seg.to"
        class="transition-colors duration-200 hover:text-[var(--text-secondary)]"
        :style="{ color: 'var(--text-quaternary)' }"
      >
        {{ seg.label }}
      </NuxtLink>
      <span
        v-else
        class="font-medium"
        :style="{ color: 'var(--text-secondary)' }"
      >
        {{ seg.label }}
      </span>
    </template>
  </nav>
</template>
