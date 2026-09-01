import React from 'react';
import { Search } from 'lucide-react';

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearchChange?: (value: string) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  onSearchChange,
  className = '',
  ...props
}) => {
  return (
    <div className={`search-box ${className}`.trim()}>
      <Search size={16} className="search-icon" />
      <input
        type="text"
        onChange={(e) => onSearchChange?.(e.target.value)}
        {...props}
      />
    </div>
  );
};
