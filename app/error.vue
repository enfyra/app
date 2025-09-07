<template>
  <div
    class="min-h-screen flex items-center justify-center bg-background"
    role="main"
    aria-labelledby="error-title"
  >
    <div class="text-center space-y-6 px-4">
      <div class="space-y-2">
        <!-- Error Icon for 403 -->
        <div v-if="error.statusCode === 403" class="flex justify-center mb-4">
          <UIcon name="lucide:shield-x" class="w-16 h-16 text-red-500" />
        </div>
        <h1
          id="error-title"
          class="text-8xl font-bold text-primary"
          aria-live="assertive"
        >
          {{ error.statusCode || "500" }}
        </h1>
        <h2 class="text-xl font-medium text-foreground">
          {{ error.statusMessage || "Server Error" }}
        </h2>
        <p class="text-gray-500 max-w-md mx-auto" role="alert">
          {{ errorDescription }}
        </p>
      </div>

      <div class="space-y-3">
        <UButton
          icon="lucide:home"
          size="lg"
          @click="handleError"
          aria-label="Go back to homepage"
        >
          Go Home
        </UButton>

        <div>
          <UButton
            variant="ghost"
            icon="lucide:refresh-cw"
            @click="refresh"
            aria-label="Refresh the page"
          >
            Try Again
          </UButton>
        </div>
      </div>

      <!-- Skip link for screen readers -->
      <div class="sr-only">
        <a
          href="#error-actions"
          class="focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded"
        >
          Skip to error actions
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from "#app";

const props = defineProps<{
  error: NuxtError;
}>();

const errorDescription = computed(() => {
  if (props.error.statusCode === 404) {
    return "The page you are looking for could not be found.";
  }
  if (props.error.statusCode === 403) {
    return (
      props.error.message ||
      "You do not have permission to access this resource. Please contact your administrator if you believe this is an error."
    );
  }
  if (props.error.statusCode === 500) {
    return "Something went wrong on our end. Please try again later.";
  }
  return props.error.message || "An unexpected error occurred.";
});

const handleError = () => clearError({ redirect: "/" });
const refresh = () => window.location.reload();

// Set page title for better SEO and accessibility
useHead({
  title: computed(() => `Error ${props.error.statusCode} - Enfyra App`),
  meta: [
    {
      name: "description",
      content: computed(() => errorDescription.value),
    },
  ],
});
</script>

<style scoped>
/* Ensure good contrast for error messages */
[role="alert"] {
  color: rgb(107, 114, 128);
}

@media (prefers-color-scheme: dark) {
  [role="alert"] {
    color: rgb(156, 163, 175);
  }
}
</style>
