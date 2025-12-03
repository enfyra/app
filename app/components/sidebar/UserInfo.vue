<script setup lang="ts">
const colorMode = useColorMode();
const { me } = useEnfyraAuth();

const userEmail = computed(() => {
  if (!me.value) return '';
  return me.value.email || me.value.username || '';
});

const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (val: boolean) => {
    colorMode.preference = val ? 'dark' : 'light';
  }
});

function toggleTheme() {
  isDark.value = !isDark.value;
}
</script>

<template>
  <div class="flex items-center justify-start gap-3 w-full">
    <!-- User Email Badge with Profile Link -->
    <div v-if="userEmail" class="flex items-center gap-2 min-w-0 flex-1">
      <UBadge
        color="primary"
        variant="soft"
        class="min-w-0 overflow-hidden normal-case flex-1 text-sm"
      >
        <span class="truncate block">{{ userEmail }}</span>
      </UBadge>
      <NuxtLink
        to="/me"
        class="shrink-0"
        active-class="[&_button]:bg-brand-50 [&_button]:text-brand-500 dark:[&_button]:bg-brand-500/15 dark:[&_button]:text-brand-400"
      >
        <UButton
          icon="lucide:user"
          variant="ghost"
          color="neutral"
          size="md"
          aria-label="Edit profile"
        />
      </NuxtLink>
    </div>
    <div v-else class="text-sm text-gray-500 dark:text-gray-400 truncate flex-1">
      No user info
    </div>
    
    <!-- Theme Toggle Button -->
    <UButton
      :icon="isDark ? 'lucide:sun' : 'lucide:moon'"
      variant="ghost"
      color="neutral"
      size="sm"
      @click="toggleTheme"
      :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      class="shrink-0 ml-auto"
    />
  </div>
</template>

