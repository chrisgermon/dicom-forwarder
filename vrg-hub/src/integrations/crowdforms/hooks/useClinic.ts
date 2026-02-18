/**
 * Hook to fetch clinic data by ID
 */

import { useState, useEffect } from 'react';
import { fetchClinicById } from '../api';
import type { Clinic } from '../types';

interface UseClinicResult {
  clinic: Clinic | null;
  loading: boolean;
}

export function useClinic(clinicId: string | undefined): UseClinicResult {
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clinicId) {
      setClinic(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await fetchClinicById(clinicId);
        setClinic(data);
      } catch (error) {
        console.error('Error fetching clinic:', error);
        setClinic(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clinicId]);

  return { clinic, loading };
}
