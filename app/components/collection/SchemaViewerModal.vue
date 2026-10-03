<script setup lang="ts">
defineProps<{ tableName: string }>();
const open = defineModel<boolean>('open', { default: false });
</script>

<template>
  <CommonModal
    v-model:open="open"
    :ui="{
      content: 'w-[calc(100vw-2rem)] max-w-4xl max-h-[calc(100dvh-2rem)] sm:max-h-[85dvh]',
      header: 'min-h-0 items-start',
      wrapper: 'min-w-0 flex-1',
      close: '!relative !top-auto !end-auto !h-9 !w-9 shrink-0 pointer-coarse:before:absolute pointer-coarse:before:-inset-1 pointer-coarse:before:content-[\'\']',
      body: 'min-h-0',
    }"
  >
    <template #header>
      <span class="flex items-center gap-2 text-base font-semibold text-highlighted">
        <UIcon name="lucide:database" class="size-5 shrink-0 text-primary" />
        <span>View schema</span>
      </span>
      <span class="mt-1 line-clamp-2 font-mono text-xs font-normal text-muted [overflow-wrap:anywhere]" :title="tableName">{{ tableName }}</span>
    </template>
    <template #body>
      <CollectionSchemaViewer :table-name="tableName" />
    </template>
  </CommonModal>
</template>
