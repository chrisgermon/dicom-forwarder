/**
 * Dynamic Field Renderer Component
 * 
 * Renders different input types based on field_type
 */

import { useState } from 'react';
import type { ProductItem } from '../types';

interface FieldRendererProps {
  item: ProductItem;
  value: any;
  onChange: (value: any) => void;
  className?: string;
}

export function FieldRenderer({ item, value, onChange, className = '' }: FieldRendererProps) {
  const [showPersonalDetails, setShowPersonalDetails] = useState(false);
  const [personalDetails, setPersonalDetails] = useState({
    name: '',
    providerNumber: '',
    address: '',
    phone: '',
    fax: '',
  });

  const fieldType = item.field_type || 'text';
  const placeholder = item.quantities[0] || '';

  const getCurrentValue = () => {
    if (typeof value === 'object' && value?.fieldValue !== undefined) {
      return value.fieldValue;
    }
    return value || '';
  };

  const handleValueChange = (newValue: any) => {
    if (item.is_personalised) {
      onChange({
        fieldValue: newValue,
        isPersonalised: showPersonalDetails,
        personalDetails: showPersonalDetails ? personalDetails : null,
      });
    } else {
      onChange(newValue);
    }
  };

  const handlePersonalToggle = (show: boolean) => {
    setShowPersonalDetails(show);
    onChange({
      fieldValue: getCurrentValue(),
      isPersonalised: show,
      personalDetails: show ? personalDetails : null,
    });
  };

  const handlePersonalDetailChange = (field: string, newValue: string) => {
    const updatedDetails = { ...personalDetails, [field]: newValue };
    setPersonalDetails(updatedDetails);
    onChange({
      fieldValue: getCurrentValue(),
      isPersonalised: true,
      personalDetails: updatedDetails,
    });
  };

  const renderPersonalisedSection = () => {
    if (!item.is_personalised) return null;

    return (
      <div className="border-t pt-4 mt-4 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Personalised Details:</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handlePersonalToggle(false)}
              className={`px-3 py-1 text-sm rounded ${!showPersonalDetails ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => handlePersonalToggle(true)}
              className={`px-3 py-1 text-sm rounded ${showPersonalDetails ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Yes
            </button>
          </div>
        </div>

        {showPersonalDetails && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={personalDetails.name}
                onChange={(e) => handlePersonalDetailChange('name', e.target.value)}
                placeholder="Doctor/Practitioner name"
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Provider Number</label>
              <input
                type="text"
                value={personalDetails.providerNumber}
                onChange={(e) => handlePersonalDetailChange('providerNumber', e.target.value)}
                placeholder="Provider number"
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Address</label>
              <textarea
                value={personalDetails.address}
                onChange={(e) => handlePersonalDetailChange('address', e.target.value)}
                placeholder="Enter practice address..."
                rows={2}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                value={personalDetails.phone}
                onChange={(e) => handlePersonalDetailChange('phone', e.target.value)}
                placeholder="Phone number"
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fax</label>
              <input
                type="tel"
                value={personalDetails.fax}
                onChange={(e) => handlePersonalDetailChange('fax', e.target.value)}
                placeholder="Fax number"
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  // Radio field type
  if (fieldType === 'radio') {
    const quantities = Array.isArray(item.quantities) ? item.quantities : [];
    const currentValue = getCurrentValue();
    const isOtherLike = (s: string) => s.trim().toLowerCase().includes('other');
    const normalizedValue = typeof currentValue === 'object' ? currentValue?.selection : currentValue;
    const isOtherSelected = normalizedValue === 'other' || (typeof normalizedValue === 'string' && isOtherLike(normalizedValue));

    return (
      <div className={className}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {quantities.map((option, index) => {
            const optionValue = isOtherLike(option) ? 'other' : option;
            const isSelected = normalizedValue === optionValue || (isOtherLike(option) && isOtherSelected);

            return (
              <label
                key={index}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50 border-blue-500' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name={item.id}
                  checked={isSelected}
                  onChange={() => {
                    if (isOtherLike(option)) {
                      handleValueChange({ selection: 'other', customValue: '' });
                    } else {
                      handleValueChange(option);
                    }
                  }}
                  className="mr-2"
                />
                <span className="text-sm">{isOtherLike(option) ? 'Other' : option}</span>
              </label>
            );
          })}
        </div>

        {isOtherSelected && (
          <div className="mt-3">
            <label className="block text-sm font-medium mb-1">
              Custom Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter custom quantity (required)"
              value={typeof currentValue === 'object' ? currentValue?.customValue || '' : ''}
              onChange={(e) => handleValueChange({ selection: 'other', customValue: e.target.value })}
              className="w-full max-w-xs p-2 border rounded"
              required
            />
          </div>
        )}

        {renderPersonalisedSection()}
      </div>
    );
  }

  // Checkbox field type
  if (fieldType === 'checkbox') {
    const quantities = Array.isArray(item.quantities) ? item.quantities : [];
    const currentValues = Array.isArray(getCurrentValue()) ? getCurrentValue() : [];

    return (
      <div className={className}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quantities.map((option, index) => (
            <label
              key={index}
              className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                currentValues.includes(option) ? 'bg-blue-50 border-blue-500' : 'bg-white hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={currentValues.includes(option)}
                onChange={(e) => {
                  const newValues = e.target.checked
                    ? [...currentValues, option]
                    : currentValues.filter((v: string) => v !== option);
                  handleValueChange(newValues);
                }}
                className="mr-2"
              />
              <span className="text-sm">{option}</span>
            </label>
          ))}
        </div>
        {renderPersonalisedSection()}
      </div>
    );
  }

  // Select/dropdown field type
  if (fieldType === 'select' || fieldType === 'dropdown') {
    const quantities = Array.isArray(item.quantities) ? item.quantities : [];

    return (
      <div className={className}>
        <select
          value={getCurrentValue()}
          onChange={(e) => handleValueChange(e.target.value)}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select an option</option>
          {quantities.map((option, index) => (
            <option key={index} value={option}>
              {option}
            </option>
          ))}
        </select>
        {renderPersonalisedSection()}
      </div>
    );
  }

  // Textarea field type
  if (fieldType === 'textarea') {
    return (
      <div className={className}>
        <textarea
          value={getCurrentValue()}
          onChange={(e) => handleValueChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
        />
        {renderPersonalisedSection()}
      </div>
    );
  }

  // Number field type
  if (fieldType === 'number') {
    return (
      <div className={className}>
        <input
          type="number"
          value={getCurrentValue()}
          onChange={(e) => handleValueChange(e.target.value)}
          placeholder={placeholder || 'Enter number'}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
        />
        {renderPersonalisedSection()}
      </div>
    );
  }

  // Yes/No field type
  if (fieldType === 'yesno') {
    const currentValue = getCurrentValue();

    return (
      <div className={className}>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleValueChange('yes')}
            className={`flex-1 py-2 px-4 rounded ${
              currentValue === 'yes' ? 'bg-green-500 text-white' : 'bg-gray-200'
            }`}
          >
            ✅ Yes
          </button>
          <button
            type="button"
            onClick={() => handleValueChange('no')}
            className={`flex-1 py-2 px-4 rounded ${
              currentValue === 'no' ? 'bg-red-500 text-white' : 'bg-gray-200'
            }`}
          >
            ❌ No
          </button>
        </div>
        {renderPersonalisedSection()}
      </div>
    );
  }

  // Default: text input
  return (
    <div className={className}>
      <input
        type="text"
        value={getCurrentValue()}
        onChange={(e) => handleValueChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
      />
      {renderPersonalisedSection()}
    </div>
  );
}
