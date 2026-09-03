import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

export interface SearchableOption {
  value: string | number;
  label: string;
  sublabel?: string;
  badge?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  options: SearchableOption[];
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  hasError?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Type to search...',
  disabled = false,
  required = false,
  hasError = false,
  className = '',
  style = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  // Filter options based on search term
  const filteredOptions = options.filter((opt) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const matchLabel = opt.label.toLowerCase().includes(term);
    const matchSublabel = opt.sublabel ? opt.sublabel.toLowerCase().includes(term) : false;
    const matchBadge = opt.badge ? opt.badge.toLowerCase().includes(term) : false;
    return matchLabel || matchSublabel || matchBadge;
  });

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (opt: SearchableOption) => {
    if (opt.disabled) return;
    onChange(String(opt.value));
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`searchable-select-container ${className}`.trim()}
      style={{
        position: 'relative',
        width: '100%',
        ...style,
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden input for native form validation if required */}
      {required && (
        <input
          tabIndex={-1}
          required={required}
          value={value || ''}
          onChange={() => {}}
          style={{
            position: 'absolute',
            opacity: 0,
            width: 0,
            height: 0,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Control Trigger Button */}
      <div
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.45rem 0.75rem',
          backgroundColor: disabled ? '#F8FAFC' : '#FFFFFF',
          border: `1px solid ${hasError ? '#EF4444' : isOpen ? '#2250A1' : '#CBD5E1'}`,
          borderRadius: '4px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          minHeight: '36px',
          boxShadow: isOpen ? '0 0 0 3px rgba(34, 80, 161, 0.1)' : 'none',
          transition: 'all 0.15s ease',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', flex: 1 }}>
          {selectedOption ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#1E293B',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {selectedOption.label}
              </span>
              {selectedOption.badge && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: '3px',
                    backgroundColor: '#EFF6FF',
                    color: '#2250A1',
                    border: '1px solid #BFDBFE',
                    flexShrink: 0,
                  }}
                >
                  {selectedOption.badge}
                </span>
              )}
              {selectedOption.sublabel && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#64748B',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {selectedOption.sublabel}
                </span>
              )}
            </div>
          ) : (
            <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>{placeholder}</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear selection"
              style={{
                border: 'none',
                background: 'transparent',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '50%',
              }}
            >
              <X size={13} />
            </button>
          )}
          <ChevronDown
            size={15}
            color="#64748B"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease',
            }}
          />
        </div>
      </div>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '6px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search Box Header inside Popover */}
          <div
            style={{
              padding: '6px 8px',
              backgroundColor: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Search size={14} color="#64748B" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setHighlightedIndex(0);
              }}
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.825rem',
                color: '#1E293B',
                fontFamily: 'inherit',
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div
            ref={listRef}
            style={{
              maxHeight: '220px',
              overflowY: 'auto',
              padding: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: '1rem 0.5rem',
                  textAlign: 'center',
                  color: '#94A3B8',
                  fontSize: '0.8rem',
                }}
              >
                No options match "{searchTerm}"
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = String(opt.value) === String(value);
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      cursor: opt.disabled ? 'not-allowed' : 'pointer',
                      opacity: opt.disabled ? 0.5 : 1,
                      backgroundColor: isSelected
                        ? '#EFF6FF'
                        : isHighlighted
                        ? '#F1F5F9'
                        : 'transparent',
                      transition: 'background-color 0.1s ease',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '0.825rem',
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? '#2250A1' : '#1E293B',
                          }}
                        >
                          {opt.label}
                        </span>
                        {opt.badge && (
                          <span
                            style={{
                              fontSize: '0.675rem',
                              fontWeight: 700,
                              padding: '1px 4px',
                              borderRadius: '3px',
                              backgroundColor: opt.badge === 'SERIALIZED' ? '#F5F3FF' : '#F0F9FF',
                              color: opt.badge === 'SERIALIZED' ? '#7C3AED' : '#0284C7',
                              border: `1px solid ${opt.badge === 'SERIALIZED' ? '#DDD6FE' : '#BAE6FD'}`,
                            }}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.sublabel && (
                        <span style={{ fontSize: '0.725rem', color: '#64748B', marginTop: '1px' }}>
                          {opt.sublabel}
                        </span>
                      )}
                    </div>

                    {isSelected && <Check size={14} color="#2250A1" style={{ flexShrink: 0 }} />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
