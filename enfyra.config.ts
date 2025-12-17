import type { EnfyraConfig } from "./enfyra.config.types";

export const enfyraConfig: EnfyraConfig = {
  richText: {
    plugins: ['link', 'lists', 'code', 'table'],
    
      // highlight: {
      //   classes: 'text-highlight',
      //   css: (theme: 'light' | 'dark') => ({
      //     backgroundColor: theme === 'dark' ? '#3d3d3d' : '#f0f0f0',
      //   }),
      //   classStyles: {
      //     'text-highlight': (theme: 'light' | 'dark') => ({
      //       backgroundColor: theme === 'dark' ? '#ffeb3b' : '#fff59d',
      //       color: theme === 'dark' ? '#000' : '#333',
      //       padding: '2px 6px',
      //       borderRadius: '4px',
      //     }),
      //   },
      // },
    },
};

