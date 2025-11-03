<script setup lang="ts">
const props = withDefaults(defineProps<{
  type?: 'text' | 'avatar' | 'card' | 'table' | 'form' | 'folder';
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
      :class="['h-4 rounded', animationClass, shimmerClass]"
      :style="{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))',
        width: i === lines ? '75%' : '100%'
      }"
    ></div>
  </div>

  <!-- Avatar Skeleton -->
  <div v-else-if="type === 'avatar'" class="flex items-center gap-3">
    <div
      :class="['w-10 h-10 rounded-full', animationClass, shimmerClass]"
      :style="{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))'
      }"
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

  <!-- Card Skeleton -->
  <div v-else-if="type === 'card'" class="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    <div
      v-for="i in 8"
      :key="i"
      class="rounded-xl border p-4 space-y-4"
      :class="[animationClass, shimmerClass]"
      :style="{
        background: 'rgba(21, 27, 46, 0.4)',
        backdropFilter: 'blur(20px)',
        borderColor: 'rgba(255, 255, 255, 0.08)',
      }"
    >
      <!-- Avatar + Name -->
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-full flex-shrink-0"
          :style="{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))'
          }"
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

      <!-- Content lines -->
      <div class="space-y-2">
        <div
          class="h-3 rounded w-full"
          :style="{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))'
          }"
        ></div>
        <div
          class="h-3 rounded w-3/4"
          :style="{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))'
          }"
        ></div>
      </div>

      <!-- Actions -->
      <div class="flex gap-2 justify-end">
        <div
          class="h-8 w-20 rounded-lg"
          :style="{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))'
          }"
        ></div>
        <div
          class="h-8 w-16 rounded-lg"
          :style="{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))'
          }"
        ></div>
      </div>
    </div>
  </div>

  <!-- Table Skeleton -->
  <div
    v-else-if="type === 'table'"
    class="w-full space-y-0 overflow-hidden rounded-xl border"
    :style="{
      borderColor: 'rgba(255, 255, 255, 0.08)',
    }"
  >
    <!-- Header -->
    <div
      class="grid grid-cols-5 gap-4 p-4"
      :style="{
        background: 'rgba(21, 27, 46, 0.6)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }"
    >
      <div
        v-for="i in 5"
        :key="i"
        class="h-4 rounded"
        :class="[animationClass, shimmerClass]"
        :style="{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))',
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
          borderBottom: i < 8 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
          background: i % 2 === 1 ? 'rgba(21, 27, 46, 0.3)' : 'transparent'
        }"
      >
        <div
          class="h-4 rounded"
          :class="shimmerClass"
          :style="{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))'
          }"
        ></div>
        <div
          class="h-4 rounded w-3/4"
          :class="shimmerClass"
          :style="{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))'
          }"
        ></div>
        <div
          class="h-4 rounded w-1/2"
          :class="shimmerClass"
          :style="{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))'
          }"
        ></div>
        <div
          class="h-4 rounded w-2/3"
          :class="shimmerClass"
          :style="{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))'
          }"
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
        class="h-10 w-24 rounded-lg"
        :class="[animationClass, shimmerClass]"
        :style="{
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.3), rgba(139, 92, 246, 0.3))'
        }"
      ></div>
      <div
        class="h-10 w-20 rounded-lg"
        :class="[animationClass, shimmerClass]"
        :style="{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))'
        }"
      ></div>
    </div>
  </div>

  <!-- Folder Skeleton -->
  <div v-else-if="type === 'folder'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    <div
      v-for="i in 8"
      :key="i"
      class="group flex flex-col h-full"
    >
      <!-- Card Container -->
      <div
        class="relative rounded-xl border transition-all duration-300 overflow-hidden h-full flex flex-col"
        :class="[animationClass, shimmerClass]"
        :style="{
          background: 'rgba(21, 27, 46, 0.8)',
          backdropFilter: 'blur(20px)',
          borderColor: 'rgba(255, 255, 255, 0.08)',
          borderWidth: '1px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
        }"
      >
        <!-- Accent gradient line at top -->
        <div
          class="absolute top-0 left-0 right-0 h-px opacity-60"
          style="background: linear-gradient(90deg, transparent, #7C3AED, transparent)"
        />

        <!-- Preview Area -->
        <div class="relative h-32 overflow-hidden">
          <div class="relative w-full h-full flex items-center justify-center overflow-hidden">
            <!-- Dotted grid pattern background -->
            <div
              class="absolute inset-0 opacity-20"
              style="
                background-image: radial-gradient(circle, rgba(124, 58, 237, 0.3) 1px, transparent 1px);
                background-size: 16px 16px;
              "
            />

            <!-- Gradient backdrop for depth -->
            <div
              class="absolute inset-0 opacity-30"
              style="background: radial-gradient(circle at center, #7C3AED20 0%, transparent 70%)"
            />

            <!-- Large centered icon placeholder -->
            <div class="relative z-10">
              <div
                class="w-24 h-24 rounded-lg"
                :style="{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))',
                }"
              />
            </div>
          </div>
        </div>

        <!-- Content Area -->
        <div class="p-4 space-y-3 flex-1 flex flex-col">
          <!-- Name -->
          <div
            class="h-5 rounded"
            :style="{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))',
              width: `${Math.random() * 40 + 60}%`
            }"
          />

          <!-- Metadata Row -->
          <div class="flex items-center justify-between">
            <div
              class="h-3 w-16 rounded"
              :style="{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))',
              }"
            />
            <div
              class="h-3 w-12 rounded"
              :style="{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))',
              }"
            />
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-2 pt-1">
            <div
              class="flex-1 h-8 rounded-lg"
              :style="{
                background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.3), rgba(139, 92, 246, 0.3))',
              }"
            />
            <div
              class="h-8 w-8 rounded-lg"
              :style="{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(124, 58, 237, 0.25))',
              }"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>