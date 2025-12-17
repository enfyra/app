<script setup lang="ts">
declare global {
  interface Window {
    tinymce: any;
  }
}
import { ensureString } from "../../utils/components/form";
import { enfyraConfig } from "../../../enfyra.config";
import type { RichTextEditorConfig } from "../../../enfyra.config.types";

const props = defineProps<{
  modelValue: string | null;
  disabled?: boolean;
  height?: number;
  // Optional per-field rich text config (from column.metadata.richText)
  editorConfig?: RichTextEditorConfig;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: string): void;
}>();

const textareaId = `tinymce-${Math.random().toString(36).slice(2)}`;
const editorRef = ref<any>(null);
const containerRef = ref<HTMLDivElement>();
const resizeHandleRef = ref<HTMLDivElement>();
const previewLayerRef = ref<HTMLDivElement>();
const isFocused = ref(false);
const previewHeight = ref<string | null>(null);
const previewStyle = ref<{ top: string; left: string; width: string; height: string } | null>(null);
const mutationObserverRef = ref<MutationObserver | null>(null);
const iframeLoadHandlerRef = ref<(() => void) | null>(null);

const initialHeight = props.height ?? 300;
const currentHeight = ref(`${initialHeight}px`);
const minHeight = computed(() => initialHeight);
const isResizing = ref(false);
const startY = ref(0);
const startHeight = ref(0);

const isLoading = ref(true);
const isError = ref(false);

const effectiveConfig = computed<RichTextEditorConfig>(() => {
  const base = enfyraConfig.richText || {};
  const override = props.editorConfig || {};

  const baseButtons = base.customButtons || [];
  const overrideButtons = override.customButtons || [];

  const mergedButtonsMap: Record<string, any> = {};
  for (const btn of baseButtons) {
    mergedButtonsMap[btn.name] = btn;
  }
  for (const btn of overrideButtons) {
    mergedButtonsMap[btn.name] = btn;
  }

  const mergedButtons =
    overrideButtons.length > 0 ? Object.values(mergedButtonsMap) : baseButtons;

  return {
    ...base,
    ...override,
    plugins: override.plugins ?? base.plugins,
    toolbar: override.toolbar ?? base.toolbar,
    customButtons: mergedButtons,
    formats: {
      ...(base.formats || {}),
      ...(override.formats || {}),
    },
    buttonActions: {
      ...(base.buttonActions || {}),
      ...(override.buttonActions || {}),
    },
  };
});

function loadTinyMCE(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.tinymce) {
      isLoading.value = false;
      return resolve();
    }

    const s = document.createElement("script");
    s.src = "/tinymce/tinymce.min.js";
    s.onload = () => {
      isLoading.value = false;
      resolve();
    };
    s.onerror = () => {
      isLoading.value = false;
      isError.value = true;
      reject(new Error("TinyMCE load failed"));
    };
    document.head.appendChild(s);
  });
}

