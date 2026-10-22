<script setup lang="ts">
import { humanizeIdentifier } from "~/utils/form/humanize-label";

interface BreadcrumbItem {
  label: string;
  to?: string;
  icon?: string;
}

const { isDesktop } = useScreen();
const route = useRoute();

const trail = ref<HTMLElement | null>(null);

const items = computed<BreadcrumbItem[]>(() => {
  const parts = route.path.split("/").filter(Boolean);

  const segments = parts.map((part, index) => {
    const isLast = index === parts.length - 1;
    return {
      label: humanizeIdentifier(decodeURIComponent(part)),
      ...(isLast ? {} : { to: "/" + parts.slice(0, index + 1).join("/") }),
    };
  });

  return [{ label: "Home", icon: "lucide:home", to: "/" }, ...segments];
});

const scrollUi = {
  root: "min-w-max",
  list: "flex-nowrap gap-0.5",
  item: "shrink-0",
  link: "text-xs gap-1",
  linkLeadingIcon: "size-3.5",
  linkLabel: "whitespace-nowrap",
  separatorIcon: "size-3",
};

async function revealTrailEnd() {
  await nextTick();
  trail.value?.scrollTo({ left: trail.value.scrollWidth });
}

watch(() => route.path, () => {
  if (!isDesktop.value) void revealTrailEnd();
}, { flush: "post" });

watch(isDesktop, (desktop) => {
  if (!desktop) void revealTrailEnd();
}, { flush: "post" });

onMounted(() => {
  if (!isDesktop.value) void revealTrailEnd();
});
</script>

<template>
  <div class="min-w-0 flex-1 pe-3">
    <div
      ref="trail"
      class="no-scrollbar overflow-x-auto overscroll-x-contain"
    >
      <UBreadcrumb :items="items" :ui="isDesktop ? undefined : scrollUi" />
    </div>
  </div>
</template>
