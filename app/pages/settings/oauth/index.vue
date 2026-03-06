<script setup lang="ts">
definePageMeta({
  layout: "default",
});

onMounted(() => {
  navigateTo("/settings/oauth/config", { replace: true });
});
</script>

<template>
  <div class="flex items-center justify-center min-h-[200px]">
    <CommonLoadingState
      title="Redirecting..."
      description="Loading OAuth settings"
      size="sm"
      type="card"
    />
  </div>
</template>