function handleMouseDown(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  isResizing.value = true;
  startY.value = e.clientY;
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect();
    startHeight.value = rect.height;
    
    previewStyle.value = {
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`
    };
  }
  
  document.addEventListener("mousemove", handleMouseMove, { passive: false });
  document.addEventListener("mouseup", handleMouseUp, { passive: false });
  document.addEventListener("mouseleave", handleMouseUp, { passive: false });
  
  if (resizeHandleRef.value) {
    resizeHandleRef.value.style.userSelect = "none";
  }
  
  if (editorRef.value) {
    const container = editorRef.value.getContainer();
    if (container) {
      container.style.pointerEvents = "none";
    }
  }
  
  if (containerRef.value) {
    containerRef.value.style.pointerEvents = "none";
  }
  
  document.body.style.userSelect = "none";
  document.body.style.cursor = "ns-resize";
}

function handleMouseMove(e: MouseEvent) {
  if (!isResizing.value || !containerRef.value) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  const deltaY = e.clientY - startY.value;
  const newHeight = Math.max(minHeight.value, startHeight.value + deltaY);
  const heightStr = `${newHeight}px`;
  
  const rect = containerRef.value.getBoundingClientRect();
  previewStyle.value = {
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: heightStr
  };
  
  previewHeight.value = heightStr;
}

function handleMouseUp(e?: MouseEvent) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  if (!containerRef.value) return;
  
  const finalHeight = previewHeight.value || currentHeight.value;
  isResizing.value = false;
  previewHeight.value = null;
  previewStyle.value = null;
  
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
  document.removeEventListener("mouseleave", handleMouseUp);
  
  if (resizeHandleRef.value) {
    resizeHandleRef.value.style.userSelect = "";
  }
  
  if (editorRef.value) {
    const container = editorRef.value.getContainer();
    if (container) {
      container.style.pointerEvents = "";
    }
  }
  
  if (containerRef.value) {
    containerRef.value.style.pointerEvents = "";
  }
  
  document.body.style.userSelect = "";
  document.body.style.cursor = "";
  
  currentHeight.value = finalHeight;
  
  if (containerRef.value) {
    containerRef.value.style.height = finalHeight;
  }
  
  nextTick(() => {
    if (editorRef.value) {
      const container = editorRef.value.getContainer();
      if (container) {
        container.style.height = finalHeight;
      }
      editorRef.value.fire('ResizeEditor');
    }
  });
}

const colorMode = useColorMode();

onMounted(async () => {
  try {
    await loadTinyMCE();

    const initTinyMCE = () => {
      const isDark = colorMode.value === 'dark';
      
      // Remove existing TinyMCE instance if it exists
      if (editorRef.value) {
        try {
          editorRef.value.destroy();
        } catch (e) {
          // Ignore if already destroyed
        }
        editorRef.value = null;
      }
      
      // Remove any existing TinyMCE instance for this selector using tinymce.remove()
      try {
        window.tinymce.remove(`#${textareaId}`);
      } catch (e) {
        // Ignore if doesn't exist
      }
      
      // Also try to remove by ID directly
      try {
        const existingEditor = window.tinymce.get(textareaId);
        if (existingEditor) {
          existingEditor.remove();
        }
      } catch (e) {
        // Ignore if doesn't exist
      }
      
      // Ensure textarea element exists and has a parentNode
      let textareaElement = document.getElementById(textareaId);
      if (!textareaElement && containerRef.value) {
        textareaElement = document.createElement('textarea');
        textareaElement.id = textareaId;
        containerRef.value.appendChild(textareaElement);
      }
      
      if (!textareaElement) {
        console.error('Textarea element not found for TinyMCE initialization');
        return;
      }
      
      // Ensure textarea has a parentNode (is in the DOM)
      if (!textareaElement.parentNode) {
        console.error('Textarea element has no parentNode');
        if (containerRef.value) {
          containerRef.value.appendChild(textareaElement);
        } else {
          return;
        }
      }
      
      window.tinymce.init({
      selector: `#${textareaId}`,
      skin_url: isDark ? "/tinymce/skins/ui/oxide-dark" : "/tinymce/skins/ui/oxide",
      content_css: isDark ? "/tinymce/skins/content/dark/content.css" : "/tinymce/skins/content/default/content.css",
      content_style: `
        body {
          color: ${isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgb(31, 41, 55)'} !important;
        }
      `,
      icons_url: "/tinymce/icons/default/icons.min.js",
      plugins: effectiveConfig.value.plugins,
      skin: isDark ? "oxide-dark" : "oxide",
      external_plugins: {
        link: "/tinymce/plugins/link/plugin.min.js",
        lists: "/tinymce/plugins/lists/plugin.min.js",
        code: "/tinymce/plugins/code/plugin.min.js",
        table: "/tinymce/plugins/table/plugin.min.js",
      },
      toolbar: effectiveConfig.value.toolbar,
      menubar: false,
      height: initialHeight,
      resize: false,
      readonly: props.disabled ?? false,
      license_key: "gpl",
      formats: (() => {
        const formats = effectiveConfig.value.formats;
        if (!formats) return undefined;
        
        const processedFormats: any = {};
        const theme = colorMode.value as 'light' | 'dark';
        
        Object.keys(formats).forEach((key) => {
          const format = formats[key];
          if (!format) return;
          
          processedFormats[key] = {};
          
          if (format.block !== undefined) {
            processedFormats[key].block = format.block === true ? key : (typeof format.block === 'string' ? format.block : key);
          } else if (format.wrapper !== undefined) {
            processedFormats[key].wrapper = format.wrapper === true ? key : (typeof format.wrapper === 'string' ? format.wrapper : key);
          } else if (format.inline !== undefined) {
            processedFormats[key].inline = format.inline === true ? key : (typeof format.inline === 'string' ? format.inline : key);
          } else {
            processedFormats[key].inline = key;
          }
          
          if (format.classes) {
            if (typeof format.classes === 'function') {
              const classes = format.classes(theme);
              processedFormats[key].classes = Array.isArray(classes) ? classes : [classes];
            } else {
              processedFormats[key].classes = Array.isArray(format.classes) ? format.classes : [format.classes];
            }
          }
          
          if (format.attributes) {
            processedFormats[key].attributes = format.attributes;
          }
        });
        
        return processedFormats;
      })(),
      setup(editor: any) {
        editorRef.value = editor;

        const customButtons = effectiveConfig.value.customButtons || [];
        const buttonActions = effectiveConfig.value.buttonActions || {};
        
        customButtons.forEach((buttonConfig) => {
          const { name, text, tooltip, format, onAction, params } = buttonConfig;
          
          let buttonOnAction: any;
          
          if (format) {
            buttonOnAction = function() {
              editor.execCommand('mceToggleFormat', false, format);
            };
          } else if (onAction) {
            if (typeof onAction === 'function') {
              buttonOnAction = onAction;
            } else if (typeof onAction === 'string') {
              buttonOnAction = function() {
                editor.execCommand(onAction, false, ...(params || []));
              };
            }
          } else {
            buttonOnAction = function() {};
          }
          
          editor.ui.registry.addButton(name, {
            text: text || name,
            tooltip: tooltip || text || name,
            onAction: buttonOnAction,
          });
        });

        editor.on("init", () => {
          try {
            editor.setContent(ensureString(props.modelValue));
          } catch (e) {
            console.error('Error setting content on init:', e);
          }
          if (containerRef.value) {
            containerRef.value.style.height = currentHeight.value;
          }
          
          const updateContentStyle = () => {
            if (!editorRef.value || !editor) return;
            
            try {
              const container = editor.getContentAreaContainer();
              if (!container) return;
              
              const iframe = container.querySelector('iframe');
              if (iframe) {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                if (iframeDoc) {
                  const isDark = colorMode.value === 'dark';
                  const tinymceBody = iframeDoc.getElementById('tinymce');
                  
                  if (tinymceBody) {
                    tinymceBody.style.color = isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgb(31, 41, 55)';
                    
                    const existingStyle = iframeDoc.getElementById('custom-content-style');
                    if (existingStyle) {
                      existingStyle.remove();
                    }
                    
                    const formats = effectiveConfig.value.formats;
                    let formatCss = '';
                    if (formats) {
                      const theme = colorMode.value as 'light' | 'dark';
                      Object.keys(formats).forEach((key) => {
                        const format = formats[key];
                        if (!format) return;
                        
                        let tagName = key;
                        if (format.block !== undefined) {
                          tagName = format.block === true ? key : (typeof format.block === 'string' ? format.block : key);
                        } else if (format.wrapper !== undefined) {
                          tagName = format.wrapper === true ? key : (typeof format.wrapper === 'string' ? format.wrapper : key);
                        } else if (format.inline !== undefined) {
                          tagName = format.inline === true ? key : (typeof format.inline === 'string' ? format.inline : key);
                        }
                        
                        if (format.css) {
                          const cssObj = typeof format.css === 'function' ? format.css(theme) : format.css;
                          const cssRules = Object.entries(cssObj)
                            .map(([prop, value]) => {
                              const kebabProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
                              return `${kebabProp}: ${value}`;
                            })
                            .join('; ');
                          
                          formatCss += `#tinymce ${tagName} { ${cssRules}; }\n`;
                        }
                        
                        if (format.classStyles) {
                          Object.keys(format.classStyles).forEach((className) => {
                            const classStyle = format.classStyles?.[className];
                            if (!classStyle) return;
                            
                            const cssObj = typeof classStyle === 'function' ? classStyle(theme) : classStyle;
                            const cssRules = Object.entries(cssObj)
                              .map(([prop, value]) => {
                                const kebabProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
                                return `${kebabProp}: ${value}`;
                              })
                              .join('; ');
                            
                            formatCss += `#tinymce ${tagName}.${className} { ${cssRules}; }\n`;
                          });
                        }
                      });
                    }
                    
                    const style = iframeDoc.createElement('style');
                    style.id = 'custom-content-style';
                    style.textContent = `
                      #tinymce {
                        color: ${isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgb(31, 41, 55)'} !important;
                      }
                      #tinymce * {
                        color: ${isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgb(31, 41, 55)'} !important;
                      }
                      ${formatCss}
                    `;
                    iframeDoc.head.appendChild(style);
                  }
                }
              }
            } catch (error) {
              // Editor may have been destroyed, ignore
            }
          };
          
          nextTick(() => {
            updateContentStyle();
            
            try {
              const container = editor.getContentAreaContainer();
              if (!container) return;
              
              const iframe = container.querySelector('iframe');
              if (iframe) {
                const loadHandler = () => updateContentStyle();
                iframe.addEventListener('load', loadHandler);
                iframeLoadHandlerRef.value = loadHandler;
                
                const observer = new MutationObserver(() => {
                  updateContentStyle();
                });
                observer.observe(document.documentElement, {
                  attributes: true,
                  attributeFilter: ['class']
                });
                mutationObserverRef.value = observer;
              }
            } catch (error) {
              // Editor may have been destroyed, ignore
            }
          });
        });

        editor.on("Change KeyUp Undo Redo", () => {
          emit("update:modelValue", editor.getContent());
        });

        editor.on("focus", () => {
          isFocused.value = true;
        });

        editor.on("blur", () => {
          isFocused.value = false;
        });
      },
    });
    };
    
    initTinyMCE();
    
    // Watch for theme changes and reinitialize editor
    watch(() => colorMode.value, async () => {
      if (editorRef.value) {
        const currentContent = editorRef.value.getContent();
        try {
          // Save textarea element reference before destroying
          const textareaElement = document.getElementById(textareaId);
          const textareaParent = textareaElement?.parentNode;
          
          // Cleanup observers and listeners before destroying
          if (mutationObserverRef.value) {
            mutationObserverRef.value.disconnect();
            mutationObserverRef.value = null;
          }
          
          if (editorRef.value && iframeLoadHandlerRef.value) {
            try {
              const container = editorRef.value.getContentAreaContainer();
              if (container) {
                const iframe = container.querySelector('iframe');
                if (iframe) {
                  iframe.removeEventListener('load', iframeLoadHandlerRef.value);
                }
              }
            } catch (e) {
              // Ignore if already destroyed
            }
            iframeLoadHandlerRef.value = null;
          }
          
          // Remove TinyMCE instance using tinymce.remove() first
          try {
            window.tinymce.remove(`#${textareaId}`);
          } catch (e) {
            // Ignore if doesn't exist
          }
          
          // Also try to remove by ID directly
          try {
            const existingEditor = window.tinymce.get(textareaId);
            if (existingEditor) {
              existingEditor.remove();
            }
          } catch (e) {
            // Ignore if doesn't exist
          }
          
          try {
            editorRef.value.destroy();
          } catch (e) {
            // Ignore if already destroyed
          }
          editorRef.value = null;
          
          // Ensure textarea element still exists in DOM after destroy
          await nextTick();
          let textareaAfterDestroy = document.getElementById(textareaId);
          if (!textareaAfterDestroy && textareaParent && containerRef.value) {
            // Recreate textarea if it was removed
            const newTextarea = document.createElement('textarea');
            newTextarea.id = textareaId;
            containerRef.value.appendChild(newTextarea);
          }
          
          // Wait longer for DOM cleanup to complete
          await new Promise(resolve => setTimeout(resolve, 200));
          initTinyMCE();
          await nextTick();
          await new Promise(resolve => setTimeout(resolve, 100));
          if (editorRef.value) {
            editorRef.value.setContent(currentContent);
          }
        } catch (error) {
          console.error("Error reinitializing TinyMCE on theme change:", error);
        }
      }
    });
  } catch (error) {}
});

