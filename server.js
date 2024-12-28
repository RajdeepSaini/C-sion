const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const SpotifyWebApi = require('spotify-web-api-node');
const cors = require('cors');
const mongoose = require('mongoose');
const youtubedl = require('youtube-dl-exec');
const ytdl = require('@distube/ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { nanoid } = require('nanoid/non-secure');
const multer = require('multer');

const Song = require('./models/Song');
const Session = require('./models/Session');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Debug socket connections
io.engine.on("connection_error", (err) => {
    console.log('Connection error:', err.req);      // the request object
    console.log('Error message:', err.code);     // the error code, for example 1
    console.log('Error message:', err.message);  // the error message, for example "Session ID unknown"
    console.log('Error context:', err.context);  // some additional error context
});

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/session-images')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, 'session-' + uniqueSuffix + path.extname(file.originalname))
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('public/uploads'));
app.use('/downloads', express.static('downloads'));

// Test route
app.get('/api/test', (req, res) => {
    console.log('Test route hit');
    res.json({ status: 'Server is running' });
});

// Serve home.html as the default page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve session.html as the session page
app.get('/session', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'session.html'));
});

// Serve register.html as the register page
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'auth.html'));
});

// Serve login.html as the login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'auth.html'));
});

// Connect to MongoDB
mongoose.connect('mongodb://localhost/music_player', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Successfully connected to MongoDB.');
}).catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('Trying alternative connection...');
    return mongoose.connect('mongodb://127.0.0.1:27017/music_player', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
}).catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

// Monitor MongoDB connection
mongoose.connection.on('error', err => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

process.on('SIGINT', async () => {
    await mongoose.connection.close();
    process.exit(0);
});

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI
});

// Refresh Spotify access token
async function refreshToken() {
    try {
        const data = await spotifyApi.clientCredentialsGrant();
        spotifyApi.setAccessToken(data.body['access_token']);
        console.log('Token refreshed');
    } catch (err) {
        console.error('Error refreshing token:', err);
        setTimeout(refreshToken, 5000);
    }
}

// Refresh token every 50 minutes
setInterval(refreshToken, 50 * 60 * 1000);
refreshToken().catch(err => {
    console.error('Initial token refresh failed:', err);
    process.exit(1);
});

