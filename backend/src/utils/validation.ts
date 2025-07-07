// Validate Aadhaar number (12 digits)
export const isValidAadhaar = (aadhaar: string): boolean => {
  return /^\d{12}$/.test(aadhaar);
};

// Validate Indian phone number
export const isValidPhone = (phone: string): boolean => {
  return /^(\+91)?[6-9]\d{9}$/.test(phone);
};

// Validate email
export const isValidEmail = (email: string): boolean => {
  return /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(email);
};

// Validate password strength
export const isStrongPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(
    password
  );
};

// Validate file size (in bytes)
export const isValidFileSize = (size: number, maxSize: number): boolean => {
  return size <= maxSize;
};

// Validate file type
export const isValidFileType = (
  mimeType: string,
  allowedTypes: string[]
): boolean => {
  return allowedTypes.includes(mimeType);
};

// Validate date format (YYYY-MM-DD)
export const isValidDate = (date: string): boolean => {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
};

// Validate age (minimum age in years)
export const isValidAge = (dateOfBirth: Date, minAge: number): boolean => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const month = today.getMonth() - birthDate.getMonth();
  
  if (month < 0 || (month === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age >= minAge;
};

// Validate language code
export const isValidLanguage = (language: string): boolean => {
  const supportedLanguages = [
    'hi', // Hindi
    'bn', // Bengali
    'te', // Telugu
    'ta', // Tamil
    'mr', // Marathi
    'gu', // Gujarati
    'kn', // Kannada
    'ml', // Malayalam
    'pa', // Punjabi
    'or', // Odia
  ];
  return supportedLanguages.includes(language);
};

// Validate form field value based on type
export const isValidFieldValue = (
  value: any,
  type: string,
  options?: {
    min?: number;
    max?: number;
    pattern?: string;
    required?: boolean;
  }
): boolean => {
  if (options?.required && !value) {
    return false;
  }

  if (!value) {
    return true; // Optional field with no value
  }

  switch (type) {
    case 'text':
      if (options?.pattern) {
        return new RegExp(options.pattern).test(value);
      }
      return typeof value === 'string';

    case 'number':
      const num = Number(value);
      if (isNaN(num)) {
        return false;
      }
      if (options?.min !== undefined && num < options.min) {
        return false;
      }
      if (options?.max !== undefined && num > options.max) {
        return false;
      }
      return true;

    case 'date':
      return isValidDate(value);

    default:
      return true;
  }
};

// Validate MongoDB ObjectId
export const isValidObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// Validate URL
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}; 