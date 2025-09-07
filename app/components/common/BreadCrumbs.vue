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
  <nav class="text-sm text-gray-400 flex items-center gap-1">
    <!-- Breadcrumb -->
    <UIcon :name="rootIcon" class="text-base text-primary" />
    <NuxtLink to="/" class="lg:hover:underline text-primary">Home</NuxtLink>

    <template v-for="(seg, i) in segments" :key="seg.to">
      <UIcon :name="seg.icon" class="text-sm text-gray-500" />
      <NuxtLink
        v-if="i < segments.length - 1"
        :to="seg.to"
        class="text-primary"
      >
        {{ seg.label }}
      </NuxtLink>
      <span v-else class="text-gray-500">{{ seg.label }}</span>
    </template>
  </nav>
</template>
