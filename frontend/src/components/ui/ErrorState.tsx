import React from 'react';
import { Button } from './Button.js';

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'An error occurred while loading data',
  onRetry,
}) => {
  return (
    <div className="table-error">
      <p>{message}</p>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
};
