-- Run this in Supabase SQL Editor to enable saving AI results

ALTER TABLE quiz_attempts 
ADD COLUMN IF NOT EXISTS ai_analysis jsonb;

-- NEW: Social Features
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_seen timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Policy examples (enable RLS in dashboard for these if not already)
-- create policy "Users can see messages they are part of" on messages for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
-- create policy "Users can send messages" on messages for insert with check (auth.uid() = sender_id);
