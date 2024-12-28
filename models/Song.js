const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
    spotifyId: { type: String, unique: true },
    name: String,
    artist: String,
    albumArt: String,
    filePath: String,
    downloadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Song', songSchema); 