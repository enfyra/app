import type {
  WebsocketEventDataShapeField,
  WebsocketEventDataShapeToken,
  WebsocketEventDataShapeType,
} from '../types/websocket-event-data-shape';

const FIELD_TYPES: Array<{
  label: string;
  value: WebsocketEventDataShapeType;
}> = [
  { label: 'String', value: 'string' },
  { label: 'Number', value: 'number' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Date', value: 'date' },
  { label: 'Object', value: 'object' },
  { label: 'Array', value: 'array' },
  { label: 'Any', value: 'any' },
];

const ARRAY_ITEM_TYPES = FIELD_TYPES.filter((item) => item.value !== 'array');

export function getWebsocketEventDataShapeTypeItems() {
  return FIELD_TYPES;
}

export function getWebsocketEventArrayItemTypeItems() {
  return ARRAY_ITEM_TYPES;
}

export function createWebsocketEventDataShapeField(
  overrides: Partial<WebsocketEventDataShapeField> = {},
): WebsocketEventDataShapeField {
  return {
    id: createWebsocketDataShapeId(),
    name: '',
    type: 'string',
    required: false,
    ...overrides,
  };
}

export function createWebsocketDataShapeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `ws_data_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeWebsocketEventDataShape(
  value: unknown,
): WebsocketEventDataShapeField[] {
  if (!Array.isArray(value)) return [];
  return value.map((field) => normalizeField(field)).filter(Boolean);
}

export function flattenWebsocketEventDataShapeTokens(
  fields: WebsocketEventDataShapeField[],
): WebsocketEventDataShapeToken[] {
  const tokens: WebsocketEventDataShapeToken[] = [];
  const walk = (items: WebsocketEventDataShapeField[], prefix: string) => {
    for (const field of items) {
      if (!field.name) continue;
      const path = prefix ? `${prefix}.${field.name}` : field.name;
      tokens.push({
        label: path,
        value: `{{ data.${path} }}`,
        type: field.type,
      });
      if (field.type === 'object' && field.children?.length) {
        walk(field.children, path);
      }
      if (
        field.type === 'array' &&
        field.itemType === 'object' &&
        field.children?.length
      ) {
        walk(field.children, `${path}[]`);
      }
    }
  };
  walk(fields, '');
  return tokens;
}

export function buildWebsocketEventDataShapeSample(
  fields: WebsocketEventDataShapeField[],
) {
  const sample: Record<string, unknown> = {};
  for (const field of fields) {
    if (!field.name) continue;
    sample[field.name] = sampleValue(field);
  }
  return sample;
}

function normalizeField(value: any): WebsocketEventDataShapeField {
  const type = isShapeType(value?.type) ? value.type : 'string';
  const itemType =
    type === 'array' && isArrayItemType(value?.itemType)
      ? value.itemType
      : 'string';
  return {
    id: typeof value?.id === 'string' ? value.id : createWebsocketDataShapeId(),
    name: typeof value?.name === 'string' ? value.name : '',
    type,
    required: Boolean(value?.required),
    itemType,
    children: Array.isArray(value?.children)
      ? value.children.map((child: any) => normalizeField(child))
      : [],
  };
}

function sampleValue(field: WebsocketEventDataShapeField): unknown {
  switch (field.type) {
    case 'number':
      return 123;
    case 'boolean':
      return true;
    case 'date':
      return new Date(0).toISOString();
    case 'object':
      return buildWebsocketEventDataShapeSample(field.children || []);
    case 'array':
      if (field.itemType === 'object') {
        return [buildWebsocketEventDataShapeSample(field.children || [])];
      }
      return [sampleValue({ ...field, type: field.itemType || 'string' })];
    case 'any':
      return null;
    default:
      return field.name ? `${field.name}_value` : 'value';
  }
}

function isShapeType(value: unknown): value is WebsocketEventDataShapeType {
  return FIELD_TYPES.some((item) => item.value === value);
}

function isArrayItemType(
  value: unknown,
): value is Exclude<WebsocketEventDataShapeType, 'array'> {
  return ARRAY_ITEM_TYPES.some((item) => item.value === value);
}
