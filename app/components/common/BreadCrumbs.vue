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
    class="hidden md:flex items-center gap-2 text-sm"
  >
    
    <NuxtLink
      to="/"
      class="transition-colors duration-200 flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
    >
      <UIcon
        :name="rootIcon"
        class="w-4 h-4"
      />
      <span>Home</span>
    </NuxtLink>

    <template v-for="(seg, i) in segments" :key="seg.to">
      
      <UIcon
        name="lucide:chevron-right"
        class="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-gray-500"
      />

      <NuxtLink
        v-if="i < segments.length - 1"
        :to="seg.to"
        class="transition-colors duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      >
        {{ seg.label }}
      </NuxtLink>
      <span
        v-else
        class="font-medium text-gray-800 dark:text-white/90"
      >
        {{ seg.label }}
      </span>
    </template>
  </nav>
</template>
