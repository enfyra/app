<script setup lang="ts">

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
const { getId, getIdFieldName } = useDatabase();
const targetTable = Object.values(schemas.value).find(
  (schema: any) => schema.id === props.relationMeta.targetTable.id
) as any;
const { generateEmptyForm, validate } = useSchema(targetTable?.name);

// Get the correct route for the target table
const { getRouteForTableId, ensureRoutesLoaded } = useRoutes();
const targetRoute = ref<string>('');

// Load routes and set target route
watchEffect(async () => {
  if (targetTable?.id) {
    await ensureRoutesLoaded();
    targetRoute.value = getRouteForTableId(targetTable.id);
  }
});

const {
  data: createData,
  pending: creating,
  execute: createRecord,
} = useApi(() => targetRoute.value || `/${targetTable?.name}`, {
  method: "post",
  errorContext: "Create Relation Record",
});

const createForm = ref(generateEmptyForm());
const createErrors = ref({});
const { isMobile, isTablet } = useScreen();

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
  const createdRecord = createData.value?.data[0];
  emit("update:selected", [
    ...props.selected,
    { [getIdFieldName()]: getId(createdRecord) },
  ]);
  emit("created");
  show.value = false;
}
</script>

<template>
  <Teleport to="body">
    <UDrawer
      :handle="false"
      handle-only
      v-model:open="show"
      direction="right"
      :class="(isMobile || isTablet) ? 'w-full max-w-full' : 'min-w-xl max-w-xl'"
    >
      <template #header>
        <div
          class="bg-gradient-to-r from-background/90 to-muted/20 rounded-t-xl"
        >
          <div class="flex items-center justify-between">
            <div :class="(isMobile || isTablet) ? 'flex items-center gap-2 min-w-0 flex-1' : 'flex items-center gap-3'">
              <div
                :class="(isMobile || isTablet) ? 'w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg flex-shrink-0' : 'w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg'"
              >
                <UIcon name="lucide:plus" :class="(isMobile || isTablet) ? 'text-xs text-white' : 'text-sm text-white'" />
              </div>
              <div class="min-w-0 flex-1">
                <h2 :class="(isMobile || isTablet) ? 'text-base font-semibold text-foreground truncate' : 'text-xl font-semibold text-foreground'">
                  Create New Record
                </h2>
                <p :class="(isMobile || isTablet) ? 'text-xs text-muted-foreground truncate' : 'text-sm text-muted-foreground'">
                  {{ targetTable?.name }} table
                </p>
              </div>
            </div>
            <UButton
              icon="lucide:x"
              @click="show = false"
              variant="soft"
              color="error"
              :size="(isMobile || isTablet) ? 'sm' : 'lg'"
              :class="(isMobile || isTablet) ? 'rounded-full !aspect-square flex-shrink-0' : 'lg:hover:bg-error/10 lg:hover:text-error transition-colors duration-200'"
            />
          </div>
        </div>
      </template>
      <template #body>
        <div :class="(isMobile || isTablet) ? 'space-y-3' : 'space-y-6'">
          <!-- Form Section -->
          <div :class="(isMobile || isTablet) ? 'bg-gray-800/50 rounded-lg border border-muted/30 p-3' : 'bg-gray-800/50 rounded-xl border border-muted/30 p-6'">
            <div :class="(isMobile || isTablet) ? 'flex items-center gap-1.5 mb-3' : 'flex items-center gap-2 mb-4'">
              <UIcon name="lucide:edit-3" class="text-info" :size="(isMobile || isTablet) ? '16' : '18'" />
              <h3 :class="(isMobile || isTablet) ? 'text-sm font-semibold text-foreground' : 'text-lg font-semibold text-foreground'">Form Fields</h3>
            </div>
            <FormEditorLazy
              v-model="createForm"
              :table-name="targetTable?.name"
              :errors="createErrors"
            />
          </div>

          <!-- Actions Section -->
          <div :class="(isMobile || isTablet) ? 'bg-gray-800/50 rounded-lg border border-muted/30 p-3' : 'bg-gray-800/50 rounded-xl border border-muted/30 p-4'">
            <div class="flex items-center justify-between">
              <div v-if="!isMobile && !isTablet" class="flex items-center gap-2">
                <UIcon
                  name="lucide:info"
                  class="text-muted-foreground"
                  size="16"
                />
                <span class="text-sm text-muted-foreground"
                  >Ready to create new record?</span
                >
              </div>
              <div :class="(isMobile || isTablet) ? 'flex gap-1.5 w-full justify-end' : 'flex gap-3'">
                <UButton
                  variant="ghost"
                  color="neutral"
                  @click="show = false"
                  :disabled="creating"
                  :size="(isMobile || isTablet) ? 'sm' : 'md'"
                  :icon="(isMobile || isTablet) ? 'lucide:x' : undefined"
                  :class="(isMobile || isTablet) ? 'rounded-full !aspect-square' : ''"
                >
                  <span v-if="!isMobile && !isTablet">Cancel</span>
                </UButton>
                <UButton
                  icon="lucide:plus"
                  @click="createNewRecord"
                  :loading="creating"
                  :size="(isMobile || isTablet) ? 'sm' : 'md'"
                  :class="(isMobile || isTablet) ? 'rounded-full !aspect-square' : ''"
                >
                  <span v-if="!isMobile && !isTablet">Create Record</span>
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UDrawer>
  </Teleport>
</template>
