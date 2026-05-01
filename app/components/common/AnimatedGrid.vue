<template>
  <TransitionGroup
    :name="transitionName"
    tag="div"
    :class="['relative', gridClass]"
  >
    <slot />
  </TransitionGroup>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  name?: string;
  gridClass?: string;
  disabled?: boolean;
}>(), {
  name: 'item-grid',
  gridClass: 'grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3',
  disabled: false,
});

const routeLeaving = ref(false);
const transitionName = computed(() => props.disabled || routeLeaving.value ? undefined : props.name);

onBeforeRouteLeave(() => {
  routeLeaving.value = true;
});
</script>
