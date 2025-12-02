<script setup lang="ts">
const props = defineProps<{
  type?: 'form' | 'page' | 'content' | 'table';
  showNavigation?: boolean;
}>();
</script>

<template>
  <div class="space-y-6 p-6">
    <!-- Navigation Skeleton -->
    <div v-if="showNavigation" class="flex items-center justify-between animate-pulse">
      <div class="flex items-center gap-4">
        <div class="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded"></div>
        <div class="h-6 bg-gray-200 dark:bg-gray-800 rounded w-32"></div>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-20 h-8 bg-gray-200 dark:bg-gray-800 rounded"></div>
        <div class="w-24 h-8 bg-gray-200 dark:bg-gray-800 rounded"></div>
      </div>
    </div>

    <!-- Page Title -->
    <div class="animate-pulse">
      <div class="h-8 bg-gray-200 dark:bg-gray-800 rounded w-48 mb-2"></div>
      <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-64"></div>
    </div>

    <!-- Form Skeleton -->
    <div v-if="type === 'form'" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Input Fields -->
        <div v-for="i in 6" :key="i" class="space-y-2 animate-pulse">
          <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24"></div>
          <div class="h-10 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </div>
      </div>
      
      <!-- Textarea -->
      <div class="space-y-2 animate-pulse">
        <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-32"></div>
        <div class="h-24 bg-gray-200 dark:bg-gray-800 rounded"></div>
      </div>
      
      <!-- Buttons -->
      <div class="flex gap-4 animate-pulse">
        <div class="w-24 h-10 bg-gray-200 dark:bg-gray-800 rounded"></div>
        <div class="w-20 h-10 bg-gray-200 dark:bg-gray-800 rounded"></div>
      </div>
    </div>

    <!-- Content Skeleton -->
    <div v-else-if="type === 'content'" class="space-y-4">
      <div v-for="i in 5" :key="i" class="animate-pulse">
        <div class="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
          <div class="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
            <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
            <div class="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Table Skeleton -->
    <div v-else-if="type === 'table'" class="space-y-4">
      <!-- Table Header -->
      <div class="flex items-center justify-between animate-pulse">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 bg-gray-200 dark:bg-gray-800 rounded"></div>
          <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24"></div>
        </div>
        <div class="w-24 h-8 bg-gray-200 dark:bg-gray-800 rounded"></div>
      </div>
      
      <!-- Table -->
      <div class="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <!-- Header Row -->
        <div class="bg-gray-50 dark:bg-gray-900 p-4 border-b border-gray-200 dark:border-gray-800 animate-pulse">
          <div class="grid grid-cols-5 gap-4">
            <div v-for="i in 5" :key="i" class="h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
          </div>
        </div>
        
        <!-- Data Rows -->
        <div v-for="i in 8" :key="i" class="p-4 border-b border-gray-200 dark:border-gray-800 animate-pulse">
          <div class="grid grid-cols-5 gap-4">
            <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
            <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
            <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
            <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3"></div>
            <div class="flex gap-2">
              <div class="w-8 h-6 bg-gray-200 dark:bg-gray-800 rounded"></div>
              <div class="w-8 h-6 bg-gray-200 dark:bg-gray-800 rounded"></div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Pagination -->
      <div class="flex items-center justify-between animate-pulse">
        <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-32"></div>
        <div class="flex gap-2">
          <div v-for="i in 5" :key="i" class="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </div>
      </div>
    </div>

    <!-- Default Page Skeleton -->
    <div v-else class="space-y-6">
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div v-for="i in 3" :key="i" class="p-6 border border-gray-200 dark:border-gray-800 rounded-lg animate-pulse">
          <div class="flex items-center justify-between">
            <div class="space-y-2">
              <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-16"></div>
              <div class="h-8 bg-gray-200 dark:bg-gray-800 rounded w-24"></div>
            </div>
            <div class="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
      
      <!-- Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div v-for="i in 4" :key="i" class="p-6 border border-gray-200 dark:border-gray-800 rounded-lg space-y-4 animate-pulse">
          <div class="h-6 bg-gray-200 dark:bg-gray-800 rounded w-32"></div>
          <div class="space-y-2">
            <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
            <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-4/5"></div>
            <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/5"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Crescent Loading with Content -->
    <div class="fixed bottom-8 right-8 bg-white rounded-full shadow-lg p-4 border animate-pulse">
      <div class="flex items-center gap-3">
        <!-- Crescent Spinner -->
        <div class="relative w-6 h-6">
          <svg class="w-6 h-6 animate-spin" viewBox="0 0 24 24">
            <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12" 
              fill="none" stroke="#3B82F6" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="text-sm text-gray-600">Loading content...</div>
      </div>
    </div>
  </div>
</template>