// UI rendering and DOM manipulation for Basem & Amira's wedding app

// Active audio tracking
let currentAudio = null;
let currentPlayButton = null;

/**
 * Initialize floating hearts background animation
 */
function initBackgroundHearts() {
    const container = document.getElementById('background-hearts');
    if (!container) return;

    // Clear previous hearts
    container.innerHTML = '';

    // Generate random heart particles
    const icons = ['❤️', '💖', '💝', '💕', '💘'];
    
    function createHeart() {
        const heart = document.createElement('div');
        heart.classList.add('heart');
        heart.innerText = icons[Math.floor(Math.random() * icons.length)];
        
        heart.style.left = `${Math.random() * 100}vw`;
        heart.style.animationDuration = `${Math.random() * 4 + 6}s`; // 6-10s
        heart.style.fontSize = `${Math.random() * 15 + 15}px`; // 15-30px
        
        container.appendChild(heart);
        
        // Remove after animation completes
        setTimeout(() => {
            heart.remove();
        }, 10000);
    }

    // Initial batch
    for (let i = 0; i < 15; i++) {
        setTimeout(createHeart, Math.random() * 8000);
    }

    // Keep generating
    setInterval(createHeart, 800);
}

/**
 * Show a floating toast notification
 * @param {string} message 
 * @param {string} type - 'success', 'error', 'info' 
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '<i class="fas fa-check-circle"></i>';
    if (type === 'error') {
        icon = '<i class="fas fa-exclamation-circle"></i>';
    } else if (type === 'info') {
        icon = '<i class="fas fa-info-circle"></i>';
    }

    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);

    // Fade out and remove
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 3500);
}

/**
 * Helper to update navbar header with username
 */
function updateHeaderUser(username) {
    const headerUserContainer = document.getElementById('header-user-container');
    if (!headerUserContainer) return;

    if (username) {
        const initials = username.trim().substring(0, 2).toUpperCase();
        headerUserContainer.innerHTML = `
            <div class="user-profile">
                <div class="user-avatar">${initials}</div>
                <span>Welcome, <strong>${escapeHTML(username)}</strong></span>
                <button class="change-name-btn" onclick="appChangeName()">Change</button>
            </div>
        `;
    } else {
        headerUserContainer.innerHTML = '';
    }
}

/**
 * Show search loading indicator
 */
function toggleSearchLoading(isLoading) {
    const container = document.getElementById('search-results-container');
    if (!container) return;

    if (isLoading) {
        container.innerHTML = `
            <div class="spinner-container">
                <div class="spinner"></div>
                <p style="color: var(--text-muted);">Finding your music, please wait...</p>
            </div>
        `;
    }
}

/**
 * Render search results cards
 * @param {Array} tracks 
 * @param {Array} addedSongIds - List of already chosen shazam song keys 
 */
