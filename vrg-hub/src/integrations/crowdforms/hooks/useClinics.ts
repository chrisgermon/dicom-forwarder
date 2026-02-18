/**
 * Hook to fetch all clinics for a brand
 */

import { useState, useEffect } from 'react';
import { fetchClinicsForBrand } from '../api';
import type { Clinic } from '../types';

interface UseClinicsResult {
  clinics: Clinic[];
  loading: boolean;
  error: string | null;
}

export function useClinics(brandId: string | undefined): UseClinicsResult {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!brandId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchClinicsForBrand(brandId);
        setClinics(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load clinics');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [brandId]);

  return { clinics, loading, error };
}
