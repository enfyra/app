<script setup lang="ts">
const { open, input, version, valid, cancel, accept } = useCodeVersion();
const route = useRoute();
watch(() => route.fullPath, cancel);
onBeforeUnmount(cancel);
</script>

<template>
  <CommonModal :open="open" :ui="{ overlay: 'z-[150]', content: 'z-[150]' }" :cancel-action="{ label: 'Cancel', onClick: cancel }" :primary-action="{ label: 'Save version', disabled: !valid, onClick: accept }" @update:open="value => { if (!value) cancel(); }">
    <template #header>Save a new code version</template>
    <template #body>
      <form class="space-y-4" @submit.prevent="accept">
        <p class="text-sm text-muted break-words">{{ input?.tableName }} · {{ input?.recordId }} · Current version {{ input?.currentVersion }}</p>
        <UFormField label="New version" v-bind="input && !valid ? { error: `Enter a valid version greater than ${input?.currentVersion}.` } : {}" help="The previous revision is recorded in code history. You can choose a higher major or minor version.">
          <UInput v-model="version" autofocus class="w-full" placeholder="1.0.1" />
        </UFormField>
      </form>
    </template>
  </CommonModal>
</template>
