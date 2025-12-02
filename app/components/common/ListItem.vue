<template>
  <div
    :class="[
      'group bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-all duration-300',
      clickable ? 'cursor-pointer' : '',
      (isMobile || isTablet) ? 'p-3' : 'p-4'
    ]"
    @click="handleClick"
  >
    <div class="flex items-start gap-2 md:gap-4">
      <!-- Icon/Avatar -->
      <div v-if="icon || avatar" class="flex-shrink-0">
        <div
          v-if="avatar"
          :class="[
            'rounded-full flex items-center justify-center',
            (isMobile || isTablet) ? 'w-10 h-10' : 'w-12 h-12',
            avatarClass
          ]"
        >
          <UIcon :name="avatar" :class="(isMobile || isTablet) ? 'w-5 h-5' : 'w-6 h-6 text-white'" />
        </div>
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

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <slot name="content">
          <div v-if="title || $slots.title" class="flex items-center gap-2 mb-1.5 md:mb-2">
            <slot name="title">
              <h3 :class="(isMobile || isTablet) ? 'text-sm font-semibold text-gray-800 dark:text-white/90 truncate' : 'text-base font-semibold text-gray-800 dark:text-white/90'">
                {{ title }}
              </h3>
            </slot>
            <slot name="badges" />
          </div>
          <slot name="description">
            <p v-if="description" :class="(isMobile || isTablet) ? 'text-xs text-gray-500 dark:text-gray-400' : 'text-sm text-gray-500 dark:text-gray-400'">
              {{ description }}
            </p>
          </slot>
          <slot name="metadata" />
        </slot>
      </div>

      <!-- Actions -->
      <div v-if="$slots.actions" class="flex items-center gap-2 flex-shrink-0">
        <slot name="actions" />
      </div>
    </div>

    <!-- Footer -->
    <div v-if="$slots.footer" class="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-gray-200 dark:border-gray-800">
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

