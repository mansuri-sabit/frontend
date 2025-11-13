import React from 'react';

const Label = ({ 
  children, 
  htmlFor, 
  className = '', 
  required = false,
  ...props 
}) => {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-foreground ${className}`}
      {...props}
    >
      {children}
      {required && <span className="text-destructive ml-1">*</span>}
    </label>
  );
};

export { Label };
export default Label;
