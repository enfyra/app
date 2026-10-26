<script setup lang="ts">
import type { BadgeProps, TabsItem } from '@nuxt/ui';
import type { PanelSection } from '~/types/ui';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<{
  modelValue?: string | number;
  sections?: PanelSection[];
  unmountOnHide?: boolean;
  framed?: boolean;
  bodyClass?: string;
}>(), {
  sections: () => [],
  unmountOnHide: false,
  framed: true,
  bodyClass: '',
});

const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>();
const slots = useSlots();
const tabHeaderUi = { list: 'border-b-0 mb-0 shadow-none', indicator: '!bottom-0' };

const normalizedSections = computed(() => props.sections.map(section => ({
  ...section,
  value: String(section.value),
})));
const showTabs = computed(() => normalizedSections.value.some(section => section.label || section.icon));
function panelBadge(badge: PanelSection['badge']): TabsItem['badge'] {
  if (!badge || typeof badge !== 'object') return badge;
  const colors = ['error', 'info', 'success', 'primary', 'secondary', 'warning', 'neutral'] as const;
  const variants = ['outline', 'solid', 'soft', 'subtle'] as const;
  const color = colors.find(item => item === badge.color);
  const variant = variants.find(item => item === badge.variant);
  return {
    ...(badge.label === undefined ? {} : { label: badge.label }),
    ...(color === undefined ? {} : { color }),
    ...(variant === undefined ? {} : { variant }),
  } satisfies BadgeProps;
}
const tabItems = computed<TabsItem[]>(() => normalizedSections.value.map(section => {
  const badge = panelBadge(section.badge);
  return {
    label: section.label || section.value,
    value: section.value,
    icon: section.icon,
    ...(badge === undefined ? {} : { badge }),
    ...(section.disabled === undefined ? {} : { disabled: section.disabled }),
    slot: section.value,
  };
}));
const selectedValue = computed(() => {
  const requested = props.modelValue == null ? '' : String(props.modelValue);
  return normalizedSections.value.some(section => section.value === requested)
    ? requested
    : normalizedSections.value[0]?.value;
});
const activeSection = computed(() => normalizedSections.value.find(section => section.value === selectedValue.value));

function sectionHeaderName(value: string) {
  return `${value}-header`;
}

function hasSectionHeader(value?: string) {
  return !!value && !!slots[sectionHeaderName(value)];
}

const activeHasHeader = computed(() =>
  hasSectionHeader(selectedValue.value)
  || !!activeSection.value?.title
  || !!activeSection.value?.description
  || !!activeSection.value?.actions?.length,
);

const sectionHeaderTitle = computed(() =>
  activeSection.value?.title || activeSection.value?.label || activeSection.value?.value,
);

const sectionActions = computed(() => activeSection.value?.actions ?? []);

const panelUi = computed(() => ({
  root: props.framed
    ? 'eapp-panel flex min-w-0 min-h-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-structural)] bg-default ring-0 divide-y-0 shadow-none'
    : 'eapp-panel flex min-w-0 min-h-0 flex-col rounded-none border-0 bg-transparent ring-0 divide-y-0 shadow-none',
  header: 'p-0 sm:p-0',
  body: ['min-w-0', props.bodyClass || (props.framed ? 'p-3 md:p-5' : '!px-0')].join(' '),
  footer: 'border-t border-[var(--border-structural)] px-3 py-3 text-sm text-muted md:px-4',
}));

function selectSection(value: string | number) {
  emit('update:modelValue', value);
}
</script>

<template>
  <UCard v-bind="$attrs" :ui="panelUi">
    <template v-if="showTabs || activeHasHeader" #header>
      <div v-if="showTabs" :class="framed ? 'eapp-panel-header-tier bg-[var(--surface-header)] shadow-[inset_0_-1px_0_var(--border-structural)]' : undefined">
        <UTheme :ui="{ tabs: tabHeaderUi }">
          <UTabs
            v-bind="selectedValue === undefined ? {} : { modelValue: selectedValue }"
            :items="tabItems"
            :content="false"
            variant="link"
            :ui="{
              root: 'gap-0',
              ...(props.framed ? {} : { content: '!mt-0 !p-0' }),
              list: ['min-w-0 overflow-x-auto overflow-y-hidden border-b-0 bg-transparent shadow-none', props.framed ? 'px-3 md:px-5' : 'px-0'].join(' '),
              indicator: '!bottom-0',
            }"
            @update:model-value="selectSection"
          />
        </UTheme>
      </div>
      <div
        v-if="activeHasHeader"
        :class="[
          'flex flex-wrap items-center gap-3 px-3 py-3 md:flex-nowrap md:px-5',
          framed && !showTabs ? 'eapp-panel-header-tier bg-[var(--surface-header)] shadow-[inset_0_-1px_0_var(--border-structural)]' : undefined,
          framed && showTabs ? 'border-b border-[var(--border-structural)]' : undefined,
        ]"
      >
        <div class="flex w-full min-w-0 flex-col gap-3 md:w-auto md:flex-1 md:flex-row md:flex-nowrap md:items-center">
          <div class="min-w-0 md:flex-1">
            <slot :name="sectionHeaderName(selectedValue || '')" :section="activeSection">
              <CommonFormHeader
                v-if="sectionHeaderTitle"
                :title="sectionHeaderTitle"
                :description="activeSection?.description"
                :icon="activeSection?.icon"
              />
            </slot>
          </div>
          <div
            v-if="sectionActions.length"
            class="-mx-3 h-0 shrink-0 border-t border-[var(--border-structural)] md:hidden"
            aria-hidden="true"
          />
          <div v-if="sectionActions.length" class="flex w-full min-w-0 items-center justify-end gap-3 md:w-auto md:contents">
            <CommonPanelSectionHeader :actions="sectionActions" side="left" />
            <CommonPanelSectionHeader :actions="sectionActions" side="right" />
          </div>
        </div>
      </div>
    </template>

    <template v-for="section in normalizedSections" :key="section.value">
      <div v-if="unmountOnHide ? section.value === selectedValue : true" v-show="section.value === selectedValue" class="space-y-4 md:space-y-6">
        <slot :name="section.value" :section="section" />
      </div>
    </template>
    <slot v-if="!normalizedSections.length" />

    <template v-if="slots.footer" #footer>
      <slot name="footer" :section="activeSection" />
    </template>
  </UCard>
</template>
