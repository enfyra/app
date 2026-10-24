<script setup lang="ts">
const route = useRoute();
const id = computed(() => Array.isArray(route.params.id) ? route.params.id[0] : String(route.params.id || ''));
</script>

<template>
  <HelperEditor mode="update" v-bind="id === undefined ? {} : { id }" />
</template>
