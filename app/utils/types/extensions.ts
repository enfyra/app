export interface ExtensionDefinition {
  id?: number;
  _id?: string;
  code: string;
  compiledCode?: string;
  description: string | null;
  isEnabled: boolean;
  isSystem: boolean;
  name: string;
  type: string;
  version: string;
  menu?: {
    id?: number;
    _id?: string;
    label: string;
    path: string;
    icon: string;
    sidebar: {
      id?: number;
      _id?: string;
    };
  };
  extensionId?: string;
  createdBy?: {
    id?: string;
    _id?: string;
    email: string;
  };
  updatedBy?: {
    id?: string;
    _id?: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}