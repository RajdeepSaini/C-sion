let isPlaying = false;
    let player; // reference to the YouTube iframe

    function playOrPause() {
      if (isPlaying) {
        pauseVideo();
      } else {
        playVideo();
      }
    }

    function playVideo() {
      if (player) {
        player.playVideo();
        isPlaying = true;
        document.getElementById('playPauseBtn').innerText = 'Pause';
      }
    }

    function pauseVideo() {
      if (player) {
        player.pauseVideo();
        isPlaying = false;
        document.getElementById('playPauseBtn').innerText = 'Play';
      }
    }

    function seekTo() {
      const progressBar = document.getElementById('progressBar');
      const seekToValue = player.getDuration() * (progressBar.value / 100);
      player.seekTo(seekToValue, true);
    }

    function onYouTubeIframeAPIReady() {
      player = new YT.Player('videoPlayer', {
        height: '315',
        width: '560',
        playerVars: {
         'autoplay': 1,
         },
        videoId: '', // Replace with the actual video ID when available
        events: {
          'onReady': onPlayerReady,
          'onStateChange': onPlayerStateChange
        }
      });
    }

    function onPlayerReady(event) {
      document.getElementById('progressBar').max = player.getDuration();
      setInterval(updateProgressBar, 1000);
    }

    function onPlayerStateChange(event) {
      if (event.data === YT.PlayerState.ENDED) {
        isPlaying = false;
        document.getElementById('playPauseBtn').innerText = 'Play';
      }
    }

    function updateProgressBar() {
      const progressBar = document.getElementById('progressBar');
      const currentTime = player.getCurrentTime();
      progressBar.value = (currentTime / player.getDuration()) * 100;
    }

    function searchAndPlay() {
      searchSong();
      playVideo();
    }

    function searchSong() {
      const userInput = document.getElementById('songInput').value;

      const apiUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(userInput)}&entity=song`;

      fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
          const song = data.results[0];
          if (song) {
            document.getElementById('songTitle').innerText = song.trackName;
            document.getElementById('artistName').innerText = song.artistName;
            document.getElementById('thumbnail').src = song.artworkUrl100;

            const apiKey = 'AIzaSyAzfZkwYXOwNwlp7v6f3B-piDBJxusQWMI';
            const videoApiUrl = `https://www.googleapis.com/youtube/v3/search?q=${encodeURIComponent(song.trackName + ' ' + song.artistName + ' lyrics')}&part=snippet&key=${apiKey}&type=video`;

            return fetch(videoApiUrl);
          } else {
            alert('Song not found!');
          }
        })
        .then(response => response.json())
        .then(data => {
          const videoId = data.items[0].id.videoId;
          if (videoId) {
            // Set the videoId for the YouTube iframe
            player.loadVideoById(videoId);
          } else {
            alert('Video not found!');
          }
        })
        .catch(error => {
          console.error('Error fetching song information:', error);
        });
    }