app.get('/api/search', async (req, res) => {
    try {
        const { query } = req.query;
        console.log('Searching for:', query);
        const data = await spotifyApi.searchTracks(query);
        console.log('Spotify response:', data.body);
        if (data.body.tracks && Array.isArray(data.body.tracks.items)) {
            console.log('Found', data.body.tracks.items.length, 'songs');
            res.json(data.body.tracks.items);
        } else {
            console.log('No tracks found in response');
            res.json([]);
        }
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Add this function to search and download from YouTube
async function downloadSong(title, artist, spotifyId) {
    try {
        const searchQuery = `${title} ${artist} official audio`;
        const ytdlpPath = path.join(__dirname, 'yt-dlp.exe');
        const searchCommand = `"${ytdlpPath}" ytsearch1:"${searchQuery}" --get-id --no-warnings`;
        
        console.log('Searching for:', searchQuery);
        
        const videoId = await new Promise((resolve, reject) => {
            require('child_process').exec(searchCommand, (error, stdout, stderr) => {
                if (error) reject(error);
                resolve(stdout.trim());
            });
        });

        console.log('Found video ID:', videoId);

        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const outputPath = path.join(__dirname, 'downloads', `${spotifyId}.mp3`);

        // First download as mp4
        const tempPath = path.join(__dirname, 'downloads', `${spotifyId}_temp.mp4`);
        
        // Download the audio
        const downloadCommand = `"${ytdlpPath}" -f "bestaudio[ext=m4a]" -o "${tempPath}" ${videoUrl}`;
        
        await new Promise((resolve, reject) => {
            require('child_process').exec(downloadCommand, (error, stdout, stderr) => {
                if (error) reject(error);
                resolve();
            });
        });

        // Then convert to mp3 using ffmpeg
        return new Promise((resolve, reject) => {
            ffmpeg(tempPath)
                .setFfmpegPath('C:\\Program Files\\ffmpeg\\ffmpeg-2024-12-09-git-d21134313f-full_build\\bin\\ffmpeg.exe')
                .toFormat('mp3')
                .on('error', (err) => {
                    console.error('FFmpeg error:', err);
                    reject(err);
                })
                .on('end', () => {
                    // Delete temp file
                    fs.unlink(tempPath, (err) => {
                        if (err) console.error('Error deleting temp file:', err);
                    });
                    resolve(outputPath);
                })
                .save(outputPath);
        });

    } catch (error) {
        console.error('Error downloading song:', error);
        throw error;
    }
}

// Update the play endpoint
app.get('/api/play/:spotifyId', async (req, res) => {
    try {
        const { spotifyId } = req.params;
        
        // Check if song exists in database
        let song = await Song.findOne({ spotifyId });
        
        if (song && fs.existsSync(song.filePath)) {
            // If song exists, stream it
            console.log('Streaming existing song:', song.filePath);
            res.sendFile(song.filePath);
        } else {
            // If song doesn't exist, get it from Spotify and download
            const trackData = await spotifyApi.getTrack(spotifyId);
            const track = trackData.body;
            
            console.log('Downloading:', track.name, 'by', track.artists[0].name);
            
            // Download the song
            const filePath = await downloadSong(
                track.name,
                track.artists[0].name,
                spotifyId
            );
            
            console.log('Download complete:', filePath);
            
            // Save to database
            song = await Song.create({
                spotifyId,
                name: track.name,
                artist: track.artists[0].name,
                albumArt: track.album.images[0].url,
                filePath
            });
            
            // Stream the downloaded file
            console.log('Streaming newly downloaded song:', filePath);
            res.set('Content-Type', 'audio/mpeg');
            res.sendFile(filePath);
        }
    } catch (err) {
        console.error('Error playing song:', err);
        console.error('Full error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Session management endpoints
app.post('/api/session/create', upload.single('sessionImage'), async (req, res) => {
    try {
        const { sessionType, sessionName } = req.body;
        const sessionId = nanoid(6).toUpperCase();
        
        await Session.create({ 
            sessionId,
            sessionType,
            sessionName: sessionType === 'public' ? sessionName : undefined,
            sessionImage: req.file ? `/uploads/session-images/${req.file.filename}` : undefined,
            status: 'active',
            currentPlayback: {
                isPlaying: false,
                currentTime: 0,
                volume: 1
            }
        });
        
        res.json({ sessionId });
    } catch (err) {
        if (req.file) {
            // Clean up uploaded file if session creation fails
            fs.unlink(req.file.path, () => {});
        }
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/session/join/:sessionId', async (req, res) => {
    try {
        const session = await Session.findOne({ sessionId: req.params.sessionId });
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        const isFirstUser = session.connectedUsers === 0;
        res.json({ success: true, isHost: isFirstUser });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Check for inactive sessions every minute
setInterval(async () => {
    try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        await Session.deleteMany({
            lastActivity: { $lt: fiveMinutesAgo },
            connectedUsers: 0
        });
    } catch (err) {
        console.error('Error cleaning inactive sessions:', err);
    }
}, 60 * 1000);

// Check for expiring sessions every minute
setInterval(async () => {
    try {
        const sessions = await Session.find({});
        sessions.forEach(session => {
            const expiryTime = new Date(session.createdAt.getTime() + session.sessionDuration * 1000);
            const timeLeft = expiryTime - new Date();
            if (timeLeft < 5 * 60 * 1000 && timeLeft > 0) { // 5 minutes warning
                io.to(session.sessionId).emit('session-expiring-soon', {
                    timeLeft: Math.floor(timeLeft / 1000)
                });
            }
        });
    } catch (err) {
        console.error('Error checking session expiry:', err);
    }
}, 60 * 1000);

// Add song to queue
app.post('/api/session/:sessionId/queue', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { song, username } = req.body;
        
        const session = await Session.findOne({ sessionId });
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        if (!session.permissions.allowQueueing) {
            return res.status(403).json({ error: 'Queueing is disabled' });
        }
        
        session.queue.push({
            ...song,
            addedBy: username
        });
        
        await session.save();
        io.to(sessionId).emit('queue-updated', session.queue);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update session settings (host only)
app.post('/api/session/:sessionId/settings', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { permissions, sessionDuration } = req.body;
        
        const session = await Session.findOne({ sessionId });
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        if (permissions) {
            session.permissions = { ...session.permissions, ...permissions };
        }
        
        if (sessionDuration && sessionDuration >= 900) { // Minimum 15 minutes
            session.sessionDuration = sessionDuration;
        }
        
        await session.save();
        io.to(sessionId).emit('settings-updated', {
            permissions: session.permissions,
            sessionDuration: session.sessionDuration
        });
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add at the top with other global variables
const sessionAnalytics = new Map();

io.on('connection', (socket) => {
    console.log('\n=== NEW CONNECTION ===');
    console.log('New client connected:', socket.id);
    console.log('Current connections:', io.engine.clientsCount);
    console.log('=====================\n');
    
    // Test event handler
    socket.on('test', (data) => {
        console.log('Test event received:', data);
    });

    let currentSession = null;
    let username = null;

    // Store session data globally
    if (!global.sessionData) {
        global.sessionData = new Map();
    }

    // Initialize session analytics if needed
    function initSessionAnalytics(sessionId) {
        if (!sessionAnalytics.has(sessionId)) {
            sessionAnalytics.set(sessionId, {
                startTime: Date.now(),
                songPlays: new Map(), // { spotifyId: { count, name, artist, lastPlayed } }
                userContributions: new Map(), // { username: { songs: [], count } }
                genres: new Map(), // { genre: count }
                totalSongs: 0,
                uniqueSongs: new Set(),
                activeUsers: new Set(),
                songHistory: [], // [{spotifyId, name, artist, genre, playedBy, timestamp}]
                userPreferences: new Map() // { username: { favoriteGenre, playCount } }
            });
        }
        return sessionAnalytics.get(sessionId);
    }

    socket.on('join-session', (sessionId) => {
        console.log('\n=== JOIN SESSION EVENT ===');
        console.log('Session ID:', sessionId);
        console.log('Socket ID:', socket.id);
        try {
            console.log(`User joining session: ${sessionId}`);
            currentSession = sessionId;
            socket.join(sessionId);
            
            const analytics = initSessionAnalytics(sessionId);
            analytics.activeUsers.add(socket.id);
            
            // Send initial analytics data
            socket.emit('analytics-update', {
                sessionStart: analytics.startTime,
                totalSongs: analytics.totalSongs,
                uniqueSongs: analytics.uniqueSongs.size,
                activeUsers: analytics.activeUsers.size,
                topSongs: Array.from(analytics.songPlays.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5),
                userContributions: Array.from(analytics.userContributions.entries()),
                genres: Array.from(analytics.genres.entries())
            });
            
            // Initialize session data if it doesn't exist
            if (!global.sessionData.has(sessionId)) {
                global.sessionData.set(sessionId, {
                    queue: [],
                    messages: [],
                    users: new Set()
                });
                console.log('Created new session data');
            }
            
            const sessionData = global.sessionData.get(sessionId);
            sessionData.users.add(socket.id);
            
            // Send current queue to new user
            socket.emit('queue-updated', sessionData.queue);
            console.log(`Sent queue to user: ${sessionData.queue.length} items`);
            
            // Send recent messages
            sessionData.messages.forEach(msg => {
                socket.emit('chat-message', msg);
            });
            
            // Update user count
            io.to(sessionId).emit('user-count', sessionData.users.size);
        } catch (error) {
            console.error('Error in join-session:', error);
        }
    });

    socket.on('set-username', (name) => {
        username = name;
        console.log(`User ${username} set in session ${currentSession}`);
        io.to(currentSession).emit('user-joined', username);
    });

    socket.on('chat-message', (message) => {
        console.log('\n=== CHAT MESSAGE EVENT ===');
        console.log('Raw message received:', message);
        console.log('Current session:', currentSession);
        console.log('Username:', username);
        console.log('Session data:', global.sessionData.get(currentSession));
        console.log('========================\n');

        if (currentSession && username) {
            const messageData = {
                id: Date.now().toString(),
                username,
                content: message,
                timestamp: Date.now()
            };
            
            const sessionData = global.sessionData.get(currentSession);
            if (!sessionData) {
                console.error('No session data found for', currentSession);
                return;
            }

            sessionData.messages.push(messageData);
            console.log('Message added to session data. New message count:', sessionData.messages.length);
            
            io.to(currentSession).emit('chat-message', messageData);
            console.log('Message emitted to room:', currentSession);
        } else {
            console.log('Message rejected - Missing session or username:', {
                hasSession: !!currentSession,
                hasUsername: !!username
            });
        }
    });

    socket.on('queue-update', (song) => {
        console.log('\n=== QUEUE UPDATE EVENT ===');
        console.log('Song data received:', song);
        console.log('Current session:', currentSession);
        console.log('Session data:', global.sessionData.get(currentSession));
        console.log('========================\n');

        if (currentSession) {
            const sessionData = global.sessionData.get(currentSession);
            if (!sessionData) {
                console.error('No session data found for', currentSession);
                return;
            }

            sessionData.queue.push(song);
            console.log('Song added to queue. New queue length:', sessionData.queue.length);
            
            io.to(currentSession).emit('queue-updated', sessionData.queue);
            console.log('Queue update emitted to room:', currentSession);

            const analytics = sessionAnalytics.get(currentSession);
            if (analytics) {
                analytics.totalSongs++;
                analytics.uniqueSongs.add(song.spotifyId);
                analytics.userContributions.set(
                    song.addedBy,
                    (analytics.userContributions.get(song.addedBy) || 0) + 1
                );
                
                // Emit updated analytics
                io.to(currentSession).emit('analytics-update', {
                    totalSongs: analytics.totalSongs,
                    uniqueSongs: analytics.uniqueSongs.size,
                    userContributions: Array.from(analytics.userContributions.entries())
                });
            }
        } else {
            console.log('Queue update rejected - No session found');
        }
    });

    // Add function to fetch song genres from Spotify
    async function getSongGenres(spotifyId) {
        try {
            const data = await spotifyApi.getTrack(spotifyId);
            const artistId = data.body.artists[0].id;
            const artistData = await spotifyApi.getArtist(artistId);
            return artistData.body.genres;
        } catch (error) {
            console.error('Error fetching song genres:', error);
            return [];
        }
    }

    socket.on('song-change', async (data) => {
        if (currentSession) {
            const analytics = sessionAnalytics.get(currentSession);
            if (analytics) {
                try {
                    console.log('Processing song change for analytics:', data);
                    // Get song genres
                    const genres = await getSongGenres(data.spotifyId);
                    console.log('Fetched genres:', genres);

                    // Update song history
                    analytics.songHistory.push({
                        spotifyId: data.spotifyId,
                        name: data.songName,
                        artist: data.artistName,
                        genres,
                        playedBy: username,
                        timestamp: Date.now()
                    });

                    // Update total songs count
                    analytics.totalSongs++;
                    analytics.uniqueSongs.add(data.spotifyId);

                    // Update genre counts
                    genres.forEach(genre => {
                        analytics.genres.set(genre, 
                            (analytics.genres.get(genre) || 0) + 1
                        );
                    });

                    // Update song plays with detailed info
                    const songData = {
                        count: (analytics.songPlays.get(data.spotifyId)?.count || 0) + 1,
                        name: data.songName,
                        artist: data.artistName,
                        genres,
                        lastPlayed: Date.now()
                    };
                    analytics.songPlays.set(data.spotifyId, songData);

                    // Convert song plays to array format for sending
                    const topSongs = Array.from(analytics.songPlays.entries())
                        .map(([id, data]) => ({
                            id,
                            name: data.name,
                            artist: data.artist,
                            count: data.count,
                            genres: data.genres || []
                        }))
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 5);

                    // Prepare complete analytics update
                    const analyticsUpdate = {
                        sessionStart: analytics.startTime,
                        totalSongs: analytics.totalSongs,
                        uniqueSongs: analytics.uniqueSongs.size,
                        activeUsers: analytics.activeUsers.size,
                        topSongs,
                        genres: Array.from(analytics.genres.entries())
                            .sort((a, b) => b[1] - a[1]),
                        userContributions: Array.from(analytics.userContributions.entries())
                    };

                    console.log('Sending complete analytics update:', analyticsUpdate);

                    // Emit updated analytics
                    io.to(currentSession).emit('analytics-update', analyticsUpdate);

                } catch (error) {
                    console.error('Error processing song analytics:', error);
                }
            }
        }
    });

    socket.on('disconnect', () => {
        if (currentSession) {
            const sessionData = global.sessionData.get(currentSession);
            if (sessionData) {
                sessionData.users.delete(socket.id);
                io.to(currentSession).emit('user-count', sessionData.users.size);
                
                if (username) {
                    console.log(`User ${username} disconnected from session ${currentSession}`);
                    io.to(currentSession).emit('user-left', username);
                }
            }

            const analytics = sessionAnalytics.get(currentSession);
            if (analytics) {
                analytics.activeUsers.delete(socket.id);
                io.to(currentSession).emit('analytics-update', {
                    activeUsers: analytics.activeUsers.size
                });
            }
        }
    });

    // Handle errors
    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });
});

// Get public sessions
app.get('/api/sessions/public', async (req, res) => {
    try {
        const sessions = await Session.find({
            sessionType: 'public',
            status: 'active'
        }).select('sessionId sessionName sessionImage connectedUsers createdAt hostUsername -_id');
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Search sessions
app.get('/api/sessions/search', async (req, res) => {
    try {
        const { query } = req.query;
        const sessions = await Session.find({
            sessionType: 'public',
            status: 'active',
            $or: [
                { sessionName: { $regex: query, $options: 'i' } },
                { sessionId: { $regex: query, $options: 'i' } }
            ]
        });
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Error handling for multer
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ 
            error: err.code === 'LIMIT_FILE_SIZE' 
                ? 'File is too large. Maximum size is 5MB.' 
                : 'Error uploading file.' 
        });
    }
    next(err);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 