import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card: React.FC<CardProps> = ({ className = '', style, children, ...props }) => {
  return (
    <div
      className={`content-card ${className}`}
      style={{
        padding: '24px',
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};
