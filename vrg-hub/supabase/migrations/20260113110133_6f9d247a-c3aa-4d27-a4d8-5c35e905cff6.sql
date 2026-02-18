-- Create table to store parsed roster entries
CREATE TABLE public.roster_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roster_file_id UUID NOT NULL REFERENCES public.roster_files(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  roster_type TEXT NOT NULL CHECK (roster_type IN ('radiologist', 'staff')),
  staff_name TEXT NOT NULL,
  clinic TEXT,
  role TEXT,
  shift_date DATE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  instance_type TEXT, -- 'Shift' or 'Leave'
  status TEXT,
  leave_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_roster_entries_brand_id ON public.roster_entries(brand_id);
CREATE INDEX idx_roster_entries_roster_file_id ON public.roster_entries(roster_file_id);
CREATE INDEX idx_roster_entries_shift_date ON public.roster_entries(shift_date);
CREATE INDEX idx_roster_entries_staff_name ON public.roster_entries(staff_name);
CREATE INDEX idx_roster_entries_clinic ON public.roster_entries(clinic);

-- Enable Row Level Security
ALTER TABLE public.roster_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view roster entries" 
ON public.roster_entries 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert roster entries" 
ON public.roster_entries 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update roster entries" 
ON public.roster_entries 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete roster entries" 
ON public.roster_entries 
FOR DELETE 
TO authenticated
USING (true);

-- Create trigger to update updated_at
CREATE TRIGGER update_roster_entries_updated_at
BEFORE UPDATE ON public.roster_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();