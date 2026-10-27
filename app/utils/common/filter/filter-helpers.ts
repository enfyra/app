export function formatDate(date: Date | string, includeTime = false): string {
  if (!date) return '';
  
  const calendarDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
  const d = date instanceof Date ? date : new Date(calendarDate ? `${date}T00:00:00Z` : date);
  if (isNaN(d.getTime())) return '';
  
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(calendarDate && { timeZone: 'UTC' }),
    ...(includeTime && { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  };
  
  return d.toLocaleDateString('en-US', options);
}

export function getInputType(type: string): string {
  return type === 'number' ? 'number' : 'text';
}

export function getInputPlaceholder(operator: string, type: string): string {
  if (operator === '_contains') return 'Contains text...';
  if (operator === '_starts_with') return 'Starts with...';
  if (operator === '_ends_with') return 'Ends with...';
  if (type === 'number') return 'Enter number...';
  return 'Enter value...';
}

export function getDefaultFilterValue(fieldType: string, operator: string): string | string[] | null {
  if ((fieldType === 'date' || fieldType === 'datetime') && ['_in', '_not_in'].includes(operator)) return [];
  if (fieldType === 'datetime') {
    const now = new Date().toISOString();
    return operator === '_between' ? [now, now] : now;
  }
  if (fieldType !== 'date') return null;

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return operator === '_between' ? [today, today] : today;
}

export function getArrayPlaceholder(fieldType: string): string {
  return fieldType === 'number' ? '1,2,3' : 'value1,value2,value3';
}

export function parseArrayValue(value: string, fieldType: string = 'string'): any[] {
  if (!value.trim()) {
    return [];
  }
  
  const values = value.split(',').map(v => v.trim()).filter(v => v.length > 0);
  
  if (fieldType === 'number') {
    return values.map(v => parseFloat(v)).filter(v => !isNaN(v));
  } else {
    return values;
  }
}

export function updateRangeValue(currentValue: any[], index: 0 | 1, value: any): any[] {
  const newValue = currentValue || ['', ''];
  newValue[index] = value;
  return [...newValue];
}
