<script setup lang="ts">
const props = withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  type?: 'ring' | 'crescent' | 'dashed';
}>(), {
  size: 'md',
  color: '#7C3AED',
  type: 'crescent'
});

const spinnerSize = computed(() => {
  switch (props.size) {
    case 'sm': return 'w-4 h-4';
    case 'lg': return 'w-8 h-8';
    default: return 'w-6 h-6';
  }
});
</script>

<template>
  <div :class="spinnerSize">
    
    <svg v-if="type === 'ring'" :class="[spinnerSize, 'animate-spin']" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" :stroke="color" stroke-width="2" fill="none" 
        stroke-dasharray="60" stroke-dashoffset="40" stroke-linecap="round"/>
    </svg>

    <svg v-else-if="type === 'crescent'" :class="[spinnerSize, 'animate-spin']" viewBox="0 0 24 24">
      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12" 
        fill="none" :stroke="color" stroke-width="2" stroke-linecap="round"/>
    </svg>

    <svg v-else :class="[spinnerSize, 'animate-spin']" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" :stroke="color" stroke-width="2" fill="none" 
        stroke-dasharray="15 5" stroke-linecap="round"/>
    </svg>
  </div>
</template>