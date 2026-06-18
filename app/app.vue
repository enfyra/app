<script setup lang="ts">
import { getPrimaryColorPreflightScript } from "~/utils/primary-colors";

const toaster = { duration: 3000, position: "bottom-left" as const };

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
    <NuxtLoadingIndicator color="var(--ui-primary)" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
