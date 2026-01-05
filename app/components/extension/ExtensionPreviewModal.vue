<template>
  <CommonModal
    v-model="isOpen"
    class="w-full max-w-7xl"
  >
    <template #title>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-eye" class="w-5 h-5 text-primary-500" />
        <span class="font-semibold">Extension Preview</span>
      </div>
    </template>

    <template #body>
      <div v-if="previewLoading" class="flex items-center justify-center h-[70vh]">
        <div class="text-center">
          <UIcon name="i-heroicons-arrow-path" class="w-10 h-10 animate-spin mx-auto mb-4 text-primary-500" />
          <p class="text-sm text-gray-600 dark:text-gray-400 font-medium">Compiling extension...</p>
        </div>
      </div>

      <div v-else-if="previewError" class="flex items-center justify-center h-[70vh]">
        <div class="text-center max-w-md">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-red-500 dark:text-red-400" />
          </div>
          <h4 class="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Compilation Error</h4>
          <div class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p class="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap text-left">{{ previewError }}</p>
          </div>
        </div>
      </div>

      <div v-else-if="previewComponent && isValidComponent" class="extension-preview-container space-y-4">
        <div v-if="previewPageHeader" class="rounded-xl bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 p-6 shadow-lg">
          <h2 class="text-2xl font-bold text-white mb-2">{{ previewPageHeader.title }}</h2>
          <p v-if="previewPageHeader.description" class="text-white/90 text-sm leading-relaxed">
            {{ previewPageHeader.description }}
          </p>
        </div>

        <div v-if="previewHeaderActions.length > 0" class="flex gap-2 justify-end flex-wrap">
          <UButton
            v-for="action in previewHeaderActions"
            :key="action.id"
            :label="action.label"
            :icon="action.icon"
            :variant="action.variant || 'solid'"
            :color="action.color || 'primary'"
            :disabled="action.disabled"
            @click="action.onClick"
          />
        </div>

        <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          <div class="p-8 min-h-[60vh]">
            <component :is="previewComponent" v-if="isValidComponent" />
          </div>
        </div>
      </div>
      
      <div v-else-if="previewComponent && !isValidComponent" class="flex items-center justify-center h-[70vh]">
        <div class="text-center max-w-md">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-yellow-500 dark:text-yellow-400" />
          </div>
          <h4 class="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Component Render Error</h4>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Component đã được compile nhưng không thể render. Có thể do package dependencies chưa được load đúng cách.
          </p>
        </div>
      </div>
    </template>
  </CommonModal>
</template>

<script setup lang="ts">
import { ref, watch, markRaw } from 'vue';
import { useDynamicComponent } from '../../composables/dynamic/useDynamicComponent';

const props = defineProps<{
  modelValue: boolean;
  code: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const previewLoading = ref(false);
const previewError = ref<string | null>(null);
const previewComponent = ref<any>(null);
const previewHeaderActions = ref<any[]>([]);
const previewSubHeaderActions = ref<any[]>([]);
const previewPageHeader = ref<any>(null);

const isValidComponent = computed(() => {
  if (!previewComponent.value) return false;
  // Check if component is a valid Vue component
  return typeof previewComponent.value === 'object' && 
         (previewComponent.value.__v_isVNode !== undefined || 
          previewComponent.value.setup !== undefined ||
          previewComponent.value.render !== undefined ||
          previewComponent.value.template !== undefined);
});

const { loadExtensionComponentPreview } = useDynamicComponent();

function clearPreview() {
  previewLoading.value = false;
  previewError.value = null;
  previewComponent.value = null;
  previewHeaderActions.value = [];
  previewSubHeaderActions.value = [];
  previewPageHeader.value = null;
}

watch(() => props.modelValue, async (open) => {
  if (open && props.code) {
    await compileAndPreview();
  } else if (!open) {
    clearPreview();
  }
});

async function compileAndPreview() {
  previewLoading.value = true;
  previewError.value = null;
  previewComponent.value = null;

  try {
    const { getAppUrl } = await import('~/utils/api/url');
    const baseURL = getAppUrl();
    
    const response = await $fetch<{
      success: boolean;
      compiledCode: string;
      extensionId?: string;
    }>('/api/extension_definition/preview', {
      method: 'POST',
      body: {
        code: props.code,
      },
      baseURL,
    });

    if (response?.success && response?.compiledCode) {
      const extensionId = response?.extensionId || `preview_${Date.now()}`;
      try {
        const component = await loadExtensionComponentPreview(
          response.compiledCode,
          extensionId,
          {
            headerActions: previewHeaderActions,
            subHeaderActions: previewSubHeaderActions,
            pageHeader: previewPageHeader,
          },
          props.code
        );
        
        // Validate component before setting
        if (!component) {
          throw new Error('Component is null or undefined after loading');
        }
        if (typeof component !== 'object') {
          throw new Error(`Component is not an object: ${typeof component}`);
        }
        // Check if component has a render function or setup function
        if (!component.render && !component.setup && !component.template) {
          console.warn('Component may not be valid Vue component:', component);
        }
        previewComponent.value = markRaw(component);
      } catch (loadError: any) {
        throw new Error(`Failed to load component: ${loadError?.message || loadError}`);
      }
    } else {
      throw new Error('Failed to compile extension');
    }
  } catch (error: any) {
    previewError.value = error?.data?.message || error?.message || 'Failed to compile extension';
    console.error('Preview error:', error);
  } finally {
    previewLoading.value = false;
  }
}
</script>

<style scoped>
.extension-preview-container {
  isolation: isolate;
}
</style>

