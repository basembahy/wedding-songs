// Application state, routing, and event orchestration

// Global state
const AppState = {
    username: localStorage.getItem('wedding_username') || '',
    searchResults: [],
    playlistSongs: [], // All chosen songs in DB
    addedSongIds: [], // Cache of shazam keys already in DB
    playlistCurrentPage: 1,
    playlistItemsPerPage: 10,
    autocompleteDebounceTimer: null,
    searchQuery: '',
    searchOffset: 0,
    searchLimit: 5,
    isLoadingMore: false,
    hasMoreResults: true
};

// Initialize Application on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
    // Start background heart animations
    initBackgroundHearts();
    
    // Bind routing events
    window.addEventListener('hashchange', router);
    
    // Setup scroll listener for lazy loading search results
    window.addEventListener('scroll', handleWindowScroll);
    
    // Setup form submit handlers
    setupEventHandlers();

    // Trigger initial route
    router();
});

/**
 * Handle routing based on user state and URL hash
 */
async function router() {
    // Stop any playing audio on page change
    stopAllAudio();

    // Check if user is logged in (has name saved)
    if (!AppState.username) {
        window.location.hash = '';
        showPage('page-welcome');
        updateHeaderUser(null);
        return;
    }

    updateHeaderUser(AppState.username);

    // Parse route hash
    const hash = window.location.hash || '#search';
    
    if (hash === '#search') {
        showPage('page-search');
        setNavActive('btn-nav-search');
        
        // Refresh cache of already added songs
        await refreshAddedSongsCache();
        
        // If results exist, rerender to show updated added status
        if (AppState.searchResults.length > 0) {
            renderSearchResults(AppState.searchResults, AppState.addedSongIds);
        }
    } else if (hash === '#playlist') {
        showPage('page-playlist');
        setNavActive('btn-nav-playlist');
        await loadPlaylist();
    }
}

/**
 * Switch page visibility
 */
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    const activePage = document.getElementById(pageId);
    if (activePage) activePage.classList.add('active');
}

/**
 * Update active button style in navbar
 */
function setNavActive(btnId) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.getElementById(btnId);
    if (activeBtn) activeBtn.classList.add('active');
}

/**
 * Attach UI events
 */
function setupEventHandlers() {
    // Welcome Form Submit
    const welcomeForm = document.getElementById('welcome-form');
    if (welcomeForm) {
        welcomeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('guest-name');
            const name = nameInput.value.trim();
            
            if (name) {
                AppState.username = name;
                localStorage.setItem('wedding_username', name);
                showToast(`Welcome, ${name}! Let's pick some songs 💒`, 'success');
                window.location.hash = '#search';
            }
        });
    }

    // Search Input Autocomplete Debounce
    const searchInput = document.getElementById('song-search-input');
    const dropdown = document.getElementById('autocomplete-dropdown');

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(AppState.autocompleteDebounceTimer);
            const term = searchInput.value.trim();
            
            if (term.length < 3) {
                dropdown.classList.remove('active');
                return;
            }

            AppState.autocompleteDebounceTimer = setTimeout(async () => {
                const suggestions = await fetchAutocomplete(term);
                renderAutocompleteDropdown(suggestions);
            }, 500); // 500ms debounce to save API requests
        });

        // Hide autocomplete when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    }

    // Full Search Form Submit
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            dropdown.classList.remove('active');
            
            const term = searchInput.value.trim();
            if (!term) return;

            // Reset search paging state
            AppState.searchQuery = term;
            AppState.searchOffset = 0;
            AppState.hasMoreResults = true;
            AppState.isLoadingMore = false;
            AppState.searchResults = [];

            toggleSearchLoading(true);
            try {
                // Fetch current added cache first
                await refreshAddedSongsCache();
                
                // Query Shazam API
                const tracks = await searchSongs(term, AppState.searchOffset, AppState.searchLimit);
                AppState.searchResults = tracks;
                
                renderSearchResults(tracks, AppState.addedSongIds);

                if (tracks.length < AppState.searchLimit) {
                    AppState.hasMoreResults = false;
                } else {
                    // Check if we need to load more because page is too short to scroll
                    setTimeout(checkAndAutoLoadMore, 400);
                }
            } catch (error) {
                console.error(error);
                showToast("Search failed. Check API limit or connectivity.", "error");
                renderSearchResults([], []);
            }
        });
    }
}

/**
 * Render Autocomplete Dropdown List
 */
