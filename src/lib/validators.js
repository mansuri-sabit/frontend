// src/lib/validators.js

// Validation error class
export class ValidationError extends Error {
  constructor(message, field = null, code = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.code = code;
  }
}

// Base validator class
export class Validator {
  constructor(rules = {}) {
    this.rules = rules;
  }

  validate(data) {
    const errors = {};
    const cleaned = {};

    for (const [field, value] of Object.entries(data)) {
      try {
        cleaned[field] = this.validateField(field, value);
      } catch (error) {
        if (error instanceof ValidationError) {
          errors[field] = error.message;
        } else {
          errors[field] = 'Validation failed';
        }
      }
    }

    // Check required fields
    for (const [field, rule] of Object.entries(this.rules)) {
      if (rule.required && (!(field in data) || data[field] === null || data[field] === undefined || data[field] === '')) {
        errors[field] = rule.requiredMessage || `${field} is required`;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      data: cleaned,
    };
  }

  validateField(field, value) {
    const rule = this.rules[field];
    if (!rule) return value;

    // Skip validation for empty non-required fields
    if (!rule.required && (value === null || value === undefined || value === '')) {
      return value;
    }

    // Apply validators in order
    let cleanedValue = value;
    
    if (rule.type) {
      cleanedValue = this.validateType(field, cleanedValue, rule.type);
    }

    if (rule.minLength !== undefined) {
      this.validateMinLength(field, cleanedValue, rule.minLength);
    }

    if (rule.maxLength !== undefined) {
      this.validateMaxLength(field, cleanedValue, rule.maxLength);
    }

    if (rule.min !== undefined) {
      this.validateMin(field, cleanedValue, rule.min);
    }

    if (rule.max !== undefined) {
      this.validateMax(field, cleanedValue, rule.max);
    }

    if (rule.pattern) {
      this.validatePattern(field, cleanedValue, rule.pattern, rule.patternMessage);
    }

    if (rule.custom) {
      cleanedValue = rule.custom(cleanedValue, field);
    }

    if (rule.transform) {
      cleanedValue = rule.transform(cleanedValue);
    }

    return cleanedValue;
  }

  validateType(field, value, type) {
    switch (type) {
      case 'string':
        return String(value);
      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          throw new ValidationError(`${field} must be a number`, field);
        }
        return num;
      case 'integer':
        const int = parseInt(value);
        if (isNaN(int) || int !== Number(value)) {
          throw new ValidationError(`${field} must be an integer`, field);
        }
        return int;
      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (value === 'true') return true;
        if (value === 'false') return false;
        throw new ValidationError(`${field} must be a boolean`, field);
      case 'email':
        const email = String(value);
        if (!this.isValidEmail(email)) {
          throw new ValidationError(`${field} must be a valid email`, field);
        }
        return email.toLowerCase();
      case 'url':
        const url = String(value);
        if (!this.isValidURL(url)) {
          throw new ValidationError(`${field} must be a valid URL`, field);
        }
        return url;
      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new ValidationError(`${field} must be a valid date`, field);
        }
        return date;
      case 'array':
        if (!Array.isArray(value)) {
          throw new ValidationError(`${field} must be an array`, field);
        }
        return value;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          throw new ValidationError(`${field} must be an object`, field);
        }
        return value;
      default:
        return value;
    }
  }

  validateMinLength(field, value, minLength) {
    const length = typeof value === 'string' ? value.length : String(value).length;
    if (length < minLength) {
      throw new ValidationError(`${field} must be at least ${minLength} characters`, field);
    }
  }

  validateMaxLength(field, value, maxLength) {
    const length = typeof value === 'string' ? value.length : String(value).length;
    if (length > maxLength) {
      throw new ValidationError(`${field} must be no more than ${maxLength} characters`, field);
    }
  }

  validateMin(field, value, min) {
    const num = Number(value);
    if (isNaN(num) || num < min) {
      throw new ValidationError(`${field} must be at least ${min}`, field);
    }
  }

  validateMax(field, value, max) {
    const num = Number(value);
    if (isNaN(num) || num > max) {
      throw new ValidationError(`${field} must be no more than ${max}`, field);
    }
  }

  validatePattern(field, value, pattern, message) {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    if (!regex.test(String(value))) {
      throw new ValidationError(
        message || `${field} format is invalid`,
        field
      );
    }
  }

  // Helper methods
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

// Pre-defined validators for common use cases

// Auth validators
export const authValidators = {
  login: new Validator({
    username: {
      required: true,
      type: 'string',
      minLength: 3,
      maxLength: 50,
      pattern: /^[a-zA-Z0-9_]+$/,
      patternMessage: 'Username can only contain letters, numbers, and underscores',
    },
    password: {
      required: true,
      type: 'string',
      minLength: 8,
      maxLength: 128,
    },
  }),

  register: new Validator({
    username: {
      required: true,
      type: 'string',
      minLength: 3,
      maxLength: 50,
      pattern: /^[a-zA-Z0-9_]+$/,
      patternMessage: 'Username can only contain letters, numbers, and underscores',
    },
    email: {
      required: true,
      type: 'email',
    },
    password: {
      required: true,
      type: 'string',
      minLength: 8,
      maxLength: 128,
      custom: (value, field) => {
        // Password strength validation
        const hasUppercase = /[A-Z]/.test(value);
        const hasLowercase = /[a-z]/.test(value);
        const hasNumbers = /\d/.test(value);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);

        if (!hasUppercase || !hasLowercase || !hasNumbers) {
          throw new ValidationError(
            'Password must contain uppercase, lowercase, and numeric characters',
            field
          );
        }

        return value;
      },
    },
    name: {
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 100,
      transform: (value) => value.trim(),
    },
    role: {
      required: false,
      type: 'string',
      custom: (value, field) => {
        const validRoles = ['admin', 'client', 'visitor'];
        if (value && !validRoles.includes(value)) {
          throw new ValidationError(
            `${field} must be one of: ${validRoles.join(', ')}`,
            field
          );
        }
        return value || 'client';
      },
    },
  }),
};

