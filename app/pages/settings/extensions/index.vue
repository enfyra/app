<script setup lang="ts">
definePageMeta({
  layout: "default",
});

const route = useRoute();

onMounted(() => {
  navigateTo(
    {
      path: "/settings/menus",
      query: { ...route.query, tab: "extensions" },
    },
    { replace: true },
  );
});
</script>

<template>
  <div class="flex items-center justify-center min-h-[200px]">
    <CommonLoadingState
      title="Redirecting..."
      description="Loading extension settings"
      size="sm"
      type="card"
    />
  </div>
</template>
