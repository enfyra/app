<script setup lang="ts">
import { getPrimaryColorPreflightScript } from "~/utils/primary-colors";

const toaster = {
  duration: 3600,
  expand: true,
  max: 5,
  position: "bottom-right" as const,
  progress: true,
};

useHead({
  script: [
    {
      innerHTML: getPrimaryColorPreflightScript(),
      tagPosition: "head",
    },
  ],
});
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
