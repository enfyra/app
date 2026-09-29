import { parseExpressionAt } from 'acorn'
import type { ColumnTableCellMetadata, ColumnTableCellResult, TableCellDisplay } from '~/types/table-cell-formatter'

export const DEFAULT_TABLE_CELL_MAX_LENGTH = 80

export const TABLE_CELL_FORMATTER_EXAMPLE = `function formatCell(metadata, value) {
  return {
    text: value ?? '_',
    color: value === 'pricing_summary' ? 'primary' : 'neutral',
    variant: 'soft'
  };
}`

type Expression = { type: string; [key: string]: any }

const colors = new Set(['primary', 'secondary', 'success', 'info', 'warning', 'error', 'neutral'])
const variants = new Set(['solid', 'soft', 'subtle', 'outline'])
const blockedProperties = new Set(['__proto__', 'prototype', 'constructor'])
const cache = new Map<string, Expression | null>()

function parseFormatter(source: string): Expression | null {
  if (source.length > 4096 || !source.trim()) return null
  const cached = cache.get(source)
  if (cached !== undefined) return cached
  let result: Expression | null = null
  const expression = source.trim()
  try {
    const node = parseExpressionAt(expression, 0, { ecmaVersion: 'latest' }) as Expression
    if (expression.slice(node.end).trim() === '' && ['ArrowFunctionExpression', 'FunctionExpression'].includes(node.type)
      && node.params.length === 2 && node.params[0].type === 'Identifier' && node.params[0].name === 'metadata'
      && node.params[1].type === 'Identifier' && node.params[1].name === 'value' && !node.async && !node.generator) {
      const body = node.body.type === 'BlockStatement' && node.body.body.length === 1 && node.body.body[0].type === 'ReturnStatement'
        ? node.body.body[0].argument : node.body
      if (body && body.type !== 'BlockStatement' && validateExpression(body)) result = body
    }
  } catch {}
  if (cache.size >= 200) cache.clear()
  cache.set(source, result)
  return result
}

function validateExpression(node: Expression, depth = 0): boolean {
  if (!node || depth > 32) return false
  const check = (child: Expression) => validateExpression(child, depth + 1)
  switch (node.type) {
    case 'Literal': return ['string', 'number', 'boolean'].includes(typeof node.value) || node.value === null
    case 'Identifier': return ['metadata', 'value'].includes(node.name)
    case 'TemplateLiteral': return node.expressions.every(check)
    case 'ArrayExpression': return node.elements.every((item: Expression | null) => item == null || check(item))
    case 'ObjectExpression': return node.properties.every((property: Expression) => property.type === 'Property' && property.kind === 'init'
      && !property.method && !property.shorthand && (property.computed ? check(property.key) : property.key.type === 'Identifier' || property.key.type === 'Literal')
      && (property.computed || !blockedProperties.has(String(property.key.name ?? property.key.value))) && check(property.value))
    case 'MemberExpression': return check(node.object) && (node.computed ? check(node.property) : !blockedProperties.has(node.property.name))
    case 'ConditionalExpression': return check(node.test) && check(node.consequent) && check(node.alternate)
    case 'LogicalExpression': return ['&&', '||', '??'].includes(node.operator) && check(node.left) && check(node.right)
    case 'UnaryExpression': return ['!', '-', '+'].includes(node.operator) && check(node.argument)
    case 'BinaryExpression': return ['+', '-', '*', '/', '%', '===', '!==', '==', '!=', '>', '>=', '<', '<='].includes(node.operator) && check(node.left) && check(node.right)
    default: return false
  }
}