function renderSearchResults(tracks, addedSongIds = []) {
    const container = document.getElementById('search-results-container');
    if (!container) return;

    if (!tracks || tracks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <h3 class="empty-state-title">No Songs Found</h3>
                <p>Try searching for another song name or artist!</p>
            </div>
        `;
        return;
    }

    let html = `
        <div class="results-grid" id="search-results-grid"></div>
        <div id="search-loading-more" class="spinner-container" style="display: none; padding: 25px 0;">
            <div class="spinner"></div>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Loading more songs...</p>
        </div>
    `;
    container.innerHTML = html;

    appendSearchResults(tracks, addedSongIds, 0);
}

/**
 * Append additional track cards to the search results grid
 * @param {Array} tracks 
 * @param {Array} addedSongIds 
 * @param {number} startIndex - index of track in AppState.searchResults
 */
function appendSearchResults(tracks, addedSongIds = [], startIndex = 0) {
    const grid = document.getElementById('search-results-grid');
    if (!grid) return;

    let html = '';
    tracks.forEach((track, index) => {
        const globalIndex = startIndex + index;
        const isAdded = addedSongIds.includes(String(track.shazam_song_id));
        const addedBadgeOrButton = isAdded 
            ? `<div class="badge-added"><i class="fas fa-heart"></i> Already in Wedding</div>`
            : `<button class="btn-add-song" onclick="appAddSong(${globalIndex})">
                 <i class="fas fa-plus"></i> Add to Wedding
               </button>`;

        const previewButton = track.preview_url 
            ? `<div class="preview-overlay" onclick="togglePlayPreview(event, '${track.preview_url}', this)">
                 <button class="play-circle-btn"><i class="fas fa-play"></i></button>
               </div>`
            : `<div class="preview-overlay" style="cursor: default;" onclick="event.stopPropagation()">
                 <span style="font-size: 0.8rem; background: rgba(0,0,0,0.7); padding: 5px 10px; border-radius: 12px; color: #ff9f9f;">No Preview Available</span>
               </div>`;

        html += `
            <div class="glass-card song-card">
                <div class="card-image-wrapper">
                    <img src="${track.cover_image_url}" class="card-image" alt="${escapeHTML(track.song_title)}" onerror="this.src='https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300'">
                    ${previewButton}
                </div>
                <div class="song-title" title="${escapeHTML(track.song_title)}">${escapeHTML(track.song_title)}</div>
                <div class="song-artist" title="${escapeHTML(track.artist_name)}">${escapeHTML(track.artist_name)}</div>
                <div class="card-actions">
                    ${addedBadgeOrButton}
                </div>
            </div>
        `;
    });

    grid.insertAdjacentHTML('beforeend', html);
}

/**
 * Toggle the visibility of the "load more" spinner at the bottom of search results
 * @param {boolean} show 
 */
function toggleSearchLoadMoreIndicator(show) {
    const spinner = document.getElementById('search-loading-more');
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Handle audio play/pause preview
 */
function togglePlayPreview(event, url, containerEl) {
    if (event) event.stopPropagation();

    let playBtn = null;
    
    // Find the actual button inside the container element
    if (containerEl) {
        playBtn = containerEl.querySelector('.play-circle-btn') || containerEl;
    }

    if (currentAudio && currentAudio.src === url) {
        // Same audio file clicked
        if (currentAudio.paused) {
            currentAudio.play();
            setPlayState(playBtn, true);
        } else {
            currentAudio.pause();
            setPlayState(playBtn, false);
        }
    } else {
        // Stop currently playing audio
        stopAllAudio();

        // Start new audio
        currentAudio = new Audio(url);
        currentPlayButton = playBtn;

        currentAudio.play().then(() => {
            setPlayState(playBtn, true);
        }).catch(err => {
            console.error('Audio playback failed:', err);
            showToast("Failed to play preview", "error");
        });

        // Reset state when ended
        currentAudio.onended = () => {
            setPlayState(playBtn, false);
            currentAudio = null;
            currentPlayButton = null;
        };
    }
}

function setPlayState(button, isPlaying) {
    if (!button) return;

    if (isPlaying) {
        button.classList.add('playing');
        button.innerHTML = '<i class="fas fa-pause"></i>';
    } else {
        button.classList.remove('playing');
        button.innerHTML = '<i class="fas fa-play"></i>';
    }
}

function stopAllAudio() {
    if (currentAudio) {
        currentAudio.pause();
        setPlayState(currentPlayButton, false);
    }
    currentAudio = null;
    currentPlayButton = null;
}

function renderPlaylistTable(songs, totalCount, currentPage, itemsPerPage) {
    const tableContainer = document.getElementById('playlist-table-container');
    const headerContainer = document.getElementById('playlist-header-container');

    if (!songs || songs.length === 0) {
        headerContainer.innerHTML = `
            <div class="playlist-info-title">Wedding Playlist</div>
            <div class="playlist-count">0 Songs</div>
        `;
        tableContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎵</div>
                <h3 class="empty-state-title">Playlist is Empty</h3>
                <p>Be the first of Basem & Amira's friends to add a song!</p>
            </div>
        `;
        return;
    }

    // Render playlist header
    headerContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
            <div class="playlist-info-title">Wedding Playlist</div>
            <div class="playlist-count">${totalCount} Songs</div>
        </div>
        <button class="btn-download" onclick="appDownloadPlaylist()">
            <i class="fas fa-download"></i> Download List (.txt)
        </button>
    `;

    const isAdmin = localStorage.getItem('wedding_username') === 'basem_admin';

    // Render table structure
    let tableHtml = `
        <div class="table-wrapper">
            <table class="songs-table">
                <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th>Song Info</th>
                        <th>Added By</th>
                        <th style="width: 80px; text-align: center;">Preview</th>
                        ${isAdmin ? '<th style="width: 80px; text-align: center;">Delete</th>' : ''}
                    </tr>
                </thead>
                <tbody>
    `;

    const startIndex = (currentPage - 1) * itemsPerPage;

    songs.forEach((song, index) => {
        const rowNumber = startIndex + index + 1;
        const playBtnHtml = song.preview_url 
            ? `<button class="play-row-btn" onclick="togglePlayPreview(event, '${song.preview_url}', this)">
                 <i class="fas fa-play"></i>
               </button>`
            : `<span style="font-size: 0.75rem; color: #ff9f9f;">N/A</span>`;

        const deleteBtnHtml = isAdmin
            ? `<td style="text-align: center;">
                 <button class="play-row-btn" style="color: #ff9f9f; border-color: rgba(255, 159, 159, 0.3);" onclick="appDeleteSong('${song.id}', '${escapeHTML(song.song_title)}')">
                     <i class="fas fa-trash"></i>
                 </button>
               </td>`
            : '';

        tableHtml += `
            <tr>
                <td>${rowNumber}</td>
                <td>
                    <div class="td-song-info">
                        <img src="${song.cover_image_url}" class="table-cover" alt="cover" onerror="this.src='https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100'">
                        <div>
                            <div class="table-song-title">
                                <a href="${song.shazam_url || '#'}" target="_blank" style="color: var(--text-white); text-decoration: none;">
                                    ${escapeHTML(song.song_title)} <i class="fas fa-external-link-alt" style="font-size:0.7rem; color: var(--gold); margin-left:4px;"></i>
                                </a>
                            </div>
                            <div class="table-song-artist">${escapeHTML(song.artist_name)}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="added-by-badge">${escapeHTML(song.added_by)}</span>
                </td>
                <td style="text-align: center;">
                    ${playBtnHtml}
                </td>
                ${deleteBtnHtml}
            </tr>
        `;
    });

    tableHtml += `
                </tbody>
            </table>
        </div>
    `;

    tableContainer.innerHTML = tableHtml;

    // Render pagination controls if needed
    renderPaginationControls(totalCount, currentPage, itemsPerPage);
}

/**
 * Render pagination controls centered below table
 */
function renderPaginationControls(totalCount, currentPage, itemsPerPage) {
    const container = document.getElementById('playlist-pagination-container');
    if (!container) return;

    const totalPages = Math.ceil(totalCount / itemsPerPage);
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `
        <div class="pagination">
            <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="appGoToPage(${currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        html += `
            <button class="page-btn ${currentPage === i ? 'active' : ''}" onclick="appGoToPage(${i})">
                ${i}
            </button>
        `;
    }

    html += `
            <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="appGoToPage(${currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;

    container.innerHTML = html;
}

// Utility to escape HTML to prevent XSS
function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
