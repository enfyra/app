<template>
  <DynamicPageComponent :path="path" />
</template>

<script setup lang="ts">
const route = useRoute();
const sidebarParam = route.params.sidebar;
const pathParams = route.params.path;

const path = computed(() => {
  const basePath = String(sidebarParam || '');
  
  if (!pathParams || (Array.isArray(pathParams) && pathParams.length === 0)) {
    return basePath;
  }
  
  if (Array.isArray(pathParams)) {
    return `${basePath}/${pathParams.join('/')}`;
  }
  
  return `${basePath}/${pathParams}`;
});
</script>

