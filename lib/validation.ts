export function validateLanguageData(data: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.code || typeof data.code !== 'string' || data.code.trim() === '') {
    errors.push('Language code is required');
  }

  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.push('Language name is required');
  }

  if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
    errors.push('isActive must be a boolean');
  }

  if (data.isDefault !== undefined && typeof data.isDefault !== 'boolean') {
    errors.push('isDefault must be a boolean');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateTranslationData(data: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.key || typeof data.key !== 'string' || data.key.trim() === '') {
    errors.push('Translation key is required');
  }

  if (!data.languageId || typeof data.languageId !== 'string') {
    errors.push('Language ID is required');
  }

  if (
    !data.value ||
    typeof data.value !== 'string' ||
    data.value.trim() === ''
  ) {
    errors.push('Translation value is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
