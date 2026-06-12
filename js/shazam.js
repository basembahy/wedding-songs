// Shazam API integration using RapidAPI (shazam.p.rapidapi.com)

/**
 * Helper to get a random RapidAPI key from the configured list
 * @returns {string|null}
 */
function getRandomRapidApiKey() {
    const keys = window.APP_CONFIG.RAPIDAPI_KEYS;
    if (Array.isArray(keys) && keys.length > 0) {
        const randomIndex = Math.floor(Math.random() * keys.length);
        return keys[randomIndex];
    }
    return window.APP_CONFIG.RAPIDAPI_KEY || null;
}

/**
 * Fetch autocomplete suggestions as the user types
 * @param {string} term 
 */
async function fetchAutocomplete(term) {
    if (!term || term.trim().length < 3) return [];

    const key = getRandomRapidApiKey();
    const host = window.APP_CONFIG.RAPIDAPI_HOST;

    if (!key) {
        console.error("RapidAPI key is missing!");
        return [];
    }

    try {
        const url = `https://${host}/v2/auto-complete?term=${encodeURIComponent(term)}&locale=en-US`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': host,
                'x-rapidapi-key': key,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Parse terms array from autocomplete response
        let suggestions = [];
        if (data.results && Array.isArray(data.results.terms)) {
            suggestions = data.results.terms;
        }
        
        return [...new Set(suggestions)].slice(0, 8); // Unique top 8 suggestions
    } catch (error) {
        console.error('Error fetching Shazam autocomplete:', error);
        return [];
    }
}

/**
 * Perform a full song search to retrieve tracks with complete metadata (cover, preview, artist)
 * @param {string} term 
 * @param {number} offset
 * @param {number} limit
 */
async function searchSongs(term, offset = 0, limit = 12) {
    if (!term || term.trim().length === 0) return [];

    const key = getRandomRapidApiKey();
    const host = window.APP_CONFIG.RAPIDAPI_HOST;

    try {
        const url = `https://${host}/v2/search?term=${encodeURIComponent(term)}&locale=en-US&offset=${offset}&limit=${limit}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': host,
                'x-rapidapi-key': key,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Process track data to be standard and clean based on Shazam v2 response
        const tracks = [];
        if (data.results && data.results.songs && Array.isArray(data.results.songs.data)) {
            data.results.songs.data.forEach(song => {
                const attrs = song.attributes || {};
                
                // Get preview URL
                let previewUrl = '';
                if (Array.isArray(attrs.previews) && attrs.previews.length > 0) {
                    previewUrl = attrs.previews[0].url || '';
                }
                
                // Get cover image, replace template width and height with 300
                let coverUrl = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'; // Fallback
                if (attrs.artwork && attrs.artwork.url) {
                    coverUrl = attrs.artwork.url.replace('{w}', '300').replace('{h}', '300');
                }

                tracks.push({
                    shazam_song_id: song.id,
                    song_title: attrs.name || 'Unknown Song',
                    artist_name: attrs.artistName || 'Unknown Artist',
                    cover_image_url: coverUrl,
                    preview_url: previewUrl,
                    shazam_url: attrs.url || `https://www.shazam.com/track/${song.id}`
                });
            });
        }
        
        return tracks;
    } catch (error) {
        console.error('Error searching Shazam songs:', error);
        throw error;
    }
}

