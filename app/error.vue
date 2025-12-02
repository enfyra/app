<template>
  <div
    class="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden bg-white dark:bg-gray-900"
    role="main"
    aria-labelledby="error-title"
  >
    <!-- Grid Pattern Background -->
    <div class="absolute inset-0 opacity-5 dark:opacity-10">
      <div class="absolute inset-0" style="background-image: radial-gradient(circle, #000 1px, transparent 1px); background-size: 24px 24px;"></div>
    </div>

    <!-- Centered Content -->
    <div class="relative mx-auto w-full max-w-[472px] text-center z-10">
      <h1
        id="error-title"
        class="mb-8 font-bold text-gray-800 dark:text-white/90 text-title-md xl:text-title-2xl"
        aria-live="assertive"
      >
        {{ error.statusCode || "500" }}
      </h1>

      <!-- Error Icon/Illustration -->
      <div class="flex justify-center mb-6">
        <div v-if="error.statusCode === 403" class="w-32 h-32 flex items-center justify-center">
          <UIcon name="lucide:shield-x" class="w-full h-full text-error-500" />
        </div>
        <div v-else-if="error.statusCode === 404" class="w-64 h-64 flex items-center justify-center">
          <UIcon name="lucide:file-question" class="w-full h-full text-gray-400 dark:text-gray-600" />
        </div>
        <div v-else class="w-32 h-32 flex items-center justify-center">
          <UIcon name="lucide:alert-circle" class="w-full h-full text-error-500" />
        </div>
      </div>

      <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90 mb-2">
        {{ error.statusMessage || "Server Error" }}
      </h2>

      <p
        class="mt-4 mb-8 text-base text-gray-500 dark:text-gray-400 sm:text-lg max-w-md mx-auto"
        role="alert"
      >
        {{ errorDescription }}
      </p>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
        <UButton
          icon="lucide:home"
          size="lg"
          variant="solid"
          color="primary"
          @click="handleError"
          aria-label="Go back to homepage"
          class="w-full sm:w-auto"
        >
          Back to Home Page
        </UButton>

        <UButton
          variant="outline"
          icon="lucide:refresh-cw"
          size="lg"
          @click="refresh"
          aria-label="Refresh the page"
          class="w-full sm:w-auto"
        >
          Try Again
        </UButton>
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

