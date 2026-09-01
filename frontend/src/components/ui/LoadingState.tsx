import React from 'react';

export interface LoadingStateProps {
  text?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ text = 'Loading data...' }) => {
  return (
    <div className="table-loading">
      <div style={{ width: '24px', height: '24px', border: '3px solid #E5E7EB', borderTopColor: '#2250A1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <p style={{ fontSize: '0.875rem' }}>{text}</p>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
