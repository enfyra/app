<template>
  <div class="space-y-3">
    <!-- Main Search Input -->
    <div class="relative">
      <UInputMenu
        v-model="selectedPackageItem"
        :items="packageItems"
        v-model:search-term="searchTerm"
        :placeholder="placeholder"
        :disabled="disabled"
        :loading="loading"
        size="lg"
        variant="outline"
        loading-icon="lucide:loader-2"
        icon="lucide:search"
        class="w-full"
      >
        <!-- <template #leading>
          <UIcon name="lucide:search" class="w-4 h-4 text-gray-500" />
        </template> -->

        <template #item="{ item }">
          <div class="flex items-start justify-between w-full">
            <div class="flex items-start gap-2 flex-1 min-w-0">
              <UIcon
                :name="item.icon"
                class="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5"
              />
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm truncate">{{ item.label }}</div>
                <div class="text-xs text-gray-500 truncate">
                  {{ item.description }}
                </div>
              </div>
            </div>
            <UBadge
              :color="item.chip.color"
              :variant="item.chip.variant"
              :size="item.chip.size"
              class="ml-2 flex-shrink-0"
            >
              {{ item.chip.text }}
            </UBadge>
          </div>
        </template>

        <template #trailing>
          <div class="flex items-center gap-2">
            <!-- Search status -->
            <div
              v-if="searchTerm && searchTerm.length >= 2"
              class="flex items-center"
            >
              <UBadge v-if="loading" color="primary" variant="soft" size="xs">
                Searching...
              </UBadge>
              <UBadge
                v-else-if="packages.length > 0"
                color="success"
                variant="soft"
                size="xs"
              >
                {{ packages.length }}
              </UBadge>
            </div>

            <!-- Clear button -->
            <UButton
              v-if="selectedPackageItem || searchTerm"
              variant="ghost"
              color="neutral"
              size="xs"
              icon="lucide:x"
              :padded="false"
              @click="clearSelection"
              class="opacity-60 hover:opacity-100 transition-opacity"
            />
          </div>
        </template>
      </UInputMenu>
    </div>

    <!-- Search hints -->
    <div class="flex items-center justify-between text-xs text-gray-500">
      <div class="flex items-center gap-1">
        <UIcon name="lucide:lightbulb" class="w-3 h-3" />
        <span>Popular: axios, lodash, express, moment</span>
      </div>
      <div
        v-if="searchTerm && searchTerm.length >= 2 && !loading"
        class="text-gray-400"
      >
        ↵ Enter to select
      </div>
    </div>

    <!-- Selected Package Card -->
    <Transition name="fade-slide">
      <div
        v-if="selectedPackage"
        class="relative overflow-hidden rounded-xl border border-green-500/20 bg-gradient-to-r from-green-500/5 via-emerald-500/5 to-green-500/5 p-4 backdrop-blur-sm shadow-sm"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1 space-y-2">
            <!-- Package name and version -->
            <div class="flex items-center gap-2 flex-wrap">
              <div class="flex items-center gap-2">
                <UIcon
                  name="lucide:package-check"
                  class="w-4 h-4 text-green-500 flex-shrink-0"
                />
                <span class="font-medium text-green-400 text-sm">
                  {{ selectedPackage.name }}
                </span>
              </div>
              <UBadge color="success" variant="soft" size="xs">
                v{{ selectedPackage.version }}
              </UBadge>
            </div>

            <!-- Package description -->
            <p
              v-if="selectedPackage.description"
              class="text-xs text-gray-400 line-clamp-2 leading-relaxed"
            >
              {{ selectedPackage.description }}
            </p>

            <!-- Package metadata -->
            <div class="flex items-center gap-3 text-xs text-gray-500">
              <div class="flex items-center gap-1">
                <UIcon name="lucide:user" class="w-3 h-3" />
                <span>{{ selectedPackage.author }}</span>
              </div>
              <div class="flex items-center gap-1">
                <UIcon name="lucide:trending-up" class="w-3 h-3" />
                <span
                  >{{ Math.round(selectedPackage.popularity * 100) }}%
                  popular</span
                >
              </div>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="flex items-center gap-1 ml-3">
            <UButton
              variant="ghost"
              color="neutral"
              size="xs"
              icon="lucide:external-link"
              :to="selectedPackage.links?.npm"
              target="_blank"
              class="hover:bg-gray-700/50"
            />
            <UButton
              variant="ghost"
              color="neutral"
              size="xs"
              icon="lucide:x"
              @click="clearSelection"
              class="hover:bg-gray-700/50"
            />
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { debounce } from "lodash-es";

