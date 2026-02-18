/**
 * Clinic Selection Dropdown Component
 */


import { useClinics } from '../hooks/useClinics';

interface ClinicSelectProps {
  brandId: string;
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ClinicSelect({
  brandId,
  value,
  onValueChange,
  placeholder = 'Select a clinic',
  disabled = false,
  className = '',
}: ClinicSelectProps) {
  const { clinics, loading, error } = useClinics(brandId);

  if (loading) {
    return (
      <select disabled className={`w-full p-2 border rounded ${className}`}>
        <option>Loading clinics...</option>
      </select>
    );
  }

  if (error || clinics.length === 0) {
    return (
      <select disabled className={`w-full p-2 border rounded ${className}`}>
        <option>No clinics available</option>
      </select>
    );
  }

  return (
    <select
      value={value || ''}
      onChange={(e) => onValueChange(e.target.value)}
      disabled={disabled}
      className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
    >
      <option value="">{placeholder}</option>
      {clinics.map((clinic) => (
        <option key={clinic.id} value={clinic.id}>
          {clinic.name}
        </option>
      ))}
    </select>
  );
}
