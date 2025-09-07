export interface ExtensionDefinition {
  id: number;
  code: string;
  compiledCode?: string;
  description: string | null;
  isEnabled: boolean;
  isSystem: boolean;
  name: string;
  type: string;
  version: string;
  menu?: {
    id: number;
    label: string;
    path: string;
    icon: string;
    sidebar: {
      id: number;
    };
  };
  extensionId?: string;
  createdBy?: {
    id: string;
    email: string;
  };
  updatedBy?: {
    id: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}