function renderAutocompleteDropdown(suggestions) {
    const dropdown = document.getElementById('autocomplete-dropdown');
    if (!dropdown) return;

    if (!suggestions || suggestions.length === 0) {
        dropdown.classList.remove('active');
        return;
    }

    let html = '';
    suggestions.forEach(term => {
        html += `
            <div class="autocomplete-item" onclick="appSelectSuggestion('${term.replace(/'/g, "\\'")}')">
                <i class="fas fa-search"></i>
                <span>${term}</span>
            </div>
        `;
    });

    dropdown.innerHTML = html;
    dropdown.classList.add('active');
}

/**
 * Handle user clicking an autocomplete suggestion
 */
window.appSelectSuggestion = function(term) {
    const searchInput = document.getElementById('song-search-input');
    const dropdown = document.getElementById('autocomplete-dropdown');
    
    if (searchInput) {
        searchInput.value = term;
    }
    if (dropdown) {
        dropdown.classList.remove('active');
    }
    
    // Trigger form submit
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.dispatchEvent(new Event('submit'));
    }
};

/**
 * Refresh list of already added songs
 */
async function refreshAddedSongsCache() {
    try {
        const songs = await fetchWeddingSongs();
        AppState.addedSongIds = songs.map(s => String(s.shazam_song_id));
    } catch (err) {
        console.error("Failed to refresh added songs cache:", err);
    }
}

/**
 * Triggered when user clicks "Add to Wedding"
 * @param {number} trackIndex 
 */
window.appAddSong = async function(trackIndex) {
    const track = AppState.searchResults[trackIndex];
    if (!track) return;

    try {
        // Prepare record
        const songData = {
            ...track,
            added_by: AppState.username
        };

        // Insert in DB
        await addSongToWedding(songData);
        
        // Show success notification
        showToast(`"${track.song_title}" has been added to the playlist! 💒`, 'success');
        
        // Update local cache
        AppState.addedSongIds.push(String(track.shazam_song_id));
        
        // Rerender search results to reflect the state
        renderSearchResults(AppState.searchResults, AppState.addedSongIds);
    } catch (error) {
        if (error.message === "Already added") {
            showToast("This song is already in the playlist!", "info");
        } else {
            showToast("Failed to add song to the database", "error");
        }
    }
};

/**
 * Load chosen songs from Supabase database and render playlist
 */
