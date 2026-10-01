import type { FormEditorSection } from '~/types/form-editor'
import type { RouteMethodConfigFormOptions } from '~/types/route-method-config'

export const routeMethodConfigSections: FormEditorSection[] = [
  { id: 'access', title: 'Access', fields: ['available', 'isPublic', 'skipRoleGuard'] },
  { id: 'execution', title: 'Execution', fields: ['timeout', 'description'] },
  { id: 'request-body', title: 'Request body', fields: ['requestBodyType'] },
]

export function getRouteMethodConfigFieldMap(options: RouteMethodConfigFormOptions) {
  return {
    available: { type: 'boolean', label: 'Enable method', disabled: options.readonly },
    isPublic: {
      type: 'boolean',
      label: 'Public access',
      disabled: options.readonly || !options.available,
    },
    skipRoleGuard: {
      type: 'boolean',
      label: 'Skip role guard',
      disabled: options.readonly || !options.available || options.isPublic,
    },
    timeout: {
      type: 'number',
      label: 'Timeout (ms)',
      disabled: options.readonly,
      componentProps: { min: 1, step: 1 },
    },
    description: { type: 'text', label: 'Description', disabled: options.readonly, placeholder: 'Add a description' },
    requestBodyType: {
      type: 'enum',
      label: 'Content type',
      disabled: options.readonly,
      options: [
        { label: 'None', value: 'none' },
        { label: 'JSON', value: 'json' },
        { label: 'URL-encoded', value: 'urlencoded' },
        { label: 'Multipart', value: 'multipart', disabled: !options.multipartAllowed },
        { label: 'Raw', value: 'raw' },
      ],
    },
    maxUploadFileSize: {
      type: 'int',
      label: 'Maximum file size (MB)',
      disabled: options.readonly,
      placeholder: 'Server limit',
      componentProps: { min: 1, step: 1 },
    },
    maxFiles: {
      type: 'int',
      label: 'Maximum files',
      disabled: options.readonly,
      placeholder: 'Total of field limits',
      componentProps: { min: 1, step: 1 },
    },
  }
}

export function getRouteMethodFileFieldMap(readonly: boolean) {
  return {
    name: { label: 'Field name', disabled: readonly, placeholder: 'file' },
    maxCount: { type: 'number', label: 'Maximum files', disabled: readonly, componentProps: { min: 1, step: 1 } },
    maxFileSize: { type: 'int', label: 'Per-file size (MB)', disabled: readonly, placeholder: 'Method limit', componentProps: { min: 1, step: 1 } },
    allowedMimeTypes: { type: 'array-tags', label: 'Allowed MIME types', disabled: readonly, placeholder: 'image/png, application/pdf' },
    required: { type: 'boolean', label: 'Required field', disabled: readonly },
  }
}
