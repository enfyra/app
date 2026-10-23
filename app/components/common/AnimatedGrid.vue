<template>
  <TransitionGroup
    v-if="shouldAnimate"
    v-bind="shouldAnimate ? { name: props.name } : {}"
    tag="div"
    :class="['relative', gridClass]"
  >
    <slot />
  </TransitionGroup>
  <div
    v-else
    :class="['relative', gridClass]"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  name?: string;
  gridClass?: string;
  disabled?: boolean;
  animate?: boolean;
}>(), {
  name: 'item-grid',
  gridClass: 'grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3',
  disabled: false,
  animate: false,
});

const routeLeaving = ref(false);
const shouldAnimate = computed(() => props.animate && !props.disabled && !routeLeaving.value);

onBeforeRouteLeave(() => {
  routeLeaving.value = true;
});
</script>
