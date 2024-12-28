document.addEventListener('DOMContentLoaded', () => {
    const audioPlayer = document.getElementById('audio-player');
    const nowPlaying = document.getElementById('now-playing');
    const nowPlayingArtist = document.getElementById('now-playing-artist');
    const playBtn = document.getElementById('play-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const progressBar = document.querySelector('.progress-bar');
    const progress = document.querySelector('.progress');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');
    const vinyl = document.querySelector('.now-playing-art');

    let currentSongIndex = -1;
    let songs = [];
    let isPlaying = false;
    let isRepeat = false;
    let volume = 0.5;
    let currentSong = null;

    // Format time in minutes:seconds
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Play/Pause functionality
    playBtn.addEventListener('click', () => {
        if (isPlaying) {
            audioPlayer.pause();
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
            vinyl.classList.remove('playing');
            window.socket.emit('playback-toggle', { isPlaying: false });
        } else {
            audioPlayer.play();
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            vinyl.classList.add('playing');
            window.socket.emit('playback-toggle', { isPlaying: true });
        }
        isPlaying = !isPlaying;
    });

    // Previous/Next buttons
    prevBtn.addEventListener('click', () => {
        if (currentSongIndex > 0) {
            playSong(songs[currentSongIndex - 1]);
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentSongIndex < songs.length - 1) {
            playSong(songs[currentSongIndex + 1]);
        }
    });

    // Progress bar functionality
    audioPlayer.addEventListener('timeupdate', () => {
        const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progress.style.width = percent + '%';
        currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
    });

    audioPlayer.addEventListener('loadedmetadata', () => {
        durationEl.textContent = formatTime(audioPlayer.duration);
    });

    progressBar.addEventListener('click', (e) => {
        const percent = e.offsetX / progressBar.offsetWidth;
        audioPlayer.currentTime = percent * audioPlayer.duration;
        window.socket.emit('seek', audioPlayer.currentTime);
    });

    // Handle song ending
    audioPlayer.addEventListener('ended', () => {
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        vinyl.classList.remove('playing');
        nextBtn.click();
    });

    // Play song function
    window.playSong = function(songData) {
        currentSong = songData;
        
        try {
            // Validate song data
            if (!songData.spotifyId || typeof songData.spotifyId !== 'string' || songData.spotifyId.length < 5) {
                throw new Error(`Invalid Spotify ID: ${songData.spotifyId}`);
            }

            isPlaying = true;
            nowPlaying.textContent = 'Loading...';
            
            if (audioPlayer.src) {
                audioPlayer.pause();
                audioPlayer.currentTime = 0;
            }

            // Set new audio source
            audioPlayer.src = `/api/play/${songData.spotifyId}`;
            
            // Update now playing info
            document.getElementById('now-playing').textContent = songData.name;
            document.getElementById('now-playing-artist').textContent = songData.artist;
            
            // Update vinyl with album art
            const vinylArt = document.querySelector('.now-playing-art');
            vinylArt.innerHTML = '';
            
            // Add album art
            const albumArtImg = document.createElement('img');
            albumArtImg.src = songData.albumArt;
            albumArtImg.alt = 'Album art';
            vinylArt.appendChild(albumArtImg);
            
            // Add vinyl elements
            const vinylLines = document.createElement('div');
            vinylLines.className = 'vinyl-lines';
            vinylArt.appendChild(vinylLines);
            
            const vinylHole = document.createElement('div');
            vinylHole.className = 'vinyl-hole';
            vinylArt.appendChild(vinylHole);

            // Play the audio
            const playPromise = audioPlayer.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error("Playback was prevented:", error);
                    nowPlaying.textContent = 'Error: Could not play song';
                    isPlaying = false;
                    vinyl.classList.remove('playing');
                });
            }

            // Update UI
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            vinyl.classList.add('playing');

            // Emit the currently playing song
            window.socket.emit('song-change', {
                spotifyId: songData.spotifyId,
                songName: songData.name,
                artistName: songData.artist,
                albumArt: songData.albumArt,
                isPlaying: true,
                currentTime: 0
            });
        } catch (err) {
            console.error('Error playing song:', err);
            console.error('Song data:', songData);
            nowPlaying.textContent = 'Error playing song';
            isPlaying = false;
            vinyl.classList.remove('playing');
        }
    };

    // Socket event listeners for playback sync
    socket.on('playback-toggle', (state) => {
        if (state.isPlaying) {
            audioPlayer.play();
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            vinyl.classList.add('playing');
        } else {
            audioPlayer.pause();
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
            vinyl.classList.remove('playing');
        }
    });

    socket.on('seek', (time) => {
        audioPlayer.currentTime = time;
    });

    socket.on('song-change', async (data) => {
        const { spotifyId, songName, artistName } = data;
        nowPlaying.textContent = 'Loading...';
        try {
            audioPlayer.src = `/api/play/${spotifyId}`;
            await audioPlayer.play();
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            nowPlaying.textContent = songName;
            nowPlayingArtist.textContent = artistName;
            vinyl.classList.add('playing');
        } catch (err) {
            console.error('Error playing song:', err);
            nowPlaying.textContent = 'Error playing song';
            vinyl.classList.remove('playing');
        }
    });

    // Repeat functionality
    const repeatBtn = document.querySelector('.fa-redo').parentElement;
    repeatBtn.addEventListener('click', () => {
        isRepeat = !isRepeat;
        repeatBtn.style.color = isRepeat ? '#1db954' : '#b3b3b3';
        audioPlayer.loop = isRepeat;
    });

    // Volume control
    const volumeBtn = document.querySelector('.fa-volume-up').parentElement;
    const volumeBar = document.querySelector('.volume-bar');
    const volumeLevel = document.querySelector('.volume-level');

    // Initialize audio player
    audioPlayer.volume = 1;
    volume = 1;
    volumeLevel.style.width = '100%';

    volumeBar.addEventListener('click', (e) => {
        const rect = volumeBar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        volume = Math.max(0, Math.min(1, x / rect.width));
        updateVolume(volume);
    });

    volumeBtn.addEventListener('click', () => {
        if (audioPlayer.volume > 0) {
            volumeBtn.querySelector('i').className = 'fas fa-volume-mute';
            updateVolume(0);
        } else {
            volumeBtn.querySelector('i').className = 'fas fa-volume-up';
            updateVolume(volume);
        }
    });

    function updateVolume(value) {
        audioPlayer.volume = value;
        volumeLevel.style.width = `${value * 100}%`;
        
        // Update volume icon based on level
        const icon = volumeBtn.querySelector('i');
        if (value === 0) {
            icon.className = 'fas fa-volume-mute';
        } else if (value < 0.5) {
            icon.className = 'fas fa-volume-down';
        } else {
            icon.className = 'fas fa-volume-up';
        }
    }
}); 