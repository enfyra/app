import { ref, computed } from "vue";

export interface HeaderStyleConfig {
  background?: string;
  borderColor?: string;
  borderWidth?: string;

  position?: "sticky" | "fixed" | "relative" | "static";
  top?: string;
  zIndex?: number;

  backdropBlur?: boolean;
  backdropBlurAmount?: string;
  shadow?: string;

  paddingX?: string;
  paddingY?: string;

  accentLine?: {
    enabled: boolean;
    gradient?: string;
    height?: string;
    position?: "top" | "bottom";
  };

  containerClass?: string;
  contentClass?: string;
}

const defaultHeaderStyle: HeaderStyleConfig = {
  background: "rgba(21, 27, 46, 0.5)",
  borderColor: "var(--border-subtle)",
  borderWidth: "1px",

  position: "sticky",
  top: "0",
  zIndex: 40,

  backdropBlur: true,
  backdropBlurAmount: "20px",
  shadow: "0 4px 16px rgba(0, 0, 0, 0.2)",

  paddingX: "1.5rem", 
  paddingY: "1rem", 

  accentLine: {
    enabled: true,
    gradient: "linear-gradient(90deg, transparent 0%, rgba(124, 58, 237, 0.4) 50%, transparent 100%)",
    height: "1px",
    position: "top",
  },

  containerClass: "flex-shrink-0 relative overflow-hidden",
  contentClass: "flex items-center justify-between gap-4",
};

const headerStyleConfig = ref<HeaderStyleConfig>({ ...defaultHeaderStyle });

export const useHeaderStyleRegistry = () => {
  
  const { isMobile, isTablet } = useScreen();

  const updateHeaderStyle = (config: Partial<HeaderStyleConfig>) => {
    headerStyleConfig.value = {
      ...headerStyleConfig.value,
      ...config,
    };
  };

  const resetHeaderStyle = () => {
    headerStyleConfig.value = { ...defaultHeaderStyle };
  };

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

  const containerClasses = computed(() => {
    const classes: string[] = [];
    const config = headerStyleConfig.value;

    if (config.position === "sticky") classes.push("sticky");
    else if (config.position === "fixed") classes.push("fixed");
    else if (config.position === "relative") classes.push("relative");

    if (config.borderWidth) classes.push("border-b");

    if (config.backdropBlur) {
      classes.push("backdrop-blur-xl");
    }

    if (config.containerClass) classes.push(config.containerClass);

    return classes;
  });

  const contentClasses = computed(() => {
    const config = headerStyleConfig.value;
    return config.contentClass || "";
  });

  const contentStyle = computed(() => {
    const style: Record<string, string> = {};
    const config = headerStyleConfig.value;

    const responsivePaddingX = (isMobile.value || isTablet.value) ? '1rem' : (config.paddingX || '1.5rem');

    style.paddingLeft = style.paddingRight = responsivePaddingX;
    if (config.paddingY) style.paddingTop = style.paddingBottom = config.paddingY;

    return style;
  });

  const accentLineConfig = computed(() => headerStyleConfig.value.accentLine);

  return {
    headerStyleConfig: readonly(headerStyleConfig),

    updateHeaderStyle,
    resetHeaderStyle,

    containerStyle,
    containerClasses,
    contentStyle,
    contentClasses,
    accentLineConfig,
  };
};
