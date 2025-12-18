<template>
  <div class="space-y-6">
    
    <div class="grid gap-4 md:grid-cols-2">
      <CommonSettingsCard
        title="App Packages"
        description="Manage frontend application packages"
        icon="lucide:package"
        icon-color="primary"
        :card-class="'cursor-pointer lg:hover:ring-2 lg:hover:ring-primary/20 transition-all'"
        @click="navigateTo('/packages/app')"
        :actions="[
          {
            label: 'Manage',
            props: { variant: 'solid', color: 'primary', size: 'md' },
            to: '/packages/app',
            block: true,
          },
        ]"
      />

      <CommonSettingsCard
        title="Backend Packages"
        description="Manage backend server packages"
        icon="lucide:server"
        icon-color="success"
        :card-class="'cursor-pointer lg:hover:ring-2 lg:hover:ring-success/20 transition-all'"
        @click="navigateTo('/packages/backend')"
        :actions="[
          {
            label: 'Manage',
            props: { variant: 'solid', color: 'success', size: 'md' },
            to: '/packages/backend',
            block: true,
          },
        ]"
      />
    </div>

    <div class="mt-8">
      <h3 class="text-lg font-semibold mb-4">Quick Actions</h3>
      <div class="flex gap-3">
        <UButton
          icon="lucide:plus"
          label="Install App Package"
          variant="outline"
          color="primary"
          size="md"
          to="/packages/install?type=app"
        />
        <UButton
          icon="lucide:plus"
          label="Install Backend Package"
          variant="outline"
          color="success"
          size="md"
          to="/packages/install?type=backend"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
});

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Packages",
  description: "Manage app and backend packages",
  gradient: "purple",
});
</script>
