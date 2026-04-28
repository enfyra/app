const ROUTE_HANDLER_BASE_EXCLUDED_FIELDS = ['createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'route'];
const ROUTE_HOOK_BASE_EXCLUDED_FIELDS = ['createdAt', 'updatedAt', 'route', 'isSystem'];

type RouteScriptValidateResult = {
  isValid: boolean;
  errors: Record<string, string>;
};

type RouteScriptValidate = (record: Record<string, any>) => RouteScriptValidateResult;

export function getRouteHandlerExcludedFields(lockMethod?: boolean): string[] {
  return lockMethod
    ? [...ROUTE_HANDLER_BASE_EXCLUDED_FIELDS, 'method']
    : [...ROUTE_HANDLER_BASE_EXCLUDED_FIELDS];
}

export function getRouteHookExcludedFields(lockMethod?: boolean): string[] {
  return lockMethod
    ? [...ROUTE_HOOK_BASE_EXCLUDED_FIELDS, 'methods']
    : [...ROUTE_HOOK_BASE_EXCLUDED_FIELDS];
}

export function getRouteHandlerSourceCodeFieldConfig(options: {
  routeId?: string;
  handlerId?: string | number | null;
  method?: any;
}) {
  return {
    description: 'Must return a value. Use @BODY, @QUERY, @PARAMS, @USER, #table_name, @HELPERS.',
    testRun: {
      tableName: 'route_handler_definition',
      payload: {
        routeId: options.routeId,
        handlerId: options.handlerId,
        method: options.method?.method ?? options.method,
      },
    },
  };
}

export function getRouteHookSourceCodeFieldConfig(options: {
  hookType: 'pre' | 'post';
  routeId?: string;
  hookId?: string | number | null;
}) {
  return {
    description: options.hookType === 'post'
      ? 'Do not return a value. Update @DATA or $ctx.$data instead.'
      : 'Return is optional. Use @BODY, @QUERY, @PARAMS, @USER, #table_name, @HELPERS.',
    testRun: {
      tableName: options.hookType === 'pre' ? 'pre_hook_definition' : 'post_hook_definition',
      payload: {
        routeId: options.routeId,
        hookId: options.hookId,
      },
    },
  };
}

export async function validateRouteHandlerForm(
  form: Record<string, any>,
  validate: RouteScriptValidate,
): Promise<RouteScriptValidateResult> {
  const { isValid, errors } = validate(form);
  const isReturnValid = await validateRouteHandlerReturn(form, errors);
  return {
    isValid: isValid && isReturnValid,
    errors,
  };
}

export async function validateRouteHookForm(
  form: Record<string, any>,
  validate: RouteScriptValidate,
  hookType: 'pre' | 'post',
): Promise<RouteScriptValidateResult> {
  const { isValid, errors } = validate(form);
  const isReturnValid = await validateHookReturnContract(form, errors, hookType);
  return {
    isValid: isValid && isReturnValid,
    errors,
  };
}