interface NpmPackage {
  name: string;
  version: string;
  description: string;
  keywords: string[];
  author: string;
  date: string;
  score: number;
  popularity: number;
  quality: number;
  maintenance: number;
  searchScore: number;
  links: {
    npm: string;
    homepage?: string;
    repository?: string;
  };
}

interface Props {
  modelValue?: NpmPackage | null;
  placeholder?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: "Search NPM packages (e.g., axios, lodash, express)",
  disabled: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: NpmPackage | null];
  select: [pkg: NpmPackage];
  clear: [];
}>();

const searchTerm = ref("");
const packages = ref<NpmPackage[]>([]);
const selectedPackage = ref<NpmPackage | null>(props.modelValue || null);

// Transform packages to object array for UInputMenu
// Only show packages if search term is long enough
const packageItems = computed(() => {
  if (!searchTerm.value || searchTerm.value.length < 2) {
    return [];
  }
  return packages.value.map((pkg) => ({
    label: pkg.name,
    description: pkg.description || "No description available",
    value: pkg.name,
    icon: "lucide:package",
    chip: {
      text: `v${pkg.version}`,
      color: "primary" as const,
      variant: "soft" as const,
      size: "xs" as const,
    },
  }));
});

const selectedPackageItem = ref<any>(null);

// Setup API composable for npm search
const {
  data: searchData,
  pending: loading,
  execute: executeSearch,
} = useApi("/npm-search", {
  immediate: false,
  query: computed(() => ({
    q: searchTerm.value,
  })),
  watch: false,
});

// Watch for search data changes
watch(searchData, (newData) => {
  if (newData?.data) {
    packages.value = newData.data;
  }
});

// Watch searchTerm changes with debouncing
watch(searchTerm, (newQuery, oldQuery) => {
  // Clear packages immediately when user starts typing new query
  if (newQuery !== oldQuery && newQuery.length >= 2) {
    packages.value = [];
  }
});

watch(
  searchTerm,
  debounce(async (query: string) => {
    if (query.length < 2) {
      packages.value = [];
      return;
    }

    await executeSearch();
  }, 300)
);

// Watch for external value changes
watch(
  () => props.modelValue,
  (newValue) => {
    selectedPackage.value = newValue || null;
    selectedPackageItem.value = newValue
      ? {
          label: newValue.name,
          description: newValue.description || "No description available",
          value: newValue.name,
          icon: "lucide:package",
          chip: {
            text: `v${newValue.version}`,
            color: "primary" as const,
            variant: "soft" as const,
            size: "xs" as const,
          },
        }
      : null;
  }
);

// Watch selected package item and find corresponding package object
watch(selectedPackageItem, (item) => {
  if (item?.value) {
    const pkg = packages.value.find((p) => p.name === item.value);
    selectedPackage.value = pkg || null;
  } else {
    selectedPackage.value = null;
  }
});

// Watch selectedPackage changes to emit events
watch(selectedPackage, (newPkg) => {
  emit("update:modelValue", newPkg);
  if (newPkg) {
    emit("select", newPkg);
  }
});

// Clear selection function
const clearSelection = () => {
  selectedPackageItem.value = null;
  selectedPackage.value = null;
  searchTerm.value = "";
  packages.value = [];
  emit("clear");
};
</script>
