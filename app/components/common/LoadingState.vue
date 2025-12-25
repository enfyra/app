<script setup lang="ts">
const props = withDefaults(defineProps<{
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  type?: 'dots' | 'spinner' | 'skeleton' | 'table' | 'form' | 'card' | 'folder' | 'file-card' | 'menu';
  context?: 'page' | 'modal' | 'inline' | 'button';
}>(), {
  size: 'md',
  type: 'dots',
  context: 'page'
});

const defaultTitle = "Loading";

const loadingType = computed(() => {
  if (props.type !== 'dots') return props.type;
  
  switch (props.context) {
    case 'button': return 'spinner';
    case 'modal': return 'skeleton';
    case 'inline': return 'dots';
    default: return 'dots';
  }
});

const showTitle = computed(() => 
  props.context !== 'button' && props.context !== 'inline' && loadingType.value !== 'table' && loadingType.value !== 'form' && loadingType.value !== 'card' && loadingType.value !== 'folder' && loadingType.value !== 'file-card' && loadingType.value !== 'menu'
);
</script>

<template>
  <div 
    :class="[
      'transition-all duration-300 ease-in-out',
      loadingType === 'table' || loadingType === 'form' || loadingType === 'card' || loadingType === 'folder' || loadingType === 'file-card' || loadingType === 'menu' ? 'w-full' : 'flex flex-col items-center justify-center',
      context === 'inline' ? 'py-2 gap-2' : (loadingType === 'table' || loadingType === 'form' || loadingType === 'card' || loadingType === 'folder' || loadingType === 'file-card' || loadingType === 'menu') ? 'py-4' : 'py-8 gap-4',
      context === 'button' ? 'py-1 gap-1' : ''
    ]"
    role="status"
    aria-live="polite"
    :aria-label="title || defaultTitle"
  >
    <CommonLoadingDots
      v-if="loadingType === 'dots'"
      type="bounce"
      :size="size"
      color="purple-500"
    />

    <CommonLoadingSpinner
      v-else-if="loadingType === 'spinner'"
      type="crescent"
      :size="size"
      color="#7C3AED"
    />
    
    <CommonLoadingSkeleton 
      v-else-if="loadingType === 'table'" 
      type="table" 
      :animated="true" 
    />
    
    <CommonLoadingSkeleton 
      v-else-if="loadingType === 'form'" 
      type="form" 
      :animated="true" 
    />
    
    <CommonLoadingSkeleton 
      v-else-if="loadingType === 'card'" 
      type="card" 
      :animated="true" 
    />
    
    <CommonLoadingSkeleton 
      v-else-if="loadingType === 'folder'" 
      type="folder" 
      :animated="true" 
    />
    
    <CommonLoadingSkeleton 
      v-else-if="loadingType === 'file-card'" 
      type="file-card" 
      :animated="true" 
    />
    
    <CommonLoadingSkeleton 
      v-else-if="loadingType === 'menu'" 
      type="menu" 
      :animated="true" 
    />
    
    <CommonLoadingSkeleton 
      v-else 
      type="text" 
      :lines="3" 
      :animated="true" 
    />

    <div v-if="showTitle" class="text-center">
      <p :class="[
        'font-medium text-gray-700 dark:text-gray-300',
        size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'
      ]">
        {{ props.title || defaultTitle }}
      </p>
      <p
        v-if="props.description"
        :class="[
          'text-gray-500 dark:text-gray-400 mt-1',
          size === 'sm' ? 'text-xs' : 'text-sm'
        ]"
      >
        {{ props.description }}
      </p>
    </div>
  </div>
</template>

