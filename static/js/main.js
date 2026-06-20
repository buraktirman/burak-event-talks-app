// Application State
let releaseNotes = [];
let filteredNotes = [];
let activeCategory = 'all';
let searchQuery = '';
let selectedNote = null;

// DOM Elements
const notesFeed = document.getElementById('notesFeed');
const refreshBtn = document.getElementById('refreshBtn');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');
const tagFiltersContainer = document.getElementById('tagFilters');
const syncStatusBadge = document.getElementById('syncStatus');
const emptyState = document.getElementById('emptyState');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');

// Modal Elements
const tweetModal = document.getElementById('tweetModal');
const tweetTextArea = document.getElementById('tweetTextArea');
const tweetAttachedLink = document.getElementById('tweetAttachedLink');
const charCountSpan = document.getElementById('charCount');
const progressRingBar = document.getElementById('progressRingBar');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelTweetBtn = document.getElementById('cancelTweetBtn');
const publishTweetBtn = document.getElementById('publishTweetBtn');
const previewBadge = document.getElementById('previewBadge');
const previewDate = document.getElementById('previewDate');
const previewContent = document.getElementById('previewContent');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadReleaseNotes(false);
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    refreshBtn.addEventListener('click', () => loadReleaseNotes(true));
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        clearSearchBtn.style.display = searchQuery ? 'flex' : 'none';
        applyFiltersAndSearch();
    });
    
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        applyFiltersAndSearch();
    });
    
    tagFiltersContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('tag-filter')) {
            document.querySelectorAll('.tag-filter').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            activeCategory = e.target.getAttribute('data-type');
            applyFiltersAndSearch();
        }
    });

    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        activeCategory = 'all';
        document.querySelectorAll('.tag-filter').forEach(btn => {
            if (btn.getAttribute('data-type') === 'all') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        applyFiltersAndSearch();
    });

    // Modal Events
    closeModalBtn.addEventListener('click', closeComposer);
    cancelTweetBtn.addEventListener('click', closeComposer);
    publishTweetBtn.addEventListener('click', publishTweet);
    tweetTextArea.addEventListener('input', updateCharCount);
    
    // Close modal on click outside card
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeComposer();
        }
    });

    // Escape key listener for modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tweetModal.classList.contains('active')) {
            closeComposer();
        }
    });
}

// Fetch Release Notes from API
async function loadReleaseNotes(forceRefresh = false) {
    setLoadingState(true);
    updateSyncStatus('syncing', 'Syncing...');
    
    try {
        const url = `/api/release-notes?refresh=${forceRefresh}`;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            releaseNotes = result.data;
            
            // Set status message based on data source
            if (result.source === 'cache') {
                updateSyncStatus('success', 'Synced (Cache)');
            } else if (result.source === 'feed') {
                updateSyncStatus('success', 'Synced (Live)');
            } else {
                updateSyncStatus('error', 'Synced (Offline Cache)');
            }
            
            applyFiltersAndSearch();
        } else {
            showErrorState(result.message || 'Failed to fetch release notes.');
            updateSyncStatus('error', 'Sync Failed');
        }
    } catch (err) {
        console.error('Error loading notes:', err);
        showErrorState('Failed to connect to the server.');
        updateSyncStatus('error', 'Connection Error');
    } finally {
        setLoadingState(false);
    }
}

// Set visual sync status badge state
function updateSyncStatus(state, text) {
    syncStatusBadge.className = 'status-badge ' + state;
    syncStatusBadge.querySelector('.status-text').innerText = text;
}

// Set Loading Skeleton UI
function setLoadingState(isLoading) {
    if (isLoading) {
        notesFeed.innerHTML = '';
        emptyState.style.display = 'none';
        refreshBtn.classList.add('syncing');
        refreshBtn.disabled = true;
        
        // Render 6 skeletons
        for (let i = 0; i < 6; i++) {
            notesFeed.innerHTML += `
                <div class="card skeleton">
                    <div class="skeleton-header"></div>
                    <div class="skeleton-body"></div>
                    <div class="skeleton-footer"></div>
                </div>
            `;
        }
    } else {
        refreshBtn.classList.remove('syncing');
        refreshBtn.disabled = false;
    }
}

// Render error state on layout
function showErrorState(message) {
    notesFeed.innerHTML = '';
    emptyState.style.display = 'flex';
    emptyState.querySelector('h3').innerText = 'Something went wrong';
    emptyState.querySelector('p').innerText = message;
    emptyState.querySelector('.btn').innerText = 'Retry Fetch';
}

// Apply Filters (Category tag) and Search Text filter
function applyFiltersAndSearch() {
    filteredNotes = releaseNotes.filter(note => {
        // Category Filter
        const matchesCategory = activeCategory === 'all' || 
                               note.type.toLowerCase() === activeCategory.toLowerCase();
        
        // Search Filter
        const matchesSearch = !searchQuery || 
                              note.date.toLowerCase().includes(searchQuery) ||
                              note.type.toLowerCase().includes(searchQuery) ||
                              note.content_text.toLowerCase().includes(searchQuery);
                              
        return matchesCategory && matchesSearch;
    });
    
    renderFeed();
}