watch(
  () => props.modelValue,
  (v) => {
    if (editorRef.value && v !== editorRef.value.getContent()) {
      editorRef.value.setContent(ensureString(v));
    }
  }
);

watch(
  () => props.height,
  (newHeight) => {
    if (newHeight && !isResizing.value) {
      const heightStr = `${newHeight}px`;
      currentHeight.value = heightStr;
      if (containerRef.value) {
        containerRef.value.style.height = heightStr;
      }
      nextTick(() => {
        if (editorRef.value) {
          const container = editorRef.value.getContainer();
          if (container) {
            container.style.height = heightStr;
          }
          editorRef.value.fire('ResizeEditor');
        }
      });
    }
  }
);

onBeforeUnmount(() => {
  // Cleanup MutationObserver
  if (mutationObserverRef.value) {
    mutationObserverRef.value.disconnect();
    mutationObserverRef.value = null;
  }
  
  // Cleanup iframe event listener
  if (editorRef.value && iframeLoadHandlerRef.value) {
    try {
      const container = editorRef.value.getContentAreaContainer();
      if (container) {
        const iframe = container.querySelector('iframe');
        if (iframe) {
          iframe.removeEventListener('load', iframeLoadHandlerRef.value);
        }
      }
    } catch (e) {
      // Ignore if already destroyed
    }
    iframeLoadHandlerRef.value = null;
  }
  
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
  document.removeEventListener("mouseleave", handleMouseUp);
  document.body.style.userSelect = "";
  document.body.style.cursor = "";
  if (editorRef.value) {
    const container = editorRef.value.getContainer();
    if (container) {
      container.style.pointerEvents = "";
    }
    editorRef.value.destroy();
    editorRef.value = null;
  }
  if (containerRef.value) {
    containerRef.value.style.pointerEvents = "";
  }
});
</script>

