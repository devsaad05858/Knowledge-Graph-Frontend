import React, { useCallback } from 'react';
import type { ToolbarProps } from '../types/graph';

const Toolbar: React.FC<ToolbarProps> = ({
  searchQuery,
  onSearchChange,
  onFitToScreen,
  className = ''
}) => {
  const handleSearchInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value);
  }, [onSearchChange]);

  const handleSearchSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
  }, []);

  return (
    <div className={`toolbar ${className}`}>
      {/* Left side - Search */}
      <div className="flex items-center space-x-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center">
          <div className="relative">
            <input
              type="text"
              placeholder="Search nodes"
              value={searchQuery}
              onChange={handleSearchInput}
              className="search-input w-64"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </form>
        
        {searchQuery && (
          <span className="text-sm text-gray-400">
            Search: "{searchQuery}"
          </span>
        )}
      </div>

      {/* Right side - Controls */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onFitToScreen}
          className="btn btn-secondary btn-sm"
          title="Fit to Screen"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          Fit
        </button>

        <div className="text-xs text-gray-400 ml-2">
          <div>Click empty space to create node (auto-centers)</div>
          <div>Right-click node to connect/unlink</div>
          <div>Search auto-centers on best match</div>
        </div>
      </div>
    </div>
  );
};

export default Toolbar; 