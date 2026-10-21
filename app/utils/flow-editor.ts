export function resolveRouteIdentifier(value: unknown) {
  const resolved = Array.isArray(value) ? value[0] : value;
  return resolved == null ? "" : String(resolved);
}

const RETURN_VALUE = /\breturn\b([^;\n}]*)/gu;

const NON_BOOLEAN_RETURN_VALUE = [
  /^\{/u,
  /^\[/u,
  /^(?:null|undefined)$/u,
  /^void\s+(?:0|\d+)$/u,
  /^[+-]?(?:\d+\.?\d*|\.\d+)$/u,
  /^'(?:[^'\\]|\\.)*'$/u,
  /^"(?:[^"\\]|\\.)*"$/u,
  /^`(?:[^`\\$]|\\.)*`$/u,
];

function readReturnValues(code: string) {
  return [...code.matchAll(RETURN_VALUE)].map((match) => (match[1] ?? "").trim());
}

function isNonBooleanReturnValue(value: string) {
  return NON_BOOLEAN_RETURN_VALUE.some((pattern) => pattern.test(value));
}

export function validateConditionSource(
  sourceCode: string | null | undefined,
): string | null {
  const source = String(sourceCode ?? "").trim();
  if (!source) {
    return "Condition steps need source code that returns true or false.";
  }
  const code = source
    .replace(/\/\*[\s\S]*?\*\//gu, " ")
    .replace(/\/\/[^\n]*/gu, " ");
  const returnValues = readReturnValues(code);
  if (returnValues.length === 0) {
    return "Condition source must return true or false.";
  }
  if (returnValues.some((value) => value === "")) {
    return "Condition source must return true or false, not a bare return.";
  }
  if (returnValues.every(isNonBooleanReturnValue)) {
    return "Condition source must return a boolean. Return true or false, or wrap the value, e.g. Boolean(result).";
  }
  return null;
}

export function buildFlowExecutionDetailFilter(
  flowId: string | number,
  executionId: string | number,
  idField: string,
) {
  return {
    _and: [
      { [idField]: { _eq: executionId } },
      { flow: { _eq: flowId } },
    ],
  };
}