<template>
  <div class="rich-text-editor">
    <!-- Loading State -->
    <div
      v-if="isLoading"
      class="flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700"
    >
      <div class="text-center">
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3"
        ></div>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Loading rich text editor...
        </p>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="isError"
      class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
    >
      <div class="flex">
        <div class="flex-shrink-0">
          <svg
            class="h-5 w-5 text-red-400 dark:text-red-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800 dark:text-red-300">
            Rich text editor failed to load
          </h3>
          <p class="text-sm text-red-700 dark:text-red-400 mt-1">
            Please refresh the page to try again.
          </p>
        </div>
      </div>
    </div>

    <!-- TinyMCE Editor with Resize Handle -->
    <div
      v-else
      ref="containerRef"
      class="rich-text-editor-container rounded-md overflow-hidden relative border transition-all duration-300"
      :class="[
        isFocused 
          ? 'border-0 ring-3 ring-primary' 
          : 'border-0',
        !isResizing ? 'transition-[height] duration-300 ease-out' : ''
      ]"
      :style="{ height: currentHeight, minHeight: `${minHeight}px` }"
    >
      <textarea :id="textareaId"></textarea>
      
      <!-- Preview Layer -->
      <Teleport to="body">
        <div
          v-if="isResizing && previewStyle"
          ref="previewLayerRef"
          class="fixed pointer-events-none z-50 border-2 border-dashed border-brand-500 dark:border-brand-400 bg-brand-500/5 rounded-md"
          :style="previewStyle"
        ></div>
      </Teleport>
      
      <div
        ref="resizeHandleRef"
        @mousedown="handleMouseDown"
        class="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-gray-600/50 dark:hover:bg-gray-500/50 transition-colors group z-50 select-none"
        :class="{ 'bg-gray-600/50 dark:bg-gray-500/50': isResizing }"
        style="touch-action: none; pointer-events: auto;"
      >
        <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
          <div class="w-12 h-0.5 bg-gray-500 dark:bg-gray-400 group-hover:bg-gray-400 dark:group-hover:bg-gray-300 rounded-full"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">

