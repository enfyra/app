<script setup lang="ts">
const props = withDefaults(defineProps<{
  type?: 'text' | 'avatar' | 'card' | 'table' | 'form' | 'folder' | 'file-card';
  lines?: number;
  animated?: boolean;
  shimmer?: boolean;
}>(), {
  type: 'text',
  lines: 3,
  animated: true,
  shimmer: false
});

const animationClass = computed(() => props.animated ? 'animate-pulse' : '');
const shimmerClass = computed(() => props.shimmer ? 'skeleton-shimmer' : '');
</script>

<template>
  <!-- Text Skeleton -->
  <div v-if="type === 'text'" class="space-y-2">
    <div
      v-for="i in lines"
      :key="i"
      :class="['h-4 rounded skeleton-gradient', animationClass, shimmerClass]"
      :style="{
        width: i === lines ? '75%' : '100%'
      }"
    ></div>
  </div>

  <!-- Avatar Skeleton -->
  <div v-else-if="type === 'avatar'" class="flex items-center gap-3">
    <div
      :class="['w-10 h-10 rounded-full skeleton-gradient', animationClass, shimmerClass]"
    ></div>
    <div class="space-y-2 flex-1">
      <div
        :class="['h-4 rounded w-1/2', animationClass, shimmerClass]"
        :style="{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))'
        }"
      ></div>
      <div
        :class="['h-3 rounded w-1/3', animationClass, shimmerClass]"
        :style="{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))'
        }"
      ></div>
    </div>
  </div>

  <!-- Card Skeleton (Original) -->
  <div v-else-if="type === 'card'" class="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    <div
      v-for="i in 8"
      :key="i"
      class="rounded-xl border p-4 space-y-4 skeleton-card"
      :class="[animationClass, shimmerClass]"
      :style="{
        backgroundColor: 'var(--bg-elevated)',
        borderColor: 'var(--border-default)',
      }"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-full flex-shrink-0 skeleton-gradient"
        ></div>
        <div class="space-y-2 flex-1">
          <div
            class="h-4 rounded w-3/4"
            :style="{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))'
            }"
          ></div>
          <div
            class="h-3 rounded w-1/2"
            :style="{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))'
            }"
          ></div>
        </div>
      </div>

      <div class="space-y-2">
        <div
          class="h-3 rounded w-full skeleton-gradient"
        ></div>
        <div
          class="h-3 rounded w-3/4 skeleton-gradient"
        ></div>
      </div>

      <div class="flex gap-2 justify-end">
        <div
          class="h-8 w-20 rounded-lg skeleton-gradient"
        ></div>
        <div
          class="h-8 w-16 rounded-lg skeleton-gradient"
        ></div>
      </div>
    </div>
  </div>

  <!-- File Card Skeleton -->
  <div v-else-if="type === 'file-card'" class="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
    <div
      v-for="i in 8"
      :key="i"
      class="group relative"
    >
      <div
        class="relative rounded-xl border transition-all duration-200 overflow-hidden"
        :class="[animationClass, shimmerClass]"
        :style="{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-subtle)',
          borderWidth: '1px',
          boxShadow: 'var(--shadow-xs)',
        }"
      >
        <div class="h-28 relative overflow-hidden rounded-t-xl">
          <div
            class="w-full h-full skeleton-preview-bg"
          >
            <div class="w-full h-full flex items-center justify-center">
              <div
                class="w-12 h-12 rounded skeleton-icon"
              />
            </div>
          </div>
        </div>
        
        <div class="p-3 space-y-2">
          <div
            class="h-3.5 rounded skeleton-gradient"
            :style="{
              width: `${70 + (i % 3) * 10}%`
            }"
          />
          <div class="flex items-center justify-between">
            <div
              class="h-3 w-12 rounded"
              :style="{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))',
              }"
            />
            <div
              class="h-3 w-16 rounded"
              :style="{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))',
              }"
            />
          </div>
          <div
            class="h-5 w-16 rounded-full skeleton-badge"
          />
        </div>
      </div>
    </div>
  </div>

  <!-- Table Skeleton -->
  <div
    v-else-if="type === 'table'"
    class="w-full space-y-0 overflow-hidden rounded-xl border"
    :style="{
      borderColor: 'var(--border-default)',
    }"
  >
    <!-- Header -->
    <div
      class="grid grid-cols-5 gap-4 p-4"
      :style="{
        backgroundColor: 'var(--bg-elevated)',
        borderBottomColor: 'var(--border-default)',
        borderBottomWidth: '1px',
        borderBottomStyle: 'solid',
      }"
    >
      <div
        v-for="i in 5"
        :key="i"
        class="h-4 rounded skeleton-gradient"
        :class="[animationClass, shimmerClass]"
        :style="{
          width: i === 1 ? '100%' : i === 2 ? '75%' : i === 3 ? '50%' : i === 4 ? '66%' : 'auto'
        }"
      ></div>
    </div>
    <!-- Rows -->
    <div>
      <div
        v-for="i in 8"
        :key="i"
        class="grid grid-cols-5 gap-4 p-4"
        :style="{
          borderBottom: i < 8 ? '1px solid var(--border-subtle)' : 'none',
          backgroundColor: i % 2 === 1 ? 'var(--bg-surface)' : 'transparent'
        }"
      >
        <div
          class="h-4 rounded skeleton-gradient"
          :class="shimmerClass"
        ></div>
        <div
          class="h-4 rounded w-3/4 skeleton-gradient"
          :class="shimmerClass"
        ></div>
        <div
          class="h-4 rounded w-1/2 skeleton-gradient"
          :class="shimmerClass"
        ></div>
        <div
          class="h-4 rounded w-2/3 skeleton-gradient"
          :class="shimmerClass"
        ></div>
        <div class="flex gap-2 justify-end">
          <div
            class="w-8 h-6 rounded"
            :class="shimmerClass"
            :style="{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))'
            }"
          ></div>
          <div
            class="w-8 h-6 rounded"
            :class="shimmerClass"
            :style="{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))'
            }"
          ></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Form Skeleton -->
  <div v-else-if="type === 'form'" class="space-y-4">
    <div v-for="i in 5" :key="i" class="space-y-2">
      <!-- Label -->
      <div
        class="h-4 w-24 rounded"
        :class="[animationClass, shimmerClass]"
        :style="{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))'
        }"
      ></div>
      <!-- Input -->
      <div
        class="h-10 w-full rounded-lg"
        :class="[animationClass, shimmerClass]"
        :style="{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))'
        }"
      ></div>
    </div>

    <!-- Action buttons -->
    <div class="flex gap-3 pt-6">
      <div
        class="h-10 w-24 rounded-lg skeleton-primary"
        :class="[animationClass, shimmerClass]"
      ></div>
      <div
        class="h-10 w-20 rounded-lg skeleton-gradient"
        :class="[animationClass, shimmerClass]"
      ></div>
    </div>
  </div>

  <!-- Folder Skeleton -->
  <div v-else-if="type === 'folder'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    <div
      v-for="i in 8"
      :key="i"
      class="group relative"
    >
      <div
        class="relative rounded-xl border transition-all duration-200 overflow-hidden"
        :class="[animationClass, shimmerClass]"
        :style="{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-subtle)',
          borderWidth: '1px',
          boxShadow: 'var(--shadow-xs)',
        }"
      >
        <div class="p-4 flex items-start gap-4">
          <div class="flex-shrink-0">
            <div
              class="w-12 h-12 rounded-lg"
                :style="{
                background: ['#3B82F6', '#7C3AED', '#F59E0B', '#14B8A6'][i % 4],
                }"
              />
        </div>

          <div class="flex-1 min-w-0 space-y-1">
          <div
              class="h-4 rounded skeleton-gradient"
            :style="{
                width: `${60 + (i % 3) * 15}%`
            }"
          />
            <div
              class="h-3 w-16 rounded skeleton-gradient"
            />
            <div
              class="h-3 w-24 rounded skeleton-gradient"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>