function evaluate(node: Expression, scope: Record<string, unknown>, depth = 0): any {
  if (depth > 32) throw new Error('Formatter expression too deep')
  const visit = (child: Expression) => evaluate(child, scope, depth + 1)
  switch (node.type) {
    case 'Literal': return node.value
    case 'Identifier':
      if (Object.hasOwn(scope, node.name)) return scope[node.name]
      throw new Error('Unknown formatter identifier')
    case 'TemplateLiteral':
      return node.quasis.map((part: any, index: number) => part.value.cooked + (node.expressions[index] ? String(visit(node.expressions[index]) ?? '') : '')).join('')
    case 'ArrayExpression': return node.elements.map((item: Expression | null) => item ? visit(item) : null)
    case 'ObjectExpression':
      return Object.fromEntries(node.properties.map((property: Expression) => {
        if (property.type !== 'Property' || property.kind !== 'init' || property.method || property.shorthand) throw new Error('Unsupported property')
        const key = property.computed ? visit(property.key) : property.key.name ?? property.key.value
        if (typeof key !== 'string' || blockedProperties.has(key)) throw new Error('Unsafe property')
        return [key, visit(property.value)]
      }))
    case 'MemberExpression': {
      const object = visit(node.object)
      if (object == null && node.optional) return undefined
      const key = node.computed ? visit(node.property) : node.property.name
      if (typeof key !== 'string' && typeof key !== 'number') throw new Error('Invalid property')
      if (blockedProperties.has(String(key)) || object == null || !Object.hasOwn(Object(object), key)) return undefined
      return object[key]
    }
    case 'ConditionalExpression': return visit(node.test) ? visit(node.consequent) : visit(node.alternate)
    case 'LogicalExpression': {
      const left = visit(node.left)
      if (node.operator === '&&') return left && visit(node.right)
      if (node.operator === '||') return left || visit(node.right)
      if (node.operator === '??') return left ?? visit(node.right)
      break
    }
    case 'UnaryExpression': {
      const value = visit(node.argument)
      if (node.operator === '!') return !value
      if (node.operator === '-') return -Number(value)
      if (node.operator === '+') return +Number(value)
      break
    }
    case 'BinaryExpression': {
      const left = visit(node.left)
      const right = visit(node.right)
      switch (node.operator) {
        case '+': return left + right
        case '-': return left - right
        case '*': return left * right
        case '/': return left / right
        case '%': return left % right
        case '===': return left === right
        case '!==': return left !== right
        case '==': return left == right
        case '!=': return left != right
        case '>': return left > right
        case '>=': return left >= right
        case '<': return left < right
        case '<=': return left <= right
      }
    }
  }
  throw new Error('Unsupported formatter expression')
}

export function validateTableCellFormatter(source: string): string | null {
  if (!source.trim()) return null
  const body = parseFormatter(source)
  if (!body) return 'Use a function (metadata, value) => expression or a single return statement.'
  return null
}

export function normalizeTableCellResult(result: ColumnTableCellResult): TableCellDisplay | null {
  if (result == null) return null
  if (['string', 'number', 'boolean'].includes(typeof result)) return { text: String(result) }
  if (typeof result !== 'object' || Array.isArray(result) || typeof result.text !== 'string') return null
  return {
    text: result.text,
    ...(result.color && colors.has(result.color) ? { color: result.color } : {}),
    ...(result.variant && variants.has(result.variant) ? { variant: result.variant } : {}),
  } as TableCellDisplay
}

export function formatTableCell(source: string, metadata: Record<string, unknown>, value: unknown): TableCellDisplay | null {
  const body = parseFormatter(source)
  if (!body) return null
  try {
    return normalizeTableCellResult(evaluate(body, { metadata, value }))
  } catch {
    return null
  }
}

export function resolveTableCellDisplay(metadata: ColumnTableCellMetadata, value: unknown): TableCellDisplay {
  const formatter = metadata.tableCell?.formatter
  const formatted = typeof formatter === 'string' ? formatTableCell(formatter, metadata, value) : null
  let display: TableCellDisplay
  if (formatted) display = formatted.text ? formatted : { ...formatted, text: '_' }
  else if (value === null || value === undefined || value === '') display = { text: '_' }
  else if (typeof value === 'object') {
    try { display = { text: JSON.stringify(value) } } catch { display = { text: String(value) } }
  } else display = { text: String(value) }

  const configuredLength = metadata.tableCell?.maxLength
  const maxLength = typeof configuredLength === 'number' && Number.isInteger(configuredLength) && configuredLength > 0 && configuredLength <= 4096
    ? configuredLength : DEFAULT_TABLE_CELL_MAX_LENGTH
  return display.text.length > maxLength
    ? { ...display, text: `${display.text.slice(0, maxLength - 1)}…` }
    : display
}
