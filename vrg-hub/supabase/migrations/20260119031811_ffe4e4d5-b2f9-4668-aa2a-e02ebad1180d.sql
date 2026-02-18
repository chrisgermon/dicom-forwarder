-- Add policy allowing users to delete their own Office 365 connections
CREATE POLICY "Users can delete their own Office 365 connections"
ON public.office365_connections
FOR DELETE
USING (auth.uid() = user_id);