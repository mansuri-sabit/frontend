// src/components/ui/OTPInput.jsx
import React, { useState, useRef, useEffect } from 'react';

/**
 * OTP Input Component
 * A 6-digit OTP input with auto-focus and auto-advance
 */
const OTPInput = ({ value = '', onChange, error, disabled = false, autoFocus = true }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  // Initialize OTP from value prop
  useEffect(() => {
    if (value && value.length === 6) {
      const otpArray = value.split('');
      setOtp(otpArray);
    }
  }, [value]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (index, newValue) => {
    // Only allow digits
    if (newValue && !/^\d$/.test(newValue)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = newValue;
    setOtp(newOtp);

    // Call parent onChange with complete OTP string
    const otpString = newOtp.join('');
    if (onChange) {
      onChange(otpString);
    }

    // Auto-focus next input if value entered
    if (newValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then((text) => {
        const digits = text.replace(/\D/g, '').slice(0, 6).split('');
        if (digits.length === 6) {
          setOtp(digits);
          const otpString = digits.join('');
          if (onChange) {
            onChange(otpString);
          }
          inputRefs.current[5]?.focus();
        }
      });
    }
    // Handle arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').slice(0, 6).split('');
    if (digits.length === 6) {
      setOtp(digits);
      const otpString = digits.join('');
      if (onChange) {
        onChange(otpString);
      }
      inputRefs.current[5]?.focus();
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-center gap-2 mb-2">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            disabled={disabled}
            className={`
              w-12 h-14 text-center text-xl font-semibold
              border-2 rounded-lg
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-primary-500
              ${
                error
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:border-primary-500'
              }
              ${
                disabled
                  ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-50'
                  : 'bg-white dark:bg-gray-900'
              }
            `}
            aria-label={`OTP digit ${index + 1}`}
          />
        ))}
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 text-center mt-1">{error}</p>
      )}
    </div>
  );
};

export default OTPInput;

