<script setup lang="ts">
const toaster = { duration: 2500, position: "bottom-left" as const }
</script>

<template>
  <UApp :toaster="toaster">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
