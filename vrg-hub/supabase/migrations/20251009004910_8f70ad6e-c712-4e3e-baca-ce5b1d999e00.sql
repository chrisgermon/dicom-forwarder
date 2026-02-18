-- Add request prefix for Crowd IT company
INSERT INTO public.company_request_prefixes (company_id, prefix)
SELECT '6e30a8f8-11d3-4427-a8e5-0b4b47582e75', 'CIT'
WHERE NOT EXISTS (
  SELECT 1 FROM public.company_request_prefixes 
  WHERE company_id = '6e30a8f8-11d3-4427-a8e5-0b4b47582e75'
);

-- Also initialize the counter for this company if it doesn't exist
INSERT INTO public.company_request_counters (company_id, counter)
SELECT '6e30a8f8-11d3-4427-a8e5-0b4b47582e75', 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.company_request_counters 
  WHERE company_id = '6e30a8f8-11d3-4427-a8e5-0b4b47582e75'
);