// Render current filtered dataset to the feed grid
function renderFeed() {
    notesFeed.innerHTML = '';
    
    if (filteredNotes.length === 0) {
        emptyState.style.display = 'flex';
        emptyState.querySelector('h3').innerText = 'No release notes match your criteria';
        emptyState.querySelector('p').innerText = 'Try clearing your filters or typing a different search query.';
        emptyState.querySelector('.btn').innerText = 'Reset Filters';
        return;
    }
    
    emptyState.style.display = 'none';
    
    filteredNotes.forEach((note, index) => {
        const card = document.createElement('article');
        card.className = 'card animate-fade-in';
        card.style.animationDelay = `${index * 0.05}s`;
        
        const typeClass = note.type.toLowerCase();
        
        card.innerHTML = `
            <div class="card-header">
                <span class="card-date">${note.date}</span>
                <span class="type-badge ${typeClass}">${note.type}</span>
            </div>
            <div class="card-body">
                ${note.content_html}
            </div>
            <div class="card-footer">
                <a href="${note.link}" class="card-origin-link" target="_blank" rel="noopener" title="View original release notes section">
                    <span>docs.cloud.google.com</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                </a>
                <button class="btn-card-tweet" data-id="${note.id}">
                    <svg style="margin-right: 4px; vertical-align: middle;" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    Tweet
                </button>
            </div>
        `;
        
        // Add event listener to card tweet button
        card.querySelector('.btn-card-tweet').addEventListener('click', () => {
            openComposer(note);
        });
        
        notesFeed.appendChild(card);
    });
}

// Open Tweet Composer Modal
function openComposer(note) {
    selectedNote = note;
    
    // Set preview details
    previewBadge.className = 'preview-type-badge ' + note.type.toLowerCase();
    previewBadge.innerText = note.type;
    previewDate.innerText = note.date;
    previewContent.innerHTML = note.content_html;
    
    // Auto-generate standard tweet text format:
    // Google Cloud BigQuery [Type] (Date): Description
    // We will truncate the description so that text + link is well within 280 characters.
    
    const introText = `Google Cloud BigQuery Update [${note.type}] (${note.date}):\n`;
    const linkUrl = note.link || 'https://cloud.google.com/bigquery';
    
    // Allow space for: introText, quotes, spacing, newlines, and the link
    // A Twitter link counts as exactly 23 characters.
    // Max characters = 280
    // Budget: 280 - (introText.length) - (23 for link) - (some buffer)
    const availableLength = 280 - introText.length - 23 - 8;
    
    let descriptionText = note.content_text;
    if (descriptionText.length > availableLength) {
        descriptionText = descriptionText.substring(0, availableLength - 3).trim() + '...';
    }
    
    // Compose final tweet text block
    const tweetText = `${introText}"${descriptionText}"\n\n${linkUrl}`;
    
    tweetTextArea.value = tweetText;
    tweetAttachedLink.innerText = linkUrl.replace('https://', '');
    tweetAttachedLink.title = linkUrl;
    
    // Update count & display
    tweetModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Lock background scroll
    
    updateCharCount();
    
    // Focus and select textarea text
    setTimeout(() => {
        tweetTextArea.focus();
        tweetTextArea.setSelectionRange(introText.length + 1, introText.length + 1 + descriptionText.length);
    }, 100);
}

// Close Tweet Composer Modal
function closeComposer() {
    tweetModal.classList.remove('active');
    document.body.style.overflow = ''; // Unlock background scroll
    selectedNote = null;
}

// Character Count calculator (respecting Twitter's 23-char URL rule)
function updateCharCount() {
    if (!selectedNote) return;
    
    const textVal = tweetTextArea.value;
    const linkUrl = selectedNote.link || 'https://cloud.google.com/bigquery';
    
    let count = 0;
    
    // If the link URL is present in the text, we count it as exactly 23 characters
    if (textVal.includes(linkUrl)) {
        // Strip the URL to count the remaining text
        const textWithoutLink = textVal.replace(linkUrl, '');
        count = textWithoutLink.length + 23;
    } else {
        // If the user modified/removed the link, just count standard string length
        count = textVal.length;
    }
    
    charCountSpan.innerText = count;
    
    // Update visual count indicator styling
    const counterContainer = document.querySelector('.counter-container');
    counterContainer.classList.remove('warn', 'danger');
    
    if (count > 280) {
        counterContainer.classList.add('danger');
        publishTweetBtn.disabled = true;
    } else if (count > 250) {
        counterContainer.classList.add('warn');
        publishTweetBtn.disabled = false;
    } else {
        publishTweetBtn.disabled = count === 0;
    }
    
    // Update SVG progress ring
    const percentage = Math.min(100, (count / 280) * 100);
    const r = 9; // Radius
    const circumference = 2 * Math.PI * r; // ~56.54
    const offset = circumference - (percentage / 100) * circumference;
    
    progressRingBar.style.strokeDashoffset = offset;
    
    // Change progress ring color dynamically
    if (count > 280) {
        progressRingBar.style.stroke = '#f43f5e'; // Red
    } else if (count > 250) {
        progressRingBar.style.stroke = '#d97706'; // Amber
    } else {
        progressRingBar.style.stroke = '#1d9bf0'; // Twitter Blue
    }
}

// Publish/redirect to Twitter
function publishTweet() {
    const text = tweetTextArea.value;
    if (!text.trim()) return;
    
    // Open Twitter intent in new window
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(intentUrl, '_blank', 'width=550,height=420,referrerpolicy=no-referrer');
    
    // Close modal composer
    closeComposer();
}
