document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.querySelector('.login-btn');
    const registerBtn = document.querySelector('.register-btn');
    const createSessionBtn = document.querySelector('.create-session-btn');
    const joinSessionBtn = document.querySelector('.join-session-btn');

    loginBtn.addEventListener('click', () => {
        window.location.href = '/auth';
    });

    registerBtn.addEventListener('click', () => {
        window.location.href = '/auth';
    });

    createSessionBtn.addEventListener('click', async () => {
        // Assuming you have logic to create a session here
        const response = await fetch('/api/session/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionType: 'private' // or whatever session type you need
            })
        });

        if (response.ok) {
            const data = await response.json();
            // Redirect to session.html instead of index.html
            window.location.href = `/session.html?session=${data.sessionId}`;
        } else {
            console.error('Failed to create session:', response.statusText);
            // Handle error (e.g., show a toast notification)
        }
    });

    joinSessionBtn.addEventListener('click', () => {
        window.location.href = '/session/join';
    });
}); 