import type { EnfyraConfig } from "./enfyra.config.types";

export const enfyraConfig: EnfyraConfig = {
  richText: {
    plugins: ['link', 'lists', 'code', 'table'],
    toolbar: 'undo redo | bold italic underline | codeinline | codeblock | bullist numlist | link table | code ',
    customButtons: [
      {
        name: 'codeinline',
        text: 'Highlight',
        tooltip: 'Inline code',
        format: 'code',
      },
      {
        name: 'codeblock',
        text: 'Code Block',
        tooltip: 'Code block (pre)',
        format: 'pre',
      },
    ],
    formats: {
      code: {
        inline: 'code',
        css: (theme: 'light' | 'dark') => ({
          backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f4f4f4',
          color: theme === 'dark' ? '#f8f8f2' : '#333',
          padding: '2px 4px',
          borderRadius: '3px',
          fontFamily: 'monospace',
        }),
      },
      pre: {
        block: 'pre',
        css: (theme: 'light' | 'dark') => ({
          backgroundColor: theme === 'dark' ? '#1e1e1e' : '#f5f5f5',
          padding: '12px',
          borderRadius: '4px',
          overflow: 'auto',
          fontFamily: 'monospace',
          whiteSpace: 'pre',
        }),
      },
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
  },
};

