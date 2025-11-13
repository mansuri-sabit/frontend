// src/components/ui/Textarea.jsx
import React from 'react';
import { cn } from '../../lib/utils';

const Textarea = React.forwardRef(({
  className,
  label,
  error,
  help,
  resize = 'vertical',
  autoResize = false,
  maxLength,
  showCharCount = false,
  ...props
}, ref) => {
  const [charCount, setCharCount] = React.useState(props.value?.length || 0);
  const textareaRef = React.useRef(null);

  React.useImperativeHandle(ref, () => textareaRef.current);

  const handleChange = (e) => {
    setCharCount(e.target.value.length);
    
    if (autoResize) {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      }
    }
    
    if (props.onChange) {
      props.onChange(e);
    }
  };

  React.useEffect(() => {
    if (autoResize && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [autoResize, props.value]);

  const resizeClasses = {
    none: 'resize-none',
    vertical: 'resize-y',
    horizontal: 'resize-x',
    both: 'resize',
  };

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={props.id || props.name} className="block text-sm font-medium text-foreground mb-2">
          {label}
          {props.required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      
      <textarea
        ref={textareaRef}
        className={cn(
          'block w-full rounded-md border-input bg-background text-foreground shadow-sm',
          'focus:border-ring focus:ring-ring',
          'disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed',
          'placeholder:text-muted-foreground',
          'sm:text-sm',
          resizeClasses[resize],
          {
            'border-destructive focus:border-destructive focus:ring-destructive': error,
          },
          className
        )}
        onChange={handleChange}
        maxLength={maxLength}
        {...props}
      />
      
      <div className="flex justify-between items-center mt-2">
        <div>
          {error && (
            <p className="text-sm text-destructive">
              {error}
            </p>
          )}
          
          {help && !error && (
            <p className="text-sm text-muted-foreground">
              {help}
            </p>
          )}
        </div>
        
        {(showCharCount || maxLength) && (
          <span className={cn(
            'text-xs',
            maxLength && charCount > maxLength * 0.9
              ? 'text-destructive'
              : 'text-muted-foreground'
          )}>
            {charCount}{maxLength && `/${maxLength}`}
          </span>
        )}
      </div>
    </div>
  );
});

Textarea.displayName = 'Textarea';

export { Textarea };
