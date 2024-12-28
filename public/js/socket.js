// Initialize socket globally
window.initSocket = () => {
    console.log('Initializing socket connection...');
    
    // Initialize socket with explicit URL and options
    window.socket = io(window.location.origin, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    });
    
    window.socket.on('connect', () => {
        console.log('Socket connected:', window.socket.id);
        console.log('Socket object:', {
            connected: window.socket.connected,
            id: window.socket.id,
            url: window.location.origin
        });
    });

    window.socket.on('disconnect', () => {
        console.log('Socket disconnected');
    });

    window.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
    });

    // Test connection
    window.socket.emit('test', {
        message: 'Testing socket connection',
        timestamp: Date.now()
    });

    return window.socket;
}; 