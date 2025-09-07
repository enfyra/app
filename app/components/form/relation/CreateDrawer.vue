<script setup lang="ts">
// useEnfyraApi is auto-imported in Nuxt

const props = defineProps<{
  modelValue: boolean;
  relationMeta: any;
  selected: any[];
}>();
const emit = defineEmits(["update:modelValue", "created", "update:selected"]);

const show = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const { schemas } = useSchema();
const targetTable = Object.values(schemas.value).find(
  (schema: any) => schema.id === props.relationMeta.targetTable.id
) as any;
const { generateEmptyForm, validate } = useSchema(targetTable?.name);

const {
  data: createData,
  pending: creating,
  execute: createRecord,
} = useEnfyraApi(() => `/${targetTable?.name}`, {
  method: "post",
  errorContext: "Create Relation Record",
});

const createForm = ref(generateEmptyForm());
const createErrors = ref({});
const { isTablet } = useScreen();

watch(show, (val) => {
  if (val) {
    createForm.value = generateEmptyForm({
      excluded: [props.relationMeta.inversePropertyName],
    });
  }
});

async function createNewRecord() {
  if (!targetTable?.name) return;
  const { isValid, errors } = validate(createForm.value);
  if (!isValid) {
    createErrors.value = errors;
    return;
  }

  await createRecord({ body: createForm.value });
  emit("update:selected", [
    ...props.selected,
    { id: createData.value?.data[0]?.id },
  ]);
  emit("created");
  show.value = false;
}
</script>

<template>
  <Teleport to="body">
    <UDrawer
      v-model:open="show"
      direction="right"
      :class="isTablet ? 'w-full' : 'min-w-xl'"
    >
      <template #header>
        <div
          class="bg-gradient-to-r from-background/90 to-muted/20 rounded-t-xl"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg"
              >
                <UIcon name="lucide:plus" class="text-sm text-white" />
              </div>
              <div>
                <h2 class="text-xl font-semibold text-foreground">
                  Create New Record
                </h2>
                <p class="text-sm text-muted-foreground">
                  {{ targetTable?.name }} table
                </p>
              </div>
            </div>
            <UButton
              icon="lucide:x"
              @click="show = false"
              variant="ghost"
              color="neutral"
              size="lg"
              class="lg:hover:bg-error/10 lg:hover:text-error transition-colors duration-200"
            />
          </div>
        </div>
      </template>
      <template #body>
        <div class="space-y-6">
          <!-- Form Section -->
          <div class="bg-gray-800/50 rounded-xl border border-muted/30 p-6">
            <div class="flex items-center gap-2 mb-4">
              <UIcon name="lucide:edit-3" class="text-info" size="18" />
              <h3 class="text-lg font-semibold text-foreground">Form Fields</h3>
            </div>
            <FormEditorLazy
              v-model="createForm"
              :table-name="targetTable?.name"
              :errors="createErrors"
            />
          </div>

          <!-- Actions Section -->
          <div class="bg-gray-800/50 rounded-xl border border-muted/30 p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon
                  name="lucide:info"
                  class="text-muted-foreground"
                  size="16"
                />
                <span class="text-sm text-muted-foreground"
                  >Ready to create new record?</span
                >
              </div>
              <div class="flex gap-3">
                <UButton
                  variant="ghost"
                  color="neutral"
                  @click="show = false"
                  :disabled="creating"
                >
                  Cancel
                </UButton>
                <UButton
                  icon="lucide:plus"
                  @click="createNewRecord"
                  :loading="creating"
                >
                  Create Record
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UDrawer>
  </Teleport>
</template>