async function loadPlaylist() {
    const tableContainer = document.getElementById('playlist-table-container');
    if (tableContainer) {
        tableContainer.innerHTML = `
            <div class="spinner-container">
                <div class="spinner"></div>
                <p style="color: var(--text-muted);">Loading wedding playlist...</p>
            </div>
        `;
    }

    try {
        const allSongs = await fetchWeddingSongs();
        AppState.playlistSongs = allSongs;
        AppState.addedSongIds = allSongs.map(s => String(s.shazam_song_id));

        // Get paginated slice
        const paginatedSongs = getPaginatedSongs();
        
        renderPlaylistTable(
            paginatedSongs, 
            allSongs.length, 
            AppState.playlistCurrentPage, 
            AppState.playlistItemsPerPage
        );
    } catch (error) {
        console.error(error);
        showToast("Failed to load playlist from Supabase", "error");
        if (tableContainer) {
            tableContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon" style="color: #ff9f9f;"><i class="fas fa-exclamation-triangle"></i></div>
                    <h3 class="empty-state-title">Failed to load playlist</h3>
                    <p>Please check your connection and try again.</p>
                </div>
            `;
        }
    }
}

/**
 * Slice songs array for current page
 */
function getPaginatedSongs() {
    const startIndex = (AppState.playlistCurrentPage - 1) * AppState.playlistItemsPerPage;
    const endIndex = startIndex + AppState.playlistItemsPerPage;
    return AppState.playlistSongs.slice(startIndex, endIndex);
}

/**
 * Triggered by pagination controls
 */
window.appGoToPage = function(pageNumber) {
    const totalPages = Math.ceil(AppState.playlistSongs.length / AppState.playlistItemsPerPage);
    if (pageNumber < 1 || pageNumber > totalPages) return;
    
    // Stop inline table previews playing
    stopAllAudio();
    
    AppState.playlistCurrentPage = pageNumber;
    const paginatedSongs = getPaginatedSongs();
    
    renderPlaylistTable(
        paginatedSongs,
        AppState.playlistSongs.length,
        AppState.playlistCurrentPage,
        AppState.playlistItemsPerPage
    );
};

/**
 * Compile chosen songs list into txt and trigger download
 */
window.appDownloadPlaylist = function() {
    if (AppState.playlistSongs.length === 0) {
        showToast("No songs to download!", "info");
        return;
    }

    // Header content
    let content = `💒 Basem & Amira's Wedding Songs Playlist 💒\n`;
    content += `===============================================\n`;
    content += `Generated on: ${new Date().toLocaleDateString()}\n`;
    content += `Total Songs Chosen: ${AppState.playlistSongs.length}\n\n`;

    AppState.playlistSongs.forEach((song, index) => {
        content += `${index + 1}. "${song.song_title}" - ${song.artist_name} (Added by: ${song.added_by})\n`;
    });

    // Create file blob
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `basem_and_amira_wedding_playlist.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast("Downloaded playlist file successfully!", "success");
};

/**
 * Handle guest name changing
 */
window.appChangeName = function() {
    localStorage.removeItem('wedding_username');
    AppState.username = '';
    AppState.searchResults = [];
    AppState.searchQuery = '';
    
    // Clear search elements
    const searchInput = document.getElementById('song-search-input');
    if (searchInput) searchInput.value = '';
    
    const resultsContainer = document.getElementById('search-results-container');
    if (resultsContainer) resultsContainer.innerHTML = '';
    
    router();
};

/**
 * Handle window scrolling to trigger infinite scroll/lazy loading
 */
async function handleWindowScroll() {
    // Only run on search page
    const hash = window.location.hash || '#search';
    if (hash !== '#search') return;
    
    if (!AppState.username || !AppState.searchQuery) return;
    if (AppState.isLoadingMore || !AppState.hasMoreResults) return;

    // Trigger loading when user is 200px from the bottom of the page
    const threshold = 200;
    const scrollPosition = window.innerHeight + window.scrollY;
    const documentHeight = document.documentElement.scrollHeight || document.body.offsetHeight;

    if (scrollPosition >= documentHeight - threshold) {
        AppState.isLoadingMore = true;
        await loadMoreSearchResults();
    }
}

/**
 * Fetch and append more search results
 */
async function loadMoreSearchResults() {
    toggleSearchLoadMoreIndicator(true);
    
    // Calculate new offset based on loaded count
    AppState.searchOffset += AppState.searchLimit;

    try {
        const nextTracks = await searchSongs(AppState.searchQuery, AppState.searchOffset, AppState.searchLimit);
        
        if (nextTracks.length === 0) {
            AppState.hasMoreResults = false;
            toggleSearchLoadMoreIndicator(false);
            showToast("No more songs found.", "info");
            return;
        }

        const startIndex = AppState.searchResults.length;
        
        // Append to local state
        AppState.searchResults = AppState.searchResults.concat(nextTracks);
        
        // Refresh DB cache
        await refreshAddedSongsCache();
        
        // Append cards to grid
        appendSearchResults(nextTracks, AppState.addedSongIds, startIndex);

        if (nextTracks.length < AppState.searchLimit) {
            AppState.hasMoreResults = false;
            showToast("All search results loaded.", "info");
        } else {
            // Check again if page is still too short to scroll
            setTimeout(checkAndAutoLoadMore, 400);
        }
    } catch (error) {
        console.error("Failed to load more songs:", error);
        showToast("Failed to load more songs.", "error");
        AppState.searchOffset -= AppState.searchLimit; // Rollback offset
    } finally {
        AppState.isLoadingMore = false;
        toggleSearchLoadMoreIndicator(false);
    }
}

/**
 * Check if the page is too short to show scrollbar and auto load more if needed
 */
function checkAndAutoLoadMore() {
    // Only run on search page
    const hash = window.location.hash || '#search';
    if (hash !== '#search') return;

    if (!AppState.username || !AppState.searchQuery) return;
    if (AppState.isLoadingMore || !AppState.hasMoreResults) return;

    const documentHeight = document.documentElement.scrollHeight || document.body.offsetHeight;
    const windowHeight = window.innerHeight;

    // If document is shorter than window viewport + safety margin, load next page
    if (documentHeight <= windowHeight + 150) {
        AppState.isLoadingMore = true;
        loadMoreSearchResults();
    }
}

/**
 * Handle deleting a song from the playlist (authorized for basem_admin)
 * @param {string} songId 
 * @param {string} songTitle 
 */
window.appDeleteSong = async function(songId, songTitle) {
    // Safety check just in case
    const username = localStorage.getItem('wedding_username');
    if (username !== 'basem_admin') {
        showToast("Unauthorized access", "error");
        return;
    }

    if (confirm(`Are you sure you want to delete "${songTitle}" from the wedding playlist?`)) {
        try {
            await deleteSongFromWedding(songId);
            showToast(`"${songTitle}" deleted successfully.`, "success");
            
            // Reload playlist to show updated list
            await loadPlaylist();
        } catch (error) {
            console.error("Failed to delete song:", error);
            showToast("Failed to delete song from database.", "error");
        }
    }
};
