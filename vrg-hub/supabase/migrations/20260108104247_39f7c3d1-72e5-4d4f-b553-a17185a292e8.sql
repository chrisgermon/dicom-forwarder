-- Referrers table with full-text search
CREATE TABLE public.referrer_directory (
  id SERIAL PRIMARY KEY,
  referrer_key INTEGER NOT NULL,
  referrer_code TEXT,
  referrer_name TEXT NOT NULL,
  first_name TEXT,
  surname TEXT,
  specialities TEXT,
  email TEXT,
  phone TEXT,
  provider_number TEXT,
  clinic_key INTEGER,
  clinic_name TEXT,
  clinic_phone TEXT,
  address TEXT,
  suburb TEXT,
  state TEXT,
  postcode TEXT,
  
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('simple',
      COALESCE(referrer_name, '') || ' ' ||
      COALESCE(provider_number, '') || ' ' ||
      COALESCE(specialities, '') || ' ' ||
      COALESCE(clinic_name, '') || ' ' ||
      COALESCE(suburb, '') || ' ' ||
      COALESCE(postcode, '')
    )
  ) STORED,
  
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(referrer_key, provider_number)
);

CREATE INDEX idx_referrer_directory_search ON public.referrer_directory USING GIN(search_vector);
CREATE INDEX idx_referrer_directory_clinic ON public.referrer_directory(clinic_key);
CREATE INDEX idx_referrer_directory_name ON public.referrer_directory(referrer_name);

-- Clinics directory table with full-text search
CREATE TABLE public.clinic_directory (
  id SERIAL PRIMARY KEY,
  clinic_key INTEGER UNIQUE NOT NULL,
  clinic_name TEXT NOT NULL,
  clinic_code TEXT,
  clinic_phone TEXT,
  address TEXT,
  suburb TEXT,
  state TEXT,
  postcode TEXT,
  referrer_count INTEGER DEFAULT 0,
  
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('simple',
      COALESCE(clinic_name, '') || ' ' ||
      COALESCE(address, '') || ' ' ||
      COALESCE(suburb, '') || ' ' ||
      COALESCE(postcode, '')
    )
  ) STORED,
  
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_clinic_directory_search ON public.clinic_directory USING GIN(search_vector);
CREATE INDEX idx_clinic_directory_name ON public.clinic_directory(clinic_name);

-- Sync history table
CREATE TABLE public.referrer_sync_history (
  id SERIAL PRIMARY KEY,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  referrer_count INTEGER,
  clinic_count INTEGER,
  status TEXT DEFAULT 'running',
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.referrer_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrer_sync_history ENABLE ROW LEVEL SECURITY;

-- Allow read access to all users (public lookup)
CREATE POLICY "Allow read access to referrer_directory" ON public.referrer_directory FOR SELECT USING (true);
CREATE POLICY "Allow read access to clinic_directory" ON public.clinic_directory FOR SELECT USING (true);
CREATE POLICY "Allow read access to sync history" ON public.referrer_sync_history FOR SELECT USING (true);