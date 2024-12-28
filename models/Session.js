const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    username: String,
    content: String,
    reactions: [{
        emoji: String,
        by: String
    }],
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const sessionSchema = new mongoose.Schema({
    sessionId: { 
        type: String, 
        unique: true,
        required: true 
    },
    sessionName: String,
    sessionType: {
        type: String,
        enum: ['public', 'private'],
        required: true
    },
    sessionImage: {
        type: String,
        default: '/images/default-session.png' // Default image path
    },
    createdAt: { 
        type: Date, 
        default: Date.now,
        expires: function() {
            return this.sessionType === 'private' ? 3600 : 7 * 24 * 3600; // 1 hour for private, 7 days for public
        }
    },
    currentPlayback: {
        spotifyId: String,
        songName: String,
        isPlaying: Boolean,
        currentTime: Number,
        volume: Number
    },
    queue: [{
        spotifyId: String,
        name: String,
        artist: String,
        albumArt: String,
        addedBy: String
    }],
    permissions: {
        onlyHostCanPlay: { type: Boolean, default: false },
        allowQueueing: { type: Boolean, default: true },
        allowChat: { type: Boolean, default: true }
    },
    sessionDuration: { 
        type: Number, 
        default: 3600,  // 60 minutes in seconds
        min: 900       // 15 minutes minimum
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    stats: {
        songsPlayed: [{
            spotifyId: String,
            name: String,
            playCount: Number,
            lastPlayedAt: Date
        }]
    },
    connectedUsers: {
        type: Number,
        default: 0
    },
    messages: [messageSchema],
    connectedUsernames: [{
        type: String
    }],
    status: {
        type: String,
        enum: ['active', 'ended'],
        default: 'active'
    },
    hostUsername: String,
    lastActive: { type: Date, default: Date.now }
});

// Update lastActivity on any interaction
sessionSchema.pre('save', function(next) {
    this.lastActivity = new Date();
    next();
});

module.exports = mongoose.model('Session', sessionSchema); 