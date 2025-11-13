// src/hooks/useForm.js
import { useState, useCallback, useRef } from 'react';

export const useForm = (initialValues = {}, validationSchema = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  
  const initialValuesRef = useRef(initialValues);

  const validateField = useCallback((name, value) => {
    const fieldSchema = validationSchema[name];
    if (!fieldSchema) return null;

    if (fieldSchema.required && (!value || value.toString().trim() === '')) {
      return `${name} is required`;
    }

    if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
      return `${name} must be at least ${fieldSchema.minLength} characters`;
    }

    if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
      return `${name} must be no more than ${fieldSchema.maxLength} characters`;
    }

    if (fieldSchema.pattern && !fieldSchema.pattern.test(value)) {
      return fieldSchema.message || `${name} format is invalid`;
    }

    if (fieldSchema.validate) {
      const customError = fieldSchema.validate(value, values);
      if (customError) return customError;
    }

    return null;
  }, [validationSchema, values]);

  const validateForm = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationSchema).forEach(name => {
      const error = validateField(name, values[name]);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validationSchema, validateField]);

  const setValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Clear error when value changes
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  }, [errors]);

  const setFieldValue = setValue;

  const setFieldTouched = useCallback((name, isTouched = true) => {
    setTouched(prev => ({ ...prev, [name]: isTouched }));
  }, []);

  const handleChange = useCallback((event) => {
    const { name, value, type, checked } = event.target;
    const newValue = type === 'checkbox' ? checked : value;
    setValue(name, newValue);
  }, [setValue]);

  const handleBlur = useCallback((event) => {
    const { name } = event.target;
    setFieldTouched(name, true);
    
    // Validate field on blur
    const error = validateField(name, values[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [validateField, values, setFieldTouched]);

  const handleSubmit = useCallback((onSubmit) => {
    return async (event) => {
      if (event) {
        event.preventDefault();
      }

      setIsSubmitting(true);
      setSubmitCount(prev => prev + 1);

      // Mark all fields as touched
      const touchedFields = {};
      Object.keys(values).forEach(key => {
        touchedFields[key] = true;
      });
      setTouched(touchedFields);

      const isValid = validateForm();
      
      if (isValid) {
        try {
          await onSubmit(values);
        } catch (error) {
          console.error('Form submission error:', error);
        }
      }

      setIsSubmitting(false);
    };
  }, [values, validateForm]);

  const reset = useCallback((newValues = initialValuesRef.current) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    setSubmitCount(0);
  }, []);

  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  const clearFieldError = useCallback((name) => {
    setErrors(prev => ({ ...prev, [name]: null }));
  }, []);

  const getFieldProps = useCallback((name) => ({
    name,
    value: values[name] || '',
    onChange: handleChange,
    onBlur: handleBlur,
    error: touched[name] ? errors[name] : null,
  }), [values, handleChange, handleBlur, touched, errors]);

  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValuesRef.current);
  const isValid = Object.keys(errors).every(key => !errors[key]);

  return {
    // Values
    values,
    errors,
    touched,
    
    // Status
    isSubmitting,
    submitCount,
    isDirty,
    isValid,
    
    // Actions
    handleChange,
    handleBlur,
    handleSubmit,
    setValue: setFieldValue,
    setFieldValue,
    setFieldTouched,
    setFieldError,
    clearFieldError,
    reset,
    validateForm,
    
    // Utilities
    getFieldProps,
  };
};
