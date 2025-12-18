import { describe, it, expect } from 'vitest'

describe('Validation Utilities', () => {
  describe('email validation', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com'
      ]

      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true)
      })
    })

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        ''
      ]

      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false)
      })
    })
  })

  describe('password validation', () => {
    it('should validate strong passwords', () => {
      const validPasswords = [
        'Password123!',
        'MyStr0ng@Pass',
        'Test#2023$'
      ]

      validPasswords.forEach(password => {
        expect(isValidPassword(password)).toBe(true)
      })
    })

    it('should reject weak passwords', () => {
      const invalidPasswords = [
        '123456',
        'password',
        'PASSWORD',
        'Pass123', // Missing special character
        'Pass!', // Too short
        ''
      ]

      invalidPasswords.forEach(password => {
        expect(isValidPassword(password)).toBe(false)
      })
    })
  })

  describe('URL validation', () => {
    it('should validate correct URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://test.org',
        'https://subdomain.example.com/path',
        'http://localhost:3000',
        'https://example.com/path?query=value#fragment'
      ]

      validUrls.forEach(url => {
        expect(isValidUrl(url)).toBe(true)
      })
    })

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com', // Not http/https
        'example.com', // Missing protocol
        'https://',
        ''
      ]

      invalidUrls.forEach(url => {
        expect(isValidUrl(url)).toBe(false)
      })
    })
  })

  describe('required field validation', () => {
    it('should validate required fields', () => {
      expect(isRequired('test')).toBe(true)
      expect(isRequired(123)).toBe(true)
      expect(isRequired(false)).toBe(true) // false is a valid value
      expect(isRequired(0)).toBe(true) // 0 is a valid value
    })

    it('should reject empty required fields', () => {
      expect(isRequired('')).toBe(false)
      expect(isRequired(null)).toBe(false)
      expect(isRequired(undefined)).toBe(false)
      expect(isRequired('   ')).toBe(false) // Whitespace only
    })
  })

  describe('numeric validation', () => {
    it('should validate numeric values', () => {
      expect(isNumeric('123')).toBe(true)
      expect(isNumeric('123.45')).toBe(true)
      expect(isNumeric('-123')).toBe(true)
      expect(isNumeric('0')).toBe(true)
      expect(isNumeric(123)).toBe(true)
    })

    it('should reject non-numeric values', () => {
      expect(isNumeric('abc')).toBe(false)
      expect(isNumeric('12abc')).toBe(false)
      expect(isNumeric('')).toBe(false)
      expect(isNumeric(null)).toBe(false)
      expect(isNumeric(undefined)).toBe(false)
    })
  })

  describe('length validation', () => {
    it('should validate minimum length', () => {
      expect(hasMinLength('test', 3)).toBe(true)
      expect(hasMinLength('test', 4)).toBe(true)
      expect(hasMinLength('test', 5)).toBe(false)
    })

    it('should validate maximum length', () => {
      expect(hasMaxLength('test', 5)).toBe(true)
      expect(hasMaxLength('test', 4)).toBe(true)
      expect(hasMaxLength('test', 3)).toBe(false)
    })

    it('should validate length range', () => {
      expect(hasLengthBetween('test', 2, 6)).toBe(true)
      expect(hasLengthBetween('test', 4, 4)).toBe(true)
      expect(hasLengthBetween('test', 5, 10)).toBe(false)
      expect(hasLengthBetween('test', 1, 3)).toBe(false)
    })
  })
})

function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email) && !email.includes('..')
}

function isValidPassword(password: string): boolean {
  if (!password || typeof password !== 'string') return false
  
  const hasLowerCase = /[a-z]/.test(password)
  const hasUpperCase = /[A-Z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[@$!%*?&#]/.test(password)
  const hasMinLength = password.length >= 8
  
  return hasLowerCase && hasUpperCase && hasNumbers && hasSpecialChar && hasMinLength
}

function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

function isRequired(value: any): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string' && value.trim() === '') return false
  return true
}

function isNumeric(value: any): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'number') return !isNaN(value)
  if (typeof value === 'string') {
    if (value.trim() === '') return false
    return !isNaN(Number(value))
  }
  return false
}

function hasMinLength(value: string, min: number): boolean {
  return value && value.length >= min
}

function hasMaxLength(value: string, max: number): boolean {
  return value && value.length <= max
}

function hasLengthBetween(value: string, min: number, max: number): boolean {
  return value && value.length >= min && value.length <= max
}