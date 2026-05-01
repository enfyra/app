<template>
  <TransitionGroup
    :name="name"
    tag="div"
    :class="['relative', gridClass]"
  >
    <slot />
  </TransitionGroup>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  name?: string;
  gridClass?: string;
}>(), {
  name: 'item-grid',
  gridClass: 'grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3',
});
</script>
