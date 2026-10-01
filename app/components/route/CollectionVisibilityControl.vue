<script setup lang="ts">
const enabled = defineModel<boolean>({ required: true })
</script>

<template>
  <USwitch v-model="enabled" label="Collection Routes" aria-label="Show collection routes" />
</template>
