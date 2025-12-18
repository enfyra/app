import { describe, it, expect } from 'vitest'

describe('Schema Utilities', () => {
  describe('field type validation', () => {
    it('should validate string field types', () => {
      const stringTypes = ['string', 'text', 'varchar', 'char']
      
      stringTypes.forEach(type => {
        expect(isStringType(type)).toBe(true)
      })
      
      expect(isStringType('integer')).toBe(false)
      expect(isStringType('boolean')).toBe(false)
    })

    it('should validate numeric field types', () => {
      const numericTypes = ['integer', 'int', 'float', 'double', 'decimal', 'number']
      
      numericTypes.forEach(type => {
        expect(isNumericType(type)).toBe(true)
      })
      
      expect(isNumericType('string')).toBe(false)
      expect(isNumericType('boolean')).toBe(false)
    })

    it('should validate date field types', () => {
      const dateTypes = ['date', 'datetime', 'timestamp']
      
      dateTypes.forEach(type => {
        expect(isDateType(type)).toBe(true)
      })
      
      expect(isDateType('string')).toBe(false)
      expect(isDateType('integer')).toBe(false)
    })

    it('should validate boolean field types', () => {
      expect(isBooleanType('boolean')).toBe(true)
      expect(isBooleanType('bool')).toBe(true)
      
      expect(isBooleanType('string')).toBe(false)
      expect(isBooleanType('integer')).toBe(false)
    })
  })

  describe('field operations', () => {
    it('should get available operators for different field types', () => {
      expect(getAvailableOperators('string')).toContain('equals')
      expect(getAvailableOperators('string')).toContain('contains')
      expect(getAvailableOperators('string')).toContain('starts_with')
      
      expect(getAvailableOperators('integer')).toContain('equals')
      expect(getAvailableOperators('integer')).toContain('greater_than')
      expect(getAvailableOperators('integer')).toContain('less_than')
      
      expect(getAvailableOperators('date')).toContain('equals')
      expect(getAvailableOperators('date')).toContain('before')
      expect(getAvailableOperators('date')).toContain('after')
    })

    it('should format field values correctly', () => {
      expect(formatFieldValue('test', 'string')).toBe('test')
      expect(formatFieldValue('123', 'integer')).toBe(123)
      expect(formatFieldValue('true', 'boolean')).toBe(true)
      expect(formatFieldValue('false', 'boolean')).toBe(false)
      expect(formatFieldValue('2023-01-01', 'date')).toBe('2023-01-01')
    })
  })

  describe('schema validation', () => {
    it('should validate schema structure', () => {
      const validSchema = {
        users: {
          definition: [
            { name: 'id', type: 'integer', fieldType: 'column' },
            { name: 'name', type: 'string', fieldType: 'column' }
          ]
        }
      }

      expect(isValidSchema(validSchema)).toBe(true)
    })

    it('should detect invalid schema structure', () => {
      const invalidSchema = {
        users: {
        }
      }

      expect(isValidSchema(invalidSchema)).toBe(false)
    })

    it('should validate field definitions', () => {
      const validField = { name: 'id', type: 'integer', fieldType: 'column' }
      const invalidField = { name: 'id' } // Missing type and fieldType

      expect(isValidField(validField)).toBe(true)
      expect(isValidField(invalidField)).toBe(false)
    })
  })
})

function isStringType(type: string): boolean {
  return ['string', 'text', 'varchar', 'char'].includes(type.toLowerCase())
}

function isNumericType(type: string): boolean {
  return ['integer', 'int', 'float', 'double', 'decimal', 'number'].includes(type.toLowerCase())
}

function isDateType(type: string): boolean {
  return ['date', 'datetime', 'timestamp'].includes(type.toLowerCase())
}

function isBooleanType(type: string): boolean {
  return ['boolean', 'bool'].includes(type.toLowerCase())
}

function getAvailableOperators(fieldType: string): string[] {
  if (isStringType(fieldType)) {
    return ['equals', 'not_equals', 'contains', 'starts_with', 'ends_with']
  }
  if (isNumericType(fieldType)) {
    return ['equals', 'not_equals', 'greater_than', 'less_than', 'between']
  }
  if (isDateType(fieldType)) {
    return ['equals', 'not_equals', 'before', 'after', 'between']
  }
  if (isBooleanType(fieldType)) {
    return ['equals', 'not_equals']
  }
  return ['equals', 'not_equals']
}

function formatFieldValue(value: string, fieldType: string): any {
  if (isNumericType(fieldType)) {
    return Number(value)
  }
  if (isBooleanType(fieldType)) {
    return value.toLowerCase() === 'true'
  }
  return value
}

function isValidSchema(schema: any): boolean {
  if (!schema || typeof schema !== 'object') return false
  
  for (const table in schema) {
    if (!schema[table].definition || !Array.isArray(schema[table].definition)) {
      return false
    }
  }
  
  return true
}

function isValidField(field: any): boolean {
  return field && 
         typeof field.name === 'string' && 
         typeof field.type === 'string' && 
         typeof field.fieldType === 'string'
}