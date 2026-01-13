-- Run this in Supabase SQL Editor to enable saving AI results

ALTER TABLE quiz_attempts 
ADD COLUMN IF NOT EXISTS ai_analysis jsonb;

-- Policy to allow users to update their own attempts (already likely exists, but good to be sure)
-- create policy "Users can update their own attempts" on quiz_attempts for update using (auth.uid() = initiator_id or auth.uid() = partner_id);
