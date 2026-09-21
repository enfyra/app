import type { FormEditorSection } from '~/types/form-editor';
import type { GuardTargetType } from '~/types/guard-template';

const commonGuardFilterFields = [
  'name',
  'description',
  'isEnabled',
  'position',
  'combinator',
  'priority',
  'createdAt',
  'updatedAt',
];

export function getGuardFilterFields(type: GuardTargetType): string[] {
  return type === 'graphql'
    ? [...commonGuardFilterFields, 'table', 'gqlOperation']
    : [...commonGuardFilterFields, 'isGlobal', 'route', 'methods', 'excludeRoutes'];
}

export const guardFormSections: FormEditorSection[] = [
  {
    id: 'details',
    title: 'Details',
    fields: ['name', 'description'],
  },
  {
    id: 'target',
    title: 'Target',
    fields: [
      'type',
      'isGlobal',
      'route',
      'methods',
      'excludeRoutes',
      'table',
      'gqlOperation',
    ],
  },
  {
    id: 'evaluation',
    title: 'Evaluation',
    fields: ['position', 'combinator', 'priority', 'isEnabled'],
  },
];

export function normalizeGuardTargetPayload<T extends Record<string, any>>(
  value: T,
): T {
  const body: Record<string, any> = { ...value };

  if (body.type === 'graphql') {
    body.route = null;
    body.methods = [];
    body.isGlobal = false;
    body.excludeRoutes = [];
    return body as T;
  }

  body.table = null;
  body.gqlOperation = null;
  if (body.isGlobal === true) {
    body.route = null;
    body.methods = [];
  } else {
    body.excludeRoutes = [];
  }
  return body as T;
}
