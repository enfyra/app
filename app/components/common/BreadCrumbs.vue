<script setup lang="ts">
const props = defineProps<{
  icon?: string;
  iconMap?: Record<string, string>;
  labelMap?: Record<string, string>;
  defaultSegmentIcon?: string;
}>();

const route = useRoute();

const items = computed(() => {
  const pathParts = route.path.split("/").filter(Boolean);

  const home = {
    label: "Home",
    icon: props.icon || "lucide:home",
    to: "/",
  };

  const segments = pathParts.map((seg, i) => {
    const label = props.labelMap?.[seg] || seg;
    const to = "/" + pathParts.slice(0, i + 1).join("/");
    const isLast = i === pathParts.length - 1;
    return {
      label,
      ...(isLast ? {} : { to }),
    };
  });

  return [home, ...segments];
});
</script>

<template>
  <nav class="hidden md:block">
    <UBreadcrumb :items="items" />
  </nav>
</template>
