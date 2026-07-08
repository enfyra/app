<template>
  <div class="contents">
    <component
      v-for="extension in activeGlobalExtensions"
      :key="extension.key"
      :is="extension.component"
      :components="extension.component.components"
    />
  </div>
</template>

<script setup lang="ts">
const { globalExtensions } = useGlobalExtensions();
const notify = useNotify();
const failedExtensionKeys = ref(new Set<string>());
const activeGlobalExtensions = computed(() => {
  return globalExtensions.value.filter((extension) => !failedExtensionKeys.value.has(extension.key));
});

const getFailedExtension = (instance: any) => {
  return globalExtensions.value.find((extension) => {
    return extension.component === instance?.type || extension.component === instance?.parent?.type;
  });
};

watch(globalExtensions, (extensions) => {
  const activeKeys = new Set(extensions.map((extension) => extension.key));
  failedExtensionKeys.value = new Set(
    [...failedExtensionKeys.value].filter((key) => activeKeys.has(key)),
  );
});

onErrorCaptured((err, instance, info) => {
  const extension = getFailedExtension(instance);
  const message = err instanceof Error ? err.message : String(err || "Unknown Vue runtime error");
  if (extension) {
    failedExtensionKeys.value = new Set([...failedExtensionKeys.value, extension.key]);
  }
  void notify.error(
    "Global extension error",
    `Extension "${extension?.name || "unknown"}" failed${info ? ` during ${info}` : ""}: ${message}`,
  );
  console.error("[Global extension] Runtime error", {
    extension: extension?.name || extension?.extensionId,
    info,
    error: err,
  });
  return false;
});
</script>
