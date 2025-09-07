export function formatDate(date: Date | string, includeTime = false): string {
  if (!date) return '';
  
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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