<script setup lang="ts">
const toaster = {
  duration: 3600,
  expand: true,
  max: 5,
  position: "bottom-right" as const,
  progress: true,
};
</script>

<template>
  <UApp :toaster="toaster">
    <NuxtLayout>
      <NuxtPage
        :page-key="(route) => route.path"
        :transition="{ name: 'eapp-page', mode: 'out-in' }"
      />
    </NuxtLayout>
  </UApp>
</template>
