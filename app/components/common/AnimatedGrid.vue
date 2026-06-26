<template>
  <TransitionGroup
    v-if="shouldAnimate"
    :name="transitionName"
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
  animate: true,
});

const routeLeaving = ref(false);
const shouldAnimate = computed(() => props.animate && !props.disabled && !routeLeaving.value);
const transitionName = computed(() => shouldAnimate.value ? props.name : undefined);

onBeforeRouteLeave(() => {
  routeLeaving.value = true;
});
</script>
