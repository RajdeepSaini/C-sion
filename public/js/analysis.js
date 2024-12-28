document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const analysisPanel = document.getElementById('analysisPanel');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const sessionDuration = document.getElementById('sessionDuration');
    const totalSongs = document.getElementById('totalSongs');
    const activeUsers = document.getElementById('activeUsers');
    const topSongs = document.getElementById('topSongs');
    const userLeaderboard = document.getElementById('userLeaderboard');
    const sessionInsights = document.getElementById('sessionInsights');
    const toggleAnalysis = document.getElementById('toggleAnalysis');
    const analysisClose = document.querySelector('.analysis-close');

    // Check if elements exist
    if (!analysisPanel || !toggleAnalysis) {
        console.error('Analysis elements not found:', {
            panel: !!analysisPanel,
            toggle: !!toggleAnalysis
        });
        return;
    }

    console.log('Analysis panel initialized');

    // Session start time
    let sessionStartTime = new Date();
    let songPlayCounts = new Map();
    let userContributions = new Map();
    let genreData = new Map();

    // Initialize with overview tab active
    document.querySelector('.tab-btn[data-tab="overview"]')?.classList.add('active');
    document.getElementById('overview')?.classList.add('active');

    // Tab switching
    document.querySelectorAll('.tab-item').forEach(tabItem => {
        tabItem.addEventListener('click', () => {
            const tabId = tabItem.querySelector('.tab-btn').dataset.tab;
            if (!tabId) return;

            // Remove active class from all buttons and contents
            document.querySelectorAll('.tab-item').forEach(item => item.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked button and corresponding content
            tabItem.classList.add('active');
            const tabContent = document.getElementById(tabId);
            if (tabContent) {
                tabContent.classList.add('active');
                updateTabContent(tabId);
            }
        });
    });

    // Update session duration every second
    setInterval(updateSessionDuration, 1000);

    function updateSessionDuration() {
        const now = new Date();
        const diff = now - sessionStartTime;
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        sessionDuration.textContent = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function updateTabContent(tab) {
        if (!tab) return;
        
        // Destroy chart if switching away from genres tab
        if (tab !== 'genres' && genreChart) {
            genreChart.destroy();
            genreChart = null;
        }

        switch(tab) {
            case 'overview':
                // No need for separate update - overview stats are updated via socket events
                break;
            case 'top-songs':
                if (lastReceivedData?.topSongs) {
                    updateTopSongsDisplay(lastReceivedData.topSongs);
                }
                break;
            case 'genres':
                // Create canvas if it doesn't exist
                if (!document.getElementById('genreChart')) {
                    const genresTab = document.getElementById('genres');
                    const canvas = document.createElement('canvas');
                    canvas.id = 'genreChart';
                    genresTab.innerHTML = '';
                    genresTab.appendChild(canvas);
                    initGenreChart();
                }
                if (lastReceivedData?.genres) {
                    updateGenreChartDisplay(lastReceivedData.genres);
                }
                break;
            case 'users':
                if (lastReceivedData?.userContributions) {
                    updateLeaderboardDisplay(lastReceivedData.userContributions);
                }
                break;
            case 'insights':
                updateInsights();
                break;
        }
    }

    // Store the last received analytics data
    let lastReceivedData = null;

    // Socket event listeners
    window.socket.on('song-change', (data) => {
        console.log('Song change event received in analysis.js:', data);
        // Update song play count
        const songId = data.spotifyId;
        songPlayCounts.set(songId, (songPlayCounts.get(songId) || 0) + 1);
        console.log('Updated songPlayCounts:', songPlayCounts);
    });

    window.socket.on('queue-update', (queue) => {
        console.log('Queue update event received in analysis.js:', queue);
        totalSongs.textContent = `${queue.length} songs`;
        
        // Update user contributions
        queue.forEach(song => {
            userContributions.set(
                song.addedBy, 
                (userContributions.get(song.addedBy) || 0) + 1
            );
        });
        console.log('Updated userContributions:', userContributions);
    });

    window.socket.on('user-count', (count) => {
        activeUsers.textContent = `${count} users`;
    });

    window.socket.on('analytics-update', (data) => {
        console.log('Received analytics update:', data);
        lastReceivedData = data;

        // Update all stats immediately when data is received
        updateAllStats(data);
    });

    function updateAllStats(data) {
        if (data.sessionStart) {
            sessionStartTime = new Date(data.sessionStart);
            updateSessionDuration();
        }

        if (data.totalSongs !== undefined) {
            totalSongs.textContent = `${data.totalSongs} songs`;
        }

        if (data.activeUsers !== undefined) {
            activeUsers.textContent = `${data.activeUsers} users`;
        }

        if (data.topSongs) {
            updateTopSongsDisplay(data.topSongs);
        }

        if (data.userContributions) {
            updateLeaderboardDisplay(data.userContributions);
        }

        if (data.genres) {
            updateGenreChartDisplay(data.genres);
        }

        // Update insights
        updateInsights();

        // Update the currently active tab
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) {
            updateTabContent(activeTab.dataset.tab);
        }
    }

    function updateTopSongsDisplay(songs) {
        if (!topSongs) return;
        if (!songs || songs.length === 0) {
            topSongs.innerHTML = 'No songs played yet';
            return;
        }

        const maxPlays = Math.max(...songs.map(song => song.count));
        const mostPlayed = songs.filter(song => song.count === maxPlays);
        const otherSongs = songs.filter(song => song.count < maxPlays);
        
        topSongs.innerHTML = `
            <div class="most-played-section">
                <div class="section-header">
                    <h4 class="section-title">Most Played</h4>
                </div>
                ${mostPlayed.map(song => `
                    <div class="most-played-song">
                        <div class="crown-icon">
                            <i class="fas fa-crown"></i>
                        </div>
                        <div class="song-info">
                            <span class="song-name text-truncate">${song.name || 'Unknown Song'}</span>
                            <span class="song-artist text-truncate">${song.artist || 'Unknown Artist'}</span>
                            <span class="play-count-label">${song.count} times played</span>
                            <div class="song-genres">
                                ${(song.genres || []).slice(0, 2).map(genre => 
                                    `<span class="genre-tag">${genre}</span>`
                                ).join('')}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            ${otherSongs.length > 0 ? `
                <div class="other-songs">
                    <h4 class="section-title">Play History</h4>
                    <div class="songs-list">
                        ${otherSongs.map(song => `
                            <div class="song-item">
                                <div class="song-info">
                                    <span class="song-name text-truncate">${song.name || 'Unknown Song'}</span>
                                    <span class="song-artist text-truncate">${song.artist || 'Unknown Artist'}</span>
                                </div>
                                <span class="play-count">${song.count} plays</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    }

    function updateLeaderboardDisplay(contributions) {
        if (contributions.length === 0) {
            userLeaderboard.innerHTML = 'No contributions yet';
            return;
        }

        userLeaderboard.innerHTML = contributions
            .sort((a, b) => b[1] - a[1])
            .map(([username, count], index) => `
                <div class="leaderboard-item">
                    <span class="leaderboard-rank">#${index + 1}</span>
                    <span class="username">${username}</span>
                    <span class="contribution-count">${count} songs</span>
                </div>
            `).join('');
    }

    function updateInsights() {
        if (!lastReceivedData) {
            sessionInsights.innerHTML = '<div class="insight-item">Waiting for session data...</div>';
            return;
        }

        const insights = [
            `Session started ${getTimeAgo(sessionStartTime)}`,
            `Most popular genre: ${lastReceivedData.genres?.[0]?.[0] || 'None yet'}`,
            `${lastReceivedData.uniqueSongs || 0} unique songs played`,
            `Most active user: ${getMostActiveUser()}`,
            `Session mood: ${calculateSessionMood(lastReceivedData.genres)}`
        ];

        sessionInsights.innerHTML = insights.map(insight => `
            <div class="insight-item">
                <i class="fas fa-info-circle"></i>
                ${insight}
            </div>
        `).join('');
    }

    function getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };

        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
            }
        }
        return 'just now';
    }

    // Initialize Chart.js for genre visualization
    let genreChart = null;
    function initGenreChart() {
        // Check if chart already exists or if we're not in genres tab
        if (genreChart || !document.getElementById('genres').classList.contains('active')) return;
        
        const canvas = document.getElementById('genreChart');
        if (!canvas) return;
        
        const ctx = document.getElementById('genreChart').getContext('2d');
        genreChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Energy', 'Danceability', 'Mood', 'Tempo', 'Popularity'],
                datasets: [{
                    label: 'Genre Distribution',
                    data: [0, 0, 0, 0, 0],
                    backgroundColor: 'rgba(29, 185, 84, 0.2)',
                    borderColor: 'rgba(29, 185, 84, 1)',
                    pointBackgroundColor: 'rgba(29, 185, 84, 1)',
                    pointBorderColor: 'rgba(29, 185, 84, 1)',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(29, 185, 84, 1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20
                        },
                        pointLabels: {
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    // Toggle analysis panel
    toggleAnalysis.addEventListener('click', () => {
        console.log('Toggle analysis clicked');
        analysisPanel.classList.toggle('visible');
        toggleAnalysis.classList.toggle('active');
    });

    // Close analysis panel
    analysisClose.addEventListener('click', () => {
        analysisPanel.classList.remove('visible');
        toggleAnalysis.classList.remove('active');
    });

    // Make analysis panel draggable
    const dragHandle = document.querySelector('.analysis-drag-handle');
    let isDragging = false;
    let currentX, currentY, initialX, initialY;
    let xOffset = 0, yOffset = 0;

    dragHandle.addEventListener('mousedown', (e) => {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        if (e.target === dragHandle || dragHandle.contains(e.target)) {
            isDragging = true;
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            xOffset = currentX;
            yOffset = currentY;
            
            setTranslate(currentX, currentY, analysisPanel);
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate(${xPos}px, ${yPos}px)`;
    }

    function updateGenreChartDisplay(genres) {
        if (!genreChart || !document.getElementById('genres')?.classList.contains('active')) return;
        
        const metrics = calculateGenreMetrics(genres);
        
        genreChart.data.datasets[0].data = [
            metrics.energy,
            metrics.danceability,
            metrics.mood,
            metrics.tempo,
            metrics.popularity
        ];
        genreChart.update();
    }

    function calculateGenreMetrics(genres) {
        const genreWeights = {
            'dance': { energy: 80, danceability: 90, mood: 70, tempo: 85, popularity: 75 },
            'pop': { energy: 70, danceability: 75, mood: 65, tempo: 70, popularity: 85 },
            'rock': { energy: 85, danceability: 60, mood: 60, tempo: 75, popularity: 70 },
            'chill': { energy: 40, danceability: 50, mood: 80, tempo: 45, popularity: 65 },
            'electronic': { energy: 75, danceability: 85, mood: 60, tempo: 80, popularity: 70 }
        };

        let totalWeight = 0;
        const metrics = { energy: 0, danceability: 0, mood: 0, tempo: 0, popularity: 0 };

        genres.forEach(([genre, count]) => {
            for (const [key, weights] of Object.entries(genreWeights)) {
                if (genre.includes(key)) {
                    Object.keys(metrics).forEach(metric => {
                        metrics[metric] += weights[metric] * count;
                    });
                    totalWeight += count;
                    break;
                }
            }
        });

        // Normalize values
        if (totalWeight > 0) {
            Object.keys(metrics).forEach(metric => {
                metrics[metric] = Math.round(metrics[metric] / totalWeight);
            });
        }

        return metrics;
    }

    function getMostActiveUser() {
        let mostActiveUser = '';
        let maxCount = 0;
        for (const [username, count] of userContributions) {
            if (count > maxCount) {
                mostActiveUser = username;
                maxCount = count;
            }
        }
        return mostActiveUser;
    }

    function calculateSessionMood(genres) {
        if (!genres || !genres.length) return 'Not enough data';
        
        const moodMap = {
            'dance': 'Energetic',
            'pop': 'Upbeat',
            'chill': 'Relaxed',
            'rock': 'Energetic',
            'classical': 'Calm',
            'jazz': 'Smooth'
        };
        
        const topGenre = genres[0][0];
        for (const [keyword, mood] of Object.entries(moodMap)) {
            if (topGenre.includes(keyword)) return mood;
        }
        return 'Mixed';
    }
}); 