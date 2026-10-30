<script setup lang="ts">
const originList = useTemplateRef('originList');
const reloadAction = useReloadAction({
  reload: async () => { await originList.value?.refresh(); },
  loading: computed(() => originList.value?.loading ?? false),
});
const sections = computed(() => [{
  value: 'origins',
  title: 'Auth Origins',
  description: 'Trusted applications for authentication redirects. API CORS is configured separately.',
  actions: [reloadAction],
}]);
</script>

<template>
  <div class="eapp-page-constrained">
    <CommonPanel :sections="sections">
      <template #origins>
        <CommonOriginList ref="originList" kind="auth" />
      </template>
    </CommonPanel>
  </div>
</template>
