/**
 * Hook to fetch form data (brand, sections, items) for a form code
 */

import { useState, useEffect } from 'react';
import { fetchBrandForForm, fetchProductsForBrand } from '../api';
import type { Brand, ProductSection, ProductItem } from '../types';

interface UseFormDataResult {
  brand: Brand | null;
  sections: ProductSection[];
  items: ProductItem[];
  loading: boolean;
  error: string | null;
}

export function useFormData(formCode: string | undefined): UseFormDataResult {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [sections, setSections] = useState<ProductSection[]>([]);
  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!formCode) {
      setLoading(false);
      setError('No form code provided');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch brand
        const brandData = await fetchBrandForForm(formCode);
        if (!brandData) {
          setError('Form not found');
          return;
        }
        setBrand(brandData);

        // Fetch products
        const productsData = await fetchProductsForBrand(formCode);
        setSections(productsData.sections);
        setItems(productsData.items);
      } catch (err: any) {
        setError(err.message || 'Failed to load form');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [formCode]);

  return { brand, sections, items, loading, error };
}
