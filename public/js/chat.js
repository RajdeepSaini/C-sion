document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');

    // Chat message submission
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && chatInput.value.trim()) {
            console.log('CLIENT: Attempting to send chat message:', {
                message: chatInput.value.trim(),
                username: window.username,
                sessionId: new URLSearchParams(window.location.search).get('session')
            });
            window.socket.emit('chat-message', chatInput.value.trim());
            chatInput.value = '';
        }
    });

    // Add listeners to verify socket events are being received
    window.socket.on('connect', () => {
        console.log('Socket connected:', window.socket.id);
    });

    window.socket.on('disconnect', () => {
        console.log('Socket disconnected');
    });

    // Receive chat messages
    window.socket.on('chat-message', (message) => {
        console.log('Received chat message:', message);
        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${message.username === window.username ? 'own-message' : ''}`;
        messageEl.dataset.messageId = message.id || Date.now().toString();
        messageEl.innerHTML = `
            <div class="chat-message-header">
                ${message.username === window.username ? 'You' : message.username}
                <span class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="chat-message-content">
                ${message.content}
                <button class="reaction-button">
                    <i class="far fa-smile"></i>
                </button>
                <div class="emoji-picker">
                    ${['👍', '❤️', '😂', '😮', '😢', '👏', '🔥'].map(emoji => `
                        <div class="emoji-option" data-emoji="${emoji}">${emoji}</div>
                    `).join('')}
                </div>
            </div>
            <div class="reactions-container"></div>
        `;

        // Add reaction button functionality
        const reactionBtn = messageEl.querySelector('.reaction-button');
        const emojiPicker = messageEl.querySelector('.emoji-picker');
        
        // Show/hide emoji picker
        reactionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.emoji-picker').forEach(picker => {
                if (picker !== emojiPicker) picker.classList.remove('active');
            });
            emojiPicker.classList.toggle('active');
        });

        // Handle emoji selection
        messageEl.querySelectorAll('.emoji-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                window.socket.emit('add-reaction', {
                    messageId: messageEl.dataset.messageId,
                    emoji: option.dataset.emoji
                });
                emojiPicker.classList.remove('active');
            });
        });

        chatMessages.appendChild(messageEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    // Handle reactions
    window.socket.on('reaction-added', ({ messageId, reaction }) => {
        const messageEl = document.querySelector(`.chat-message[data-message-id="${messageId}"]`);
        if (messageEl) {
            const reactionsContainer = messageEl.querySelector('.reactions-container');
            const existingReaction = reactionsContainer.querySelector(`.reaction[data-emoji="${reaction.emoji}"]`);
            
            if (existingReaction) {
                const countEl = existingReaction.querySelector('.count');
                const count = parseInt(countEl.textContent) + 1;
                countEl.textContent = count;
                existingReaction.classList.add('bounce');
                setTimeout(() => existingReaction.classList.remove('bounce'), 300);
            } else {
                const reactionEl = document.createElement('div');
                reactionEl.className = 'reaction';
                reactionEl.dataset.emoji = reaction.emoji;
                reactionEl.innerHTML = `
                    <span class="emoji">${reaction.emoji}</span>
                    <span class="count">1</span>
                `;
                reactionsContainer.appendChild(reactionEl);
            }
        }
    });

    // Close emoji pickers when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.emoji-picker') && !e.target.closest('.reaction-button')) {
            document.querySelectorAll('.emoji-picker').forEach(picker => {
                picker.classList.remove('active');
            });
        }
    });

    // System messages
    window.socket.on('user-joined', (username) => {
        const messageEl = document.createElement('div');
        messageEl.className = 'system-message';
        messageEl.textContent = `${username} joined the session`;
        chatMessages.appendChild(messageEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    window.socket.on('user-left', (username) => {
        const messageEl = document.createElement('div');
        messageEl.className = 'system-message';
        messageEl.textContent = `${username} left the session`;
        chatMessages.appendChild(messageEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}); 