import { normalizeScriptLanguage } from '~/utils/script-contract';

export function buildWebsocketEventSavePayload(
  form: Record<string, any>,
  gatewayId: string | number,
): Record<string, any> {
  return {
    ...form,
    gateway: gatewayId,
    scriptLanguage: normalizeScriptLanguage(form.scriptLanguage),
    sourceCode: form.sourceCode === undefined ? null : form.sourceCode,
    compiledCode: form.compiledCode ?? null,
  };
}
