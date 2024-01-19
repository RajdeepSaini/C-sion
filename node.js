const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const SPOTIFY_CLIENT_ID = 'a8c9c5a6190346359b906f7a865331d5';
const SPOTIFY_CLIENT_SECRET = 'ce3ae0335ac34b8e8c6b308f48de8f6b';

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.post('/song-details', async (req, res) => {
    const songName = req.body.songName;

    try {
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
            },
            body: 'grant_type=client_credentials',
        });

        if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            const accessToken = tokenData.access_token;

            const spotifyResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(songName)}&type=track`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (spotifyResponse.ok) {
                const spotifyData = await spotifyResponse.json();

                if (spotifyData.tracks && spotifyData.tracks.items.length > 0) {
                    const firstResult = spotifyData.tracks.items[0];
                    const songDetails = {
                        title: firstResult.name,
                        author: firstResult.artists[0].name,
                        thumbnail: firstResult.album.images[0].url,
                    };

                    res.json(songDetails);
                } else {
                    res.status(404).json({ error: 'Song not found' });
                }
            } else {
                res.status(spotifyResponse.status).json({ error: 'Error fetching data from Spotify API' });
            }
        } else {
            res.status(tokenResponse.status).json({ error: 'Error fetching Spotify access token' });
        }
    } catch (error) {
        console.error('Error fetching song details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
