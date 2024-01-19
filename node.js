const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.post('/song-details', async (req, res) => {
    const songName = req.body.songName;

    try {
        const lastFmResponse = await fetch(`http://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(songName)}&api_key=YOUR_LASTFM_API_KEY&format=json`);
        const lastFmData = await lastFmResponse.json();

        if (lastFmData.results && lastFmData.results.trackmatches.track.length > 0) {
            const firstResult = lastFmData.results.trackmatches.track[0];
            const songDetails = {
                title: firstResult.name,
                author: firstResult.artist,
                thumbnail: firstResult.image[2]['#text'], // Use a suitable image size
            };

            res.json(songDetails);
        } else {
            res.status(404).json({ error: 'Song not found' });
        }
    } catch (error) {
        console.error('Error fetching song details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
