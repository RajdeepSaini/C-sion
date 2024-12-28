document.addEventListener('DOMContentLoaded', () => {
    // Test server connection
    fetch('/api/test')
        .then(res => res.json())
        .then(data => console.log('Server test:', data))
        .catch(err => console.error('Server test failed:', err));

    window.username = '';
    let sessionId = new URLSearchParams(window.location.search).get('session');
    
    // Get username when joining
    username = prompt('Enter your username:');
    while (!username || username.trim() === '') {
        username = prompt('Please enter a valid username:');
    }
    window.username = username.trim();

    // Join session after username is set
    console.log('Attempting to join session:', {
        sessionId,
        username: window.username
    });
    window.socket.emit('join-session', sessionId);
    window.socket.emit('set-username', window.username);

    // Add event listener for queue updates to verify they're being received
    window.socket.on('queue-updated', (queue) => {
        console.log('Received queue update:', queue);
    });

    // Search functionality
    const searchBox = document.querySelector('.search-box');
    const searchButton = document.querySelector('.search-button');
    const resultsContainer = document.querySelector('.results-container');

    async function searchSongs(query) {
        try {
            const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
            const data = await response.json();
            displaySearchResults(data);
        } catch (err) {
            console.error('Error searching:', err);
        }
    }

    function displaySearchResults(songs) {
        resultsContainer.innerHTML = songs.map(song => `
            <div class="song-item" data-spotify-id="${song.id || ''}" data-preview-url="${song.preview_url || ''}">
                <img src="${song.album.images[2]?.url || '/images/default-album.png'}" alt="Album art">
                <div class="song-info">
                    <h3>${song.name}</h3>
                    <p>${song.artists[0].name}</p>
                </div>
                <div class="song-actions">
                    <button class="action-btn play-btn" title="Play Now">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="action-btn queue-btn" title="Add to Queue">
                        <i class="fas fa-list"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Add click handlers for play and queue buttons
        resultsContainer.querySelectorAll('.song-item').forEach(songItem => {
            const playBtn = songItem.querySelector('.play-btn');
            const queueBtn = songItem.querySelector('.queue-btn');
            const spotifyId = songItem.dataset.spotifyId;

            // Validate Spotify ID
            if (!spotifyId) {
                console.error('Invalid Spotify ID for song:', songItem.querySelector('h3').textContent);
                playBtn.disabled = true;
                queueBtn.disabled = true;
                return;
            }

            const songName = songItem.querySelector('h3').textContent;
            const artistName = songItem.querySelector('p').textContent;
            const albumArt = songItem.querySelector('img').src;

            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!spotifyId || spotifyId.length < 5) {
                    console.error('Invalid Spotify ID:', spotifyId);
                    return;
                }
                const songData = {
                    spotifyId,
                    name: songName,
                    artist: artistName,
                    albumArt
                };
                console.log('Playing song with data:', songData);
                window.playSong(songData);
            });

            queueBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const queueData = {
                    spotifyId,
                    name: songName,
                    artist: artistName,
                    albumArt,
                    addedBy: window.username
                };
                console.log('CLIENT: Attempting to send queue update:', queueData);
                window.socket.emit('queue-update', {
                    spotifyId,
                    name: songName,
                    artist: artistName,
                    albumArt,
                    addedBy: window.username
                });
            });
        });
    }

    searchButton.addEventListener('click', () => {
        const query = searchBox.value.trim();
        if (query) {
            searchSongs(query);
        }
    });

    searchBox.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchBox.value.trim();
            if (query) {
                searchSongs(query);
            }
        }
    });

    // Session ID display and copy functionality
    const sessionIdDisplay = document.getElementById('sessionIdDisplay');
    const copyButton = document.getElementById('copyButton');
    const userCount = document.getElementById('userCount');

    sessionIdDisplay.textContent = sessionId;

    copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(sessionId);
        copyButton.textContent = 'Copied!';
        setTimeout(() => {
            copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy';
        }, 2000);
    });

    // Socket event handlers
    window.socket.on('user-count', (count) => {
        userCount.textContent = count;
    });

    window.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
    });

    window.socket.on('error', (error) => {
        console.error('Socket error:', error);
    });

    // Queue functionality
    const queueList = document.querySelector('.queue-list');
    const queueCount = document.getElementById('queueCount');

    window.socket.on('queue-updated', (queue) => {
        queueList.innerHTML = queue.map(song => `
            <div class="queue-item" data-spotify-id="${song.spotifyId}">
                <img src="${song.albumArt}" alt="Album art">
                <div class="queue-item-info">
                    <div class="queue-item-title">${song.name}</div>
                    <div class="queue-item-artist">${song.artist}</div>
                </div>
                <div class="queue-item-added">Added by ${song.addedBy}</div>
            </div>
        `).join('');
        
        queueCount.textContent = `${queue.length} song${queue.length !== 1 ? 's' : ''}`;
    });

    // Handle queue item clicks
    queueList.addEventListener('click', (e) => {
        const queueItem = e.target.closest('.queue-item');
        if (queueItem) {
            const songData = {
                name: queueItem.querySelector('.queue-item-title').textContent,
                artist: queueItem.querySelector('.queue-item-artist').textContent,
                albumArt: queueItem.querySelector('img').src,
                spotifyId: queueItem.dataset.spotifyId
            };
            window.playSong(songData);
        }
    });

    // Theme switcher
    const themeSwitch = document.getElementById('checkbox');
    
    // Check for saved theme preference
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        document.documentElement.setAttribute('data-theme', currentTheme);
        if (currentTheme === 'dark') {
            themeSwitch.checked = true;
        }
    }
    
    // Theme switch handler
    themeSwitch.addEventListener('change', function(e) {
        if (e.target.checked) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    });
}); 