.tox .tox-edit-area::before {
  border: none !important;
}

.tox .tox-tinymce {
  border: none !important;
}

.tox .tox-tinymce--focus {
  outline: none !important;
}


.tox .tox-button {
  color: rgb(31, 41, 55) !important;
}

.dark .tox .tox-button {
  color: rgba(255, 255, 255, 0.9) !important;
}

.tox .tox-button:hover:not(:disabled) {
  background: rgb(249, 250, 251) !important;
}

.dark .tox .tox-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05) !important;
}

.tox .tox-button--enabled {
  color: rgb(31, 41, 55) !important;
}

.dark .tox .tox-button--enabled {
  color: rgba(255, 255, 255, 0.9) !important;
}

.tox .tox-button--active {
  background: rgb(249, 250, 251) !important;
  color: rgb(31, 41, 55) !important;
}

.dark .tox .tox-button--active {
  background: rgba(255, 255, 255, 0.1) !important;
  color: rgba(255, 255, 255, 0.9) !important;
}

.tox .tox-icon {
  color: rgb(31, 41, 55) !important;
}

.dark .tox .tox-icon {
  color: rgba(255, 255, 255, 0.9) !important;
}

.tox .tox-button--enabled .tox-icon {
  color: rgb(31, 41, 55) !important;
}

.dark .tox .tox-button--enabled .tox-icon {
  color: rgba(255, 255, 255, 0.9) !important;
}

.tox .tox-toolbar__group {
  border-right-color: rgb(209, 213, 219) !important;
}

.dark .tox .tox-toolbar__group {
  border-right-color: rgb(55, 65, 81) !important;
}

.tox .tox-statusbar {
  color: rgb(107, 114, 128) !important;
}

.dark .tox .tox-statusbar {
  color: rgba(255, 255, 255, 0.5) !important;
}

.tox .tox-statusbar__text-container {
  color: rgb(107, 114, 128) !important;
}

.dark .tox .tox-statusbar__text-container {
  color: rgba(255, 255, 255, 0.5) !important;
}

</style>
