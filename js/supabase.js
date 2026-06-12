// Supabase integration for Basem & Amira's wedding playlist
let supabaseClient = null;

function getSupabaseClient() {
    if (!supabaseClient) {
        const url = window.APP_CONFIG.SUPABASE_URL;
        const key = window.APP_CONFIG.SUPABASE_KEY;
        if (!url || !key) {
            console.error("Supabase config is missing!");
            return null;
        }
        // supabase is loaded from CDN in index.html
        supabaseClient = window.supabase.createClient(url, key);
    }
    return supabaseClient;
}

/**
 * Fetch all chosen songs from the wedding_songs table
 * Ordered by creation date (latest first)
 */
async function fetchWeddingSongs() {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('wedding_songs')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching wedding songs:', error);
        throw error;
    }
    return data || [];
}

/**
 * Check if a song has already been added to the wedding list
 * @param {string} shazamSongId 
 */
async function checkIsSongAdded(shazamSongId) {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { data, error } = await supabase
        .from('wedding_songs')
        .select('id')
        .eq('shazam_song_id', String(shazamSongId))
        .maybeSingle();

    if (error) {
        console.error('Error checking duplicate song:', error);
        return false;
    }
    return data !== null;
}

/**
 * Add a new song to the wedding playlist
 * @param {Object} songInfo 
 */
async function addSongToWedding(songInfo) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database client not initialized");

    // Double check duplicate on client side first
    const isAdded = await checkIsSongAdded(songInfo.shazam_song_id);
    if (isAdded) {
        throw new Error("Already added");
    }

    const { data, error } = await supabase
        .from('wedding_songs')
        .insert([{
            shazam_song_id: String(songInfo.shazam_song_id),
            song_title: songInfo.song_title,
            artist_name: songInfo.artist_name,
            cover_image_url: songInfo.cover_image_url,
            preview_url: songInfo.preview_url,
            shazam_url: songInfo.shazam_url,
            added_by: songInfo.added_by
        }])
        .select();

    if (error) {
        console.error('Error adding song to Supabase:', error);
        throw error;
    }
    return data;
}

/**
 * Delete a song from the wedding playlist
 * @param {string} songId - UUID of the song row in DB
 */
async function deleteSongFromWedding(songId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database client not initialized");

    const { data, error } = await supabase
        .from('wedding_songs')
        .delete()
        .eq('id', songId)
        .select();

    if (error) {
        console.error('Error deleting song from Supabase:', error);
        throw error;
    }
    return data;
}
