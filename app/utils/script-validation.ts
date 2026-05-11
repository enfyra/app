import { normalizeScriptLanguage } from '~/utils/script-contract';

export async function validateRouteHandlerReturn(
  form: Record<string, any>,
  errors: Record<string, string>,
) {
  const sourceCode = String(form.sourceCode || '').trim();
  const { validateEnfyraRequiredReturnScript } = await import(
    '~/utils/editor/enfyraTypeScriptLinter'
  );
  const result = await validateEnfyraRequiredReturnScript(
    sourceCode,
    normalizeScriptLanguage(form.scriptLanguage),
  );

  if (result.ok) {
    delete errors.sourceCode;
    return true;
  }

  errors.sourceCode = `Must return a value. ${result.message}`;
  return false;
}

export async function validateHookReturnContract(
  form: Record<string, any>,
  errors: Record<string, string>,
  hookType: 'pre' | 'post',
) {
  if (hookType === 'pre') {
    return true;
  }

  const sourceCode = String(form.sourceCode || '').trim();
  if (!sourceCode) {
    return true;
  }

  const { validateEnfyraNoReturnScript } = await import(
    '~/utils/editor/enfyraTypeScriptLinter'
  );
  const result = await validateEnfyraNoReturnScript(sourceCode);

  if (result.ok) {
    delete errors.sourceCode;
    return true;
  }

  errors.sourceCode = result.message;
  return false;
}
