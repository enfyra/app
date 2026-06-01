import { getSuggestedMethodColors, normalizeMethodName } from '~/utils/http.constants';

export function buildMethodDefinitionFieldMap() {
  return {
    name: {
      componentProps: {
        class: 'font-mono uppercase',
      },
    },
    buttonColor: {
      component: 'FormHexColorPicker',
      componentProps: {
        role: 'button',
      },
    },
    textColor: {
      component: 'FormHexColorPicker',
      componentProps: {
        role: 'text',
      },
    },
  };
}

export function normalizeMethodDefinitionRecord(record: Record<string, any>) {
  const method = normalizeMethodName(record.name);
  const suggested = getSuggestedMethodColors(method);
  record.name = method;
  record.buttonColor = record.buttonColor || suggested.buttonColor;
  record.textColor = record.textColor || suggested.textColor;
}

export function applyMethodColorSuggestion(record: Record<string, any>) {
  const method = normalizeMethodName(record.name);
  const suggested = getSuggestedMethodColors(method);
  if (!record.buttonColor) record.buttonColor = suggested.buttonColor;
  if (!record.textColor) record.textColor = suggested.textColor;
}
