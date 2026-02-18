-- Create QR codes table
CREATE TABLE public.qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  short_code TEXT UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create QR code scans tracking table
CREATE TABLE public.qr_code_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID REFERENCES public.qr_codes(id) ON DELETE CASCADE NOT NULL,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_agent TEXT,
  ip_address TEXT,
  referrer TEXT,
  country TEXT,
  city TEXT,
  device_type TEXT
);

-- Enable RLS
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_code_scans ENABLE ROW LEVEL SECURITY;

-- RLS policies for qr_codes
CREATE POLICY "Users can view their own QR codes"
  ON public.qr_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own QR codes"
  ON public.qr_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own QR codes"
  ON public.qr_codes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own QR codes"
  ON public.qr_codes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for qr_code_scans (users can view scans for their QR codes)
CREATE POLICY "Users can view scans for their QR codes"
  ON public.qr_code_scans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.qr_codes
      WHERE qr_codes.id = qr_code_scans.qr_code_id
      AND qr_codes.user_id = auth.uid()
    )
  );

-- Public insert for tracking (anonymous scans)
CREATE POLICY "Anyone can create scans"
  ON public.qr_code_scans FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_qr_codes_user_id ON public.qr_codes(user_id);
CREATE INDEX idx_qr_codes_short_code ON public.qr_codes(short_code);
CREATE INDEX idx_qr_code_scans_qr_code_id ON public.qr_code_scans(qr_code_id);
CREATE INDEX idx_qr_code_scans_scanned_at ON public.qr_code_scans(scanned_at);

-- Function to generate short codes
CREATE OR REPLACE FUNCTION generate_short_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER update_qr_codes_updated_at
  BEFORE UPDATE ON public.qr_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();