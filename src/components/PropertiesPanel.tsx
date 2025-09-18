import React, { useState, useEffect, useCallback } from 'react';
import type { PropertiesPanelProps, GraphNode, GraphEdge, UpdateNodeRequest, UpdateEdgeRequest } from '../types/graph';

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedItem,
  isOpen,
  onClose,
  onUpdateItem,
  onDeleteItem,
  className = ''
}) => {
  const [formData, setFormData] = useState<{
    label: string;
    type: string;
    directed?: boolean;
    description: string;
  }>({
    label: '',
    type: '',
    directed: true,
    description: ''
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Update form when selected item changes
  useEffect(() => {
    if (selectedItem) {
      const item = selectedItem.item;
      const props = item.properties || {};
      
      setFormData({
        label: item.label || '',
        type: selectedItem.type === 'node' ? (item as GraphNode).type || 'default' : '',
        directed: selectedItem.type === 'edge' ? (item as GraphEdge).directed : true,
        description: props.description || ''
      });
      setHasChanges(false);
    } else {
      setFormData({
        label: '',
        type: '',
        directed: true,
        description: ''
      });
      setHasChanges(false);
    }
  }, [selectedItem]);

  // Handle form changes
  const handleInputChange = useCallback((field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!selectedItem) return;

    try {
      if (selectedItem.type === 'node') {
        const properties: Record<string, any> = {};
        
        // Only include description if not empty
        if (formData.description.trim()) {
          properties.description = formData.description.trim();
        }

        const updates: UpdateNodeRequest = {
          label: formData.label,
          type: formData.type,
          properties
        };
        await onUpdateItem(updates);
      } else {
        const properties: Record<string, any> = {};
        
        // Only include description if not empty
        if (formData.description.trim()) {
          properties.description = formData.description.trim();
        }

        const updates: UpdateEdgeRequest = {
          label: formData.label,
          properties,
          directed: formData.directed
        };
        await onUpdateItem(updates);
      }
      
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save changes:', error);
    }
  }, [selectedItem, formData, onUpdateItem]);

  // Handle delete
  const handleDelete = useCallback(() => {
    onDeleteItem();
  }, [onDeleteItem]);

  if (!selectedItem) {
    return null;
  }

  const isNode = selectedItem.type === 'node';
  const item = selectedItem.item;

  return (
    <div className={`properties-panel ${isOpen ? 'open' : 'closed'} ${className}`}>
      <div className="p-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">
            {isNode ? 'Node Properties' : 'Edge Properties'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 space-y-4">
          {/* ID (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              ID
            </label>
            <input
              type="text"
              value={item.id}
              readOnly
              className="form-input bg-gray-800 text-gray-400 cursor-not-allowed"
            />
          </div>

          {/* Label */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Label *
            </label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => handleInputChange('label', e.target.value)}
              className="form-input"
              placeholder="Enter label..."
            />
          </div>

          {/* Type (nodes only) */}
          {isNode && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="form-input"
              >
                <option value="default">Default</option>
                <option value="frontend-framework">Frontend Framework</option>
                <option value="backend-framework">Backend Framework</option>
                <option value="programming-language">Programming Language</option>
                <option value="database">Database</option>
                <option value="runtime">Runtime</option>
                <option value="visualization-library">Visualization Library</option>
                <option value="component">Component</option>
                <option value="architecture">Architecture</option>
                <option value="concept">Concept</option>
                <option value="css-framework">CSS Framework</option>
                <option value="build-tool">Build Tool</option>
                <option value="cloud-database">Cloud Database</option>
                <option value="orm">ORM</option>
                <option value="graph-database">Graph Database</option>
              </select>
            </div>
          )}

          {/* Directed (edges only) */}
          {!isNode && (
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.directed}
                  onChange={(e) => handleInputChange('directed', e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-300">Directed Edge</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Directed edges show as arrows (one-way), undirected edges are bidirectional
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="form-textarea"
              placeholder={isNode ? "Describe this node..." : "Describe this relationship..."}
              rows={4}
            />
          </div>

          {/* Timestamps */}
          {item.createdAt && (
            <div className="text-xs text-gray-500 space-y-1 pt-4 border-t border-gray-700">
              <div>Created: {new Date(item.createdAt).toLocaleString()}</div>
              {item.updatedAt && (
                <div>Updated: {new Date(item.updatedAt).toLocaleString()}</div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-3 pt-4 border-t border-gray-700">
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Changes
          </button>
          <button
            onClick={handleDelete}
            className="btn btn-danger"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertiesPanel; 