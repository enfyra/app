export const EXTENSION_RUNTIME_FIELDS = [
  "id",
  "type",
  "name",
  "extensionId",
  "version",
  "isEnabled",
  "compiledCode",
  "updatedAt",
].join(",");

export const EXTENSION_MENU_METADATA_FIELDS = [
  "id",
  "type",
  "name",
  "extensionId",
  "version",
  "isEnabled",
  "description",
  "updatedAt",
].join(",");

export const EXTENSION_LIST_FIELDS = [
  "id",
  "type",
  "name",
  "extensionId",
  "version",
  "isEnabled",
  "isSystem",
  "description",
  "menu.*",
  "createdAt",
  "updatedAt",
].join(",");

export const EXTENSION_EDITOR_FIELDS = [
  "id",
  "type",
  "name",
  "extensionId",
  "version",
  "isEnabled",
  "isSystem",
  "description",
  "code",
  "menu.*",
  "createdBy.*",
  "updatedBy.*",
  "createdAt",
  "updatedAt",
].join(",");

export function prefixFields(prefix: string, fields: string): string {
  return fields
    .split(",")
    .map((field) => `${prefix}.${field}`)
    .join(",");
}
