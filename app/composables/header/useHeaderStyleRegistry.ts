import { ref, computed } from "vue";

/**
 * Header Style Configuration
 */
export interface HeaderStyleConfig {
  // Container styles
  background?: string;
  borderColor?: string;
  borderWidth?: string;

  // Positioning
  position?: "sticky" | "fixed" | "relative" | "static";
  top?: string;
  zIndex?: number;

  // Effects
  backdropBlur?: boolean;
  backdropBlurAmount?: string;
  shadow?: string;

  // Spacing
  paddingX?: string;
  paddingY?: string;

  // Accent line (gradient line on top of header)
  accentLine?: {
    enabled: boolean;
    gradient?: string;
    height?: string;
    position?: "top" | "bottom";
  };

  // Custom classes
  containerClass?: string;
  contentClass?: string;
}

/**
 * Default header style matching Figma design
 */
const defaultHeaderStyle: HeaderStyleConfig = {
  // Container
  background: "rgba(21, 27, 46, 0.8)",
  borderColor: "var(--border-subtle)",
  borderWidth: "1px",

  // Positioning
  position: "sticky",
  top: "0",
  zIndex: 40,

  // Effects
  backdropBlur: true,
  backdropBlurAmount: "20px",
  shadow: "0 4px 16px rgba(0, 0, 0, 0.2)",

  // Spacing - Match sidebar logo section (h-16 = 64px total height)
  paddingX: "1.5rem", // px-6
  paddingY: "1rem", // Match logo section vertical spacing

  // Accent line
  accentLine: {
    enabled: true,
    gradient: "linear-gradient(90deg, transparent 0%, rgba(124, 58, 237, 0.4) 50%, transparent 100%)",
    height: "1px",
    position: "top",
  },

  // Classes
  containerClass: "flex-shrink-0 relative overflow-hidden",
  contentClass: "flex items-center justify-between gap-4",
};

/**
 * Header style registry state
 */
const headerStyleConfig = ref<HeaderStyleConfig>({ ...defaultHeaderStyle });

/**
 * Composable for managing header styles
 */
export const useHeaderStyleRegistry = () => {
  /**
   * Update header style configuration
   */
  const updateHeaderStyle = (config: Partial<HeaderStyleConfig>) => {
    headerStyleConfig.value = {
      ...headerStyleConfig.value,
      ...config,
    };
  };

  /**
   * Reset header style to default
   */
  const resetHeaderStyle = () => {
    headerStyleConfig.value = { ...defaultHeaderStyle };
  };

  /**
   * Get computed container style object
   */
  const containerStyle = computed(() => {
    const style: Record<string, string> = {};
    const config = headerStyleConfig.value;

    if (config.background) style.background = config.background;
    if (config.borderColor) style.borderColor = config.borderColor;
    if (config.top) style.top = config.top;
    if (config.zIndex !== undefined) style.zIndex = config.zIndex.toString();
    if (config.shadow) style.boxShadow = config.shadow;

    return style;
  });

  /**
   * Get computed container classes
   */
  const containerClasses = computed(() => {
    const classes: string[] = [];
    const config = headerStyleConfig.value;

    // Position
    if (config.position === "sticky") classes.push("sticky");
    else if (config.position === "fixed") classes.push("fixed");
    else if (config.position === "relative") classes.push("relative");

    // Border
    if (config.borderWidth) classes.push("border-b");

    // Backdrop blur
    if (config.backdropBlur) {
      classes.push("backdrop-blur-xl");
    }

    // Custom classes
    if (config.containerClass) classes.push(config.containerClass);

    return classes;
  });

  /**
   * Get computed content classes
   */
  const contentClasses = computed(() => {
    const config = headerStyleConfig.value;
    return config.contentClass || "";
  });

  /**
   * Get computed content style (padding)
   */
  const contentStyle = computed(() => {
    const style: Record<string, string> = {};
    const config = headerStyleConfig.value;

    if (config.paddingX) style.paddingLeft = style.paddingRight = config.paddingX;
    if (config.paddingY) style.paddingTop = style.paddingBottom = config.paddingY;

    return style;
  });

  /**
   * Get accent line config
   */
  const accentLineConfig = computed(() => headerStyleConfig.value.accentLine);

  return {
    // State
    headerStyleConfig: readonly(headerStyleConfig),

    // Actions
    updateHeaderStyle,
    resetHeaderStyle,

    // Computed
    containerStyle,
    containerClasses,
    contentStyle,
    contentClasses,
    accentLineConfig,
  };
};
