<template>
  <DynamicPageComponent :path="path" />
</template>

<script setup lang="ts">
const route = useRoute();
const sidebarParam = route.params.sidebar;

const path = computed(() => `${sidebarParam}`);
</script>