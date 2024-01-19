const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.post('/song-details', (req, res) => {
    // In a real application, you would retrieve song details from a database or an external API
    const songDetails = {
        title: req.body.title,
        author: req.body.author,
        thumbnail: req.body.thumbnail,
    };

    res.json(songDetails);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
