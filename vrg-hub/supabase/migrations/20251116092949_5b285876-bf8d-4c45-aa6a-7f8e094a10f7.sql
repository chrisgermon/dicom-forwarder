
-- Fix newsletter_submissions RLS policies for better insert support

-- Drop existing restrictive insert policy
DROP POLICY IF EXISTS "Contributors can create submissions" ON newsletter_submissions;

-- Create improved insert policy that allows authenticated users to insert with their own ID
CREATE POLICY "Contributors can create submissions" 
ON newsletter_submissions 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = contributor_id);

-- Also ensure update policy is clear
DROP POLICY IF EXISTS "Contributors can update their draft submissions" ON newsletter_submissions;

CREATE POLICY "Contributors can update their draft submissions" 
ON newsletter_submissions 
FOR UPDATE 
TO authenticated
USING (auth.uid() = contributor_id AND status = 'draft')
WITH CHECK (auth.uid() = contributor_id);
