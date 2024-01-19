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
        const deezerResponse = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(songName)}`);
        const deezerData = await deezerResponse.json();

        if (deezerData.data && deezerData.data.length > 0) {
            const firstResult = deezerData.data[0];
            const songDetails = {
                title: firstResult.title,
                author: firstResult.artist.name,
                thumbnail: firstResult.album.cover_medium,
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
