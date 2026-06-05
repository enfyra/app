<template>
  <div class="contents">
    <component
      v-for="extension in globalExtensions"
      :key="extension.key"
      :is="extension.component"
      :components="extension.component.components"
    />
  </div>
</template>

<script setup lang="ts">
const { globalExtensions } = useGlobalExtensions();
</script>
