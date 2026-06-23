<template>
  <div
    :class="[
      'group surface-card-hover transition-all duration-300',
      clickable && !contentLoading ? 'cursor-pointer' : '',
      contentLoading ? 'pointer-events-none cursor-wait' : '',
      (isMobile || isTablet) ? 'p-3' : 'p-4'
    ]"
    :aria-busy="contentLoading"
    @click="handleClick"
  >
    <div class="flex items-start gap-2 md:gap-4">
      
      <div v-if="icon || avatar" class="flex-shrink-0">
        <div
          v-if="avatar"
          :class="[
            'rounded-full flex items-center justify-center',
            (isMobile || isTablet) ? 'w-10 h-10' : 'w-12 h-12',
            avatarClass
          ]"
        >
          <div v-if="contentLoading" class="h-1/2 w-1/2 rounded-[var(--radius-subcontrol)] skeleton-gradient skeleton-pulse-slow" />
          <UIcon v-else :name="avatar" :class="(isMobile || isTablet) ? 'w-5 h-5' : 'w-6 h-6 text-white'" />
        </div>
        <div
          v-else-if="icon && contentLoading"
          :class="[
            'flex-shrink-0 rounded-[var(--radius-control)] skeleton-gradient skeleton-pulse-slow',
            (isMobile || isTablet) ? 'w-6 h-6' : 'w-5 h-5',
          ]"
        />
        <UIcon
          v-else-if="icon"
          :name="icon"
          :class="[
            'flex-shrink-0',
            (isMobile || isTablet) ? 'w-6 h-6' : 'w-5 h-5',
            iconClass
          ]"
        />
      </div>

      <div class="flex-1 min-w-0">
        <div v-if="contentLoading" class="space-y-2">
          <div class="h-5 w-1/3 rounded skeleton-gradient skeleton-pulse-slow" />
          <div class="h-4 w-2/3 rounded skeleton-inline skeleton-pulse-slow" />
        </div>
        <slot v-else name="content">
          <div v-if="!contentLoading && (title || $slots.title)" class="flex items-center gap-2 mb-1.5 md:mb-2">
            <slot name="title">
              <h3 :class="(isMobile || isTablet) ? 'text-sm font-semibold text-[var(--text-primary)] truncate' : 'text-base font-semibold text-[var(--text-primary)]'">
                {{ title }}
              </h3>
            </slot>
            <slot name="badges" />
          </div>
          <slot v-if="!contentLoading" name="description">
            <p v-if="description" :class="(isMobile || isTablet) ? 'text-xs text-[var(--text-tertiary)]' : 'text-sm text-[var(--text-tertiary)]'">
              {{ description }}
            </p>
          </slot>
          <slot v-if="!contentLoading" name="metadata" />
        </slot>
      </div>

      <div v-if="$slots.actions && !contentLoading" class="flex items-center gap-2 flex-shrink-0">
        <slot name="actions" />
      </div>
    </div>

    <div v-if="$slots.footer && !contentLoading" class="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-[var(--border-default)]">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string;
  description?: string;
  icon?: string;
  avatar?: string;
  avatarClass?: string;
  iconClass?: string;
  clickable?: boolean;
  contentLoading?: boolean;
  onClick?: () => void;
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  description: undefined,
  icon: undefined,
  avatar: undefined,
  avatarClass: '',
  iconClass: '',
  clickable: true,
  contentLoading: false,
  onClick: undefined,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const { isMobile, isTablet } = useScreen();

const handleClick = (event: MouseEvent) => {
  if (!props.clickable) return;
  
  if (props.onClick) {
    props.onClick();
  }
  
  emit('click', event);
};
</script>
