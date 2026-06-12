-- SQL Script to set up Basem & Amira's wedding database in Supabase
-- Paste this script into Supabase SQL Editor and click "Run"

-- 1. Create the wedding_songs table
CREATE TABLE IF NOT EXISTS public.wedding_songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shazam_song_id TEXT NOT NULL UNIQUE,
    song_title TEXT NOT NULL,
    artist_name TEXT NOT NULL,
    cover_image_url TEXT,
    preview_url TEXT,
    shazam_url TEXT,
    added_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Enable Row Level Security (RLS) to protect the DB from direct unchecked updates
ALTER TABLE public.wedding_songs ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- Policy: Enable read access for anyone (so all friends can see the chosen list)
CREATE POLICY "Allow public read access" 
ON public.wedding_songs 
FOR SELECT 
USING (true);

-- Policy: Enable insert access for anyone (so any guest can submit a song without signing up)
CREATE POLICY "Allow public insert access" 
ON public.wedding_songs 
FOR INSERT 
WITH CHECK (true);

-- Policy: Enable delete access for anyone (so admin can delete songs from the browser client)
CREATE POLICY "Allow public delete access" 
ON public.wedding_songs 
FOR DELETE 
USING (true);
