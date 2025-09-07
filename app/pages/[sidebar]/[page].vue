<template>
  <DynamicPageComponent :path="path" />
</template>

<script setup lang="ts">
const route = useRoute();
const sidebarParam = route.params.sidebar;
const pageParam = route.params.page;

const path = computed(() => `${sidebarParam}/${pageParam}`);
</script>
