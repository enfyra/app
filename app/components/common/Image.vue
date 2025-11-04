<template>
  <div
    ref="containerRef"
    :class="['relative', shapeClasses, containerClass, props.class]"
    :style="[aspectRatioStyle, containerStyle]"
  >
    <div
      v-if="isLoading"
      :class="['absolute inset-0', shapeClasses]"
      :style="loadingStyle"
    >
      <div
        class="absolute inset-0 bg-gray-200 dark:bg-gray-700"
        :class="shapeClasses"
      />

      <div
        class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/10"
        :class="[shapeClasses, 'animate-shimmer']"
      />

      <div class="absolute inset-0 flex items-center justify-center">
        <UIcon
          name="lucide:image"
          class="text-gray-300 dark:text-gray-600 opacity-50"
          size="24"
        />
      </div>
    </div>

    <div
      v-show="hasError && !isRetrying"
      :class="[
        'absolute inset-0 flex flex-col items-center justify-center',
        'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500',
        shapeClasses,
      ]"
    >
      <UIcon name="lucide:image-off" size="24" class="mb-2 opacity-50" />
      <span v-if="showErrorText" class="text-xs text-center px-2">
        {{ errorText }}
      </span>
      <UButton
        v-if="allowRetry"
        size="xs"
        variant="ghost"
        @click="retryLoad"
        class="mt-2"
      >
        Retry
      </UButton>
    </div>

    <img
      v-if="shouldLoad"
      ref="imageRef"
      :src="imageSrc"
      :alt="alt"
      :class="['object-cover', imageClass]"
      :style="{
        opacity: isLoading ? 0 : 1,
        transition: 'opacity 0.3s ease-out',
      }"
      loading="lazy"
      decoding="async"
      @load="handleLoad"
      @error="handleError"
    />
  </div>
</template>

<script setup lang="ts">
import { nextTick } from "vue";

type ImageShape = "square" | "rounded" | "circle" | "none";

interface Props {
  src: string;
  alt?: string;
  class?: string;
  containerClass?: string;
  shape?: ImageShape;
  aspectRatio?: string;
  fallbackSrc?: string;
  allowRetry?: boolean;
  showErrorText?: boolean;
  errorText?: string;
  customLoadingSize?: string;
}

const props = withDefaults(defineProps<Props>(), {
  alt: "",
  class: "",
  containerClass: "",
  shape: "none",
  aspectRatio: "",
  fallbackSrc: "",
  allowRetry: true,
  showErrorText: false,
  errorText: "Failed to load image",
  customLoadingSize: "",
});

const containerRef = ref<HTMLDivElement>();
const imageRef = ref<HTMLImageElement>();
const isLoading = ref(true);
const hasError = ref(false);
const isRetrying = ref(false);
const retryCount = ref(0);
const isInViewport = ref(false);
const maxRetries = 3;
const retryTimer = ref<ReturnType<typeof setTimeout> | null>(null);

const imageSrc = computed(() => {
  let src = props.src;

  // Handle assets paths
  if (src.includes("/assets/")) {
    // Ensure it starts with /assets/
    if (!src.startsWith("/assets/")) {
      src = src.replace(/^\/?(assets\/)/, "/assets/");
    }

    const url = new URL(src, window.location.origin);

    // Add format if not present
    if (!url.searchParams.has("format")) {
      url.searchParams.set("format", "avif");
    }

    // Preserve existing query params (like ?t= for cache busting)
    src = url.pathname + url.search;
  }

  return src;
});

const shapeClasses = computed(() => {
  const shapes = {
    square: "",
    rounded: "rounded-lg",
    circle: "rounded-full",
    none: "",
  };
  return shapes[props.shape];
});

const aspectRatioStyle = computed(() => {
  if (props.aspectRatio) {
    return { aspectRatio: props.aspectRatio };
  }
  return {
    minWidth: "100px",
    minHeight: "100px",
  };
});

const imageClass = computed(() => props.class);

const loadingStyle = computed(() => {
  if (props.customLoadingSize) {
    return {
      width: props.customLoadingSize,
      height: props.customLoadingSize,
    };
  }
  return {};
});

// Container style: chỉ override khi cần custom loading size
const containerStyle = computed(() => {
  if (props.customLoadingSize && isLoading.value) {
    return {
      width: props.customLoadingSize,
      height: props.customLoadingSize,
    };
  }
  return {};
});

const shouldLoad = computed(() => {
  return isInViewport.value;
});

function handleLoad() {
  isLoading.value = false;
  hasError.value = false;
  isRetrying.value = false;
}

function handleError() {
  isLoading.value = false;
  isRetrying.value = false;

  if (props.fallbackSrc && retryCount.value === 0) {
    retryCount.value++;
    const img = imageRef.value;
    if (img instanceof HTMLImageElement && props.fallbackSrc) {
      img.src = props.fallbackSrc;
    }
  } else if (retryCount.value < maxRetries) {
    retryCount.value++;
    retryTimer.value = setTimeout(() => {
      retryLoad();
    }, 1000 * retryCount.value);
  } else {
    hasError.value = true;
    if (import.meta.dev) {
      console.warn(
        `Failed to load image after ${maxRetries} retries:`,
        props.src
      );
    }
  }
}

function retryLoad() {
  if (retryCount.value < maxRetries) {
    isRetrying.value = true;
    hasError.value = false;
    isLoading.value = true;
    retryCount.value++;

    const img = imageRef.value;
    if (img instanceof HTMLImageElement) {
      img.src = "";
      requestAnimationFrame(() => {
        if (imageRef.value instanceof HTMLImageElement) {
          imageRef.value.src = imageSrc.value;
        }
      });
    }
  } else {
    if (import.meta.dev) {
      console.warn(`Max retries (${maxRetries}) reached for image:`, props.src);
    }
  }
}

const observer = ref<IntersectionObserver>();

onMounted(() => {
  isLoading.value = true;

  if ("IntersectionObserver" in window) {
    nextTick(() => {
      if (!containerRef.value) return;

      observer.value = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !isInViewport.value) {
              isInViewport.value = true;
              observer.value?.disconnect();
            }
          });
        },
        {
          rootMargin: "50px",
          threshold: 0.01,
        }
      );

      observer.value.observe(containerRef.value);
    });
  } else {
    isInViewport.value = true;
  }
});

onBeforeUnmount(() => {
  if (observer.value) {
    observer.value.disconnect();
    observer.value = undefined;
  }

  if (retryTimer.value) {
    clearTimeout(retryTimer.value);
    retryTimer.value = null;
  }
});

onUnmounted(() => {
  observer.value?.disconnect();
});

watch(
  () => props.src,
  (newSrc, oldSrc) => {
    // Reset states
    isLoading.value = true;
    hasError.value = false;
    isRetrying.value = false;
    retryCount.value = 0;

    // Force reload image if src changed
    if (newSrc !== oldSrc && imageRef.value) {
      // Clear current src to force browser to reload
      imageRef.value.src = "";

      // Re-trigger intersection observer if needed
      if (isInViewport.value) {
        nextTick(() => {
          if (imageRef.value) {
            imageRef.value.src = imageSrc.value;
          }
        });
      }
    }
  }
);
</script>