// Client validators
export const clientValidators = {
  branding: new Validator({
    logo_url: {
      required: false,
      type: 'url',
    },
    theme_color: {
      required: true,
      type: 'string',
      pattern: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
      patternMessage: 'Theme color must be a valid hex color (e.g., #3B82F6)',
    },
    welcome_message: {
      required: true,
      type: 'string',
      minLength: 10,
      maxLength: 500,
      transform: (value) => value.trim(),
    },
    pre_questions: {
      required: false,
      type: 'array',
      custom: (value, field) => {
        if (!Array.isArray(value)) return [];
        
        // Filter out empty questions and limit to 3
        const filtered = value
          .filter(q => q && q.trim())
          .map(q => q.trim())
          .slice(0, 3);

        // Validate each question
        filtered.forEach((question, index) => {
          if (question.length < 5) {
            throw new ValidationError(
              `Pre-question ${index + 1} must be at least 5 characters`,
              field
            );
          }
          if (question.length > 100) {
            throw new ValidationError(
              `Pre-question ${index + 1} must be no more than 100 characters`,
              field
            );
          }
        });

        return filtered;
      },
    },
    allow_embedding: {
      required: false,
      type: 'boolean',
    },
  }),

  createClient: new Validator({
    name: {
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 100,
      transform: (value) => value.trim(),
    },
    token_limit: {
      required: true,
      type: 'integer',
      min: 1000,
      max: 1000000,
    },
    branding: {
      required: false,
      type: 'object',
      custom: (value, field) => {
        if (!value) return {};
        
        const brandingValidation = clientValidators.branding.validate(value);
        if (!brandingValidation.isValid) {
          const firstError = Object.values(brandingValidation.errors)[0];
          throw new ValidationError(firstError, field);
        }
        
        return brandingValidation.data;
      },
    },
  }),
};

// Chat validators
export const chatValidators = {
  message: new Validator({
    message: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 2000,
      transform: (value) => value.trim(),
      custom: (value, field) => {
        // Check for spam patterns
        if (/(.)\1{10,}/.test(value)) {
          throw new ValidationError(
            'Message contains too many repeated characters',
            field
          );
        }
        
        // Check for basic profanity (extend as needed)
        const profanityPattern = /\b(spam|test|harmful)\b/i;
        if (profanityPattern.test(value)) {
          throw new ValidationError(
            'Message contains inappropriate content',
            field
          );
        }
        
        return value;
      },
    },
    conversation_id: {
      required: false,
      type: 'string',
      pattern: /^[a-f0-9-]{36}$/i,
      patternMessage: 'Conversation ID must be a valid UUID',
    },
  }),
};

// File validators
export const fileValidators = {
  pdf: {
    validateFile: (file) => {
      const errors = [];
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = ['application/pdf'];
      const allowedExtensions = ['.pdf'];

      if (!file) {
        errors.push('File is required');
        return { isValid: false, errors };
      }

      // Check file size
      if (file.size > maxSize) {
        errors.push(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
      }

      // Check file type
      if (!allowedTypes.includes(file.type)) {
        errors.push('File must be a PDF document');
      }

      // Check file extension
      const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      if (!allowedExtensions.includes(extension)) {
        errors.push('File must have a .pdf extension');
      }

      // Check filename
      if (file.name.length > 255) {
        errors.push('Filename must be less than 255 characters');
      }

      // Check for suspicious filenames
      if (/[<>:"/\\|?*]/.test(file.name)) {
        errors.push('Filename contains invalid characters');
      }

      return {
        isValid: errors.length === 0,
        errors,
        file: errors.length === 0 ? file : null,
      };
    },
  },
};

// Utility functions
export const validateData = (data, validator) => {
  if (validator instanceof Validator) {
    return validator.validate(data);
  }
  
  // Handle custom validation functions
  if (typeof validator === 'function') {
    try {
      const result = validator(data);
      return {
        isValid: true,
        errors: {},
        data: result,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: { _general: error.message },
        data: null,
      };
    }
  }
  
  throw new Error('Invalid validator provided');
};

// Sanitization helpers
export const sanitize = {
  html: (input) => {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  },
  
  sql: (input) => {
    return String(input).replace(/['";\\]/g, '');
  },
  
  filename: (input) => {
    return String(input)
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 255);
  },
  
  url: (input) => {
    try {
      const url = new URL(input);
      // Only allow http and https
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
      return url.toString();
    } catch {
      throw new ValidationError('Invalid URL format');
    }
  },
};

export default {
  Validator,
  ValidationError,
  authValidators,
  clientValidators,
  chatValidators,
  fileValidators,
  validateData,
  sanitize,
};
