class AuthUI {
    constructor() {
        this.loginForm = document.getElementById('loginForm');
        this.registerForm = document.getElementById('registerForm');
        this.toggleLogin = document.getElementById('toggleLogin');
        this.toggleRegister = document.getElementById('toggleRegister');
        this.dotsCanvas = document.getElementById('dotsCanvas');
        this.ctx = this.dotsCanvas.getContext('2d');
        this.dots = [];
        this.numDots = 100;
        this.ripples = [];
        this.currentForm = 'login';
        this.init();
    }

    init() {
        this.resizeCanvas();
        this.createDots();
        this.animate();

        window.addEventListener('resize', this.resizeCanvas.bind(this));
        this.dotsCanvas.addEventListener('click', this.createRipple.bind(this));
        this.toggleLogin.addEventListener('click', () => this.switchForm('login'));
        this.toggleRegister.addEventListener('click', () => this.switchForm('register'));

        document.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', this.handleInput.bind(this));
        });
    }

    resizeCanvas() {
        this.dotsCanvas.width = this.dotsCanvas.clientWidth;
        this.dotsCanvas.height = this.dotsCanvas.clientHeight;
    }

    createDots() {
        this.dots = [];
        for (let i = 0; i < this.numDots; i++) {
            const x = Math.random() * this.dotsCanvas.width;
            const y = Math.random() * this.dotsCanvas.height;
            const dot = new Dot(x, y);
            this.dots.push(dot);
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.dotsCanvas.width, this.dotsCanvas.height);

        this.dots.forEach(dot => {
            dot.update();
            dot.draw(this.ctx);
        });

        this.ripples.forEach((ripple, index) => {
            ripple.update();
            ripple.draw(this.ctx);

            if (ripple.radius > Math.max(this.dotsCanvas.width, this.dotsCanvas.height)) {
                this.ripples.splice(index, 1);
            }
        });

        requestAnimationFrame(this.animate.bind(this));
    }

    createRipple(event) {
        const rect = this.dotsCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const ripple = new Ripple(x, y);
        this.ripples.push(ripple);
    }

    handleInput(event) {
        const input = event.target;
        const value = input.value;

        if (value.length > 0) {
            this.dots.forEach(dot => {
                dot.organize();
            });
        } else {
            this.dots.forEach(dot => {
                dot.scatter();
            });
        }

        this.createMusicNotes(input);
    }

    createMusicNotes(input) {
        const musicNotes = input.parentElement.querySelector('.music-notes');
        musicNotes.innerHTML = '';

        const numNotes = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < numNotes; i++) {
            const note = document.createElement('span');
            note.textContent = '♪';
            note.style.animationDelay = `${i * 0.2}s`;
            musicNotes.appendChild(note);
        }
    }

    switchForm(form) {
        if (form === 'login') {
            this.loginForm.classList.add('active');
            this.registerForm.classList.remove('active');
        } else {
            this.loginForm.classList.remove('active');
            this.registerForm.classList.add('active');
        }
        this.currentForm = form;
    }
}

class Dot {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 2;
        this.color = '#1db954';
        this.targetX = x;
        this.targetY = y;
        this.speed = 0.05;
    }

    update() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        this.x += dx * this.speed;
        this.y += dy * this.speed;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    organize() {
        // Implement the logic for organizing the dots
        // You can calculate the target positions based on a grid or pattern
    }

    scatter() {
        // Implement the logic for scattering the dots
        // You can assign random target positions within the canvas
    }
}

class Ripple {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.speed = 5;
        this.color = 'rgba(29, 185, 84, 0.3)';
    }

    update() {
        this.radius += this.speed;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = this.color;
        ctx.stroke();
        ctx.closePath();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AuthUI();
});
