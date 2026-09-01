import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', hasError, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`textarea ${hasError ? 'textarea-error' : ''} ${className}`.trim()}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
