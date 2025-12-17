const turnOnBtn = document.getElementById('turnOnBtn');
const turnOffBtn = document.getElementById('turnOffBtn');
const statusDiv = document.getElementById('status');
const lampBulb = document.getElementById('lampBulb');
const lampGlow = document.getElementById('lampGlow');
const lightRays = document.getElementById('lightRays');
const lampStatus = document.getElementById('lampStatus');
const lampContainer = document.getElementById('lampContainer');
const lamp = document.getElementById('lamp');
const particleCanvas = document.getElementById('particleCanvas');
const ctx = particleCanvas.getContext('2d');

let pollInterval = null;
let isLampOn = false;
let particles = [];
let animationFrameId = null;
let mouseX = 0;
let mouseY = 0;

function resizeCanvas() {
    particleCanvas.width = lampContainer.offsetWidth;
    particleCanvas.height = lampContainer.offsetHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

class Particle {
    constructor(x, y, isFirefly = false) {
        this.x = x;
        this.y = y;
        this.isFirefly = isFirefly;
        this.size = isFirefly ? Math.random() * 4 + 2 : Math.random() * 3 + 1;
        this.speedX = (Math.random() - 0.5) * 2;
        this.speedY = isFirefly ? (Math.random() - 0.5) * 2 : Math.random() * -2 - 0.5;
        this.life = 1;
        this.decay = isFirefly ? 0.003 : 0.01 + Math.random() * 0.01;
        this.hue = 40 + Math.random() * 20;
        this.wobble = Math.random() * Math.PI * 2;
        this.wobbleSpeed = 0.05 + Math.random() * 0.05;
    }

    update() {
        this.wobble += this.wobbleSpeed;
        if (this.isFirefly) {
            this.x += this.speedX + Math.sin(this.wobble) * 0.5;
            this.y += this.speedY + Math.cos(this.wobble) * 0.5;
            this.speedX *= 0.99;
            this.speedY *= 0.99;
        } else {
            this.x += this.speedX;
            this.y += this.speedY;
        }
        this.life -= this.decay;
    }

    draw() {
        const alpha = this.life * 0.8;
        const glow = this.isFirefly ? 15 : 8;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = glow;
        ctx.shadowColor = `hsla(${this.hue}, 100%, 70%, ${alpha})`;
        ctx.fillStyle = `hsla(${this.hue}, 100%, ${this.isFirefly ? 80 : 70}%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function createParticles() {
    if (!isLampOn) return;
    const bulbRect = lampBulb.getBoundingClientRect();
    const containerRect = lampContainer.getBoundingClientRect();
    const centerX = bulbRect.left - containerRect.left + bulbRect.width / 2;
    const centerY = bulbRect.top - containerRect.top + bulbRect.height / 2;
    
    for (let i = 0; i < 2; i++) {
        const offsetX = (Math.random() - 0.5) * 40;
        const offsetY = Math.random() * 30;
        particles.push(new Particle(centerX + offsetX, centerY + offsetY));
    }
    
    if (Math.random() < 0.1) {
        const fireflyX = Math.random() * particleCanvas.width;
        const fireflyY = Math.random() * particleCanvas.height;
        particles.push(new Particle(fireflyX, fireflyY, true));
    }
}

function animateParticles() {
    ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    
    if (isLampOn) {
        createParticles();
    }
    
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    
    animationFrameId = requestAnimationFrame(animateParticles);
}

animateParticles();

function updateLampState(isOn) {
    const wasOff = !isLampOn;
    isLampOn = isOn;
    
    if (isOn) {
        lampBulb.classList.add('on');
        lampGlow.classList.add('on');
        lightRays.classList.add('on');
        lampStatus.classList.add('on');
        lampStatus.classList.remove('off');
        lampStatus.textContent = '💡 Light is ON';
        
        if (wasOff) {
            gsap.set(lampGlow, { clearProps: 'all' });
            gsap.set('.ray', { clearProps: 'all' });
            
            gsap.fromTo(lampBulb, 
                { scale: 1, filter: 'brightness(1)' },
                { scale: 1.1, filter: 'brightness(1.3)', duration: 0.2, yoyo: true, repeat: 1, ease: 'power2.out' }
            );
            gsap.fromTo(lampGlow,
                { scale: 0, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' }
            );
            gsap.fromTo('.ray',
                { scaleY: 0, opacity: 0 },
                { scaleY: 1, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out' }
            );
            
            const rect = lampBulb.getBoundingClientRect();
            confetti({
                particleCount: 30,
                spread: 60,
                origin: { 
                    x: (rect.left + rect.width / 2) / window.innerWidth,
                    y: (rect.top + rect.height / 2) / window.innerHeight
                },
                colors: ['#FFD700', '#FFA500', '#FFEC8B', '#FFE4B5'],
                gravity: 0.8,
                scalar: 0.8,
                shapes: ['circle'],
                ticks: 100
            });
        }
    } else {
        lampBulb.classList.remove('on');
        lampGlow.classList.remove('on');
        lightRays.classList.remove('on');
        lampStatus.classList.remove('on');
        lampStatus.classList.add('off');
        lampStatus.textContent = '🌑 Light is OFF';
        
        gsap.killTweensOf(lampGlow);
        gsap.killTweensOf('.ray');
        gsap.set(lampGlow, { clearProps: 'all' });
        gsap.set('.ray', { clearProps: 'all' });
        
        if (!wasOff) {
            gsap.to(lampGlow, { scale: 0, opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: () => {
                gsap.set(lampGlow, { clearProps: 'all' });
            }});
            gsap.to('.ray', { scaleY: 0, opacity: 0, duration: 0.2, stagger: 0.02, onComplete: () => {
                gsap.set('.ray', { clearProps: 'all' });
            }});
        }
    }
}

async function fetchLightStatus() {
    try {
        const response = await fetch('/api/status/lamp');
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                updateLampState(data.isOn);
            }
        }
    } catch (error) {
        console.error('Error fetching light status:', error);
    }
}

function startPolling() {
    fetchLightStatus();
    pollInterval = setInterval(fetchLightStatus, 1000);
}

function stopPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}

async function sendCommand(command) {
    try {
        statusDiv.textContent = 'Sending command...';
        statusDiv.className = 'status';

        const response = await fetch('/api/control', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ command: command })
        });

        const data = await response.json();

        if (data.success) {
            statusDiv.textContent = 'Waiting for response...';
            statusDiv.className = 'status';
            
            setTimeout(() => {
                checkStatus();
                fetchLightStatus();
            }, 1500);
        } else {
            statusDiv.textContent = `Failed: ${data.error}`;
            statusDiv.className = 'status error';
        }
    } catch (error) {
        statusDiv.textContent = `Error: ${error.message}`;
        statusDiv.className = 'status error';
    }
}

async function checkStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        if (data.status) {
            statusDiv.textContent = data.status;
            statusDiv.className = 'status success';
        } else {
            statusDiv.textContent = 'Waiting for response...';
            statusDiv.className = 'status';
        }
    } catch (error) {
        console.error('Error checking status:', error);
    }
}

turnOnBtn.addEventListener('click', () => {
    sendCommand('turn on the lights');
});

turnOffBtn.addEventListener('click', () => {
    sendCommand('turn off the lights');
});

startPolling();

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopPolling();
    } else {
        startPolling();
    }
});

lampContainer.addEventListener('mousemove', (e) => {
    const rect = lampContainer.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const deltaX = (mouseX - centerX) / centerX;
    const deltaY = (mouseY - centerY) / centerY;
    
    gsap.to(lamp, {
        rotateY: deltaX * 15,
        rotateX: -deltaY * 10,
        duration: 0.3,
        ease: 'power2.out'
    });
    
    if (isLampOn) {
        gsap.to(lampGlow, {
            x: deltaX * 20,
            y: deltaY * 15,
            duration: 0.3,
            ease: 'power2.out'
        });
        
        gsap.to(lightRays, {
            x: deltaX * 10,
            skewX: deltaX * 5,
            duration: 0.3,
            ease: 'power2.out'
        });
    }
});

lampContainer.addEventListener('mouseleave', () => {
    gsap.to(lamp, {
        rotateY: 0,
        rotateX: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.5)'
    });
    
    gsap.to(lampGlow, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.5)'
    });
    
    gsap.to(lightRays, {
        x: 0,
        skewX: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.5)'
    });
});

lamp.addEventListener('click', () => {
    gsap.timeline()
        .to(lamp, { rotation: 8, duration: 0.1, ease: 'power2.out' })
        .to(lamp, { rotation: -6, duration: 0.15, ease: 'power2.inOut' })
        .to(lamp, { rotation: 4, duration: 0.12, ease: 'power2.inOut' })
        .to(lamp, { rotation: -2, duration: 0.1, ease: 'power2.inOut' })
        .to(lamp, { rotation: 0, duration: 0.15, ease: 'power2.out' });
    
    gsap.to('.lamp-wire', {
        scaleY: 1.05,
        duration: 0.1,
        yoyo: true,
        repeat: 3,
        ease: 'power2.inOut'
    });
});

gsap.to('.ray', {
    scaleY: 1.1,
    opacity: 0.8,
    duration: 1,
    stagger: { each: 0.2, repeat: -1, yoyo: true },
    ease: 'sine.inOut'
});

turnOnBtn.addEventListener('mouseenter', () => {
    gsap.to(turnOnBtn, { scale: 1.05, duration: 0.2, ease: 'power2.out' });
});
turnOnBtn.addEventListener('mouseleave', () => {
    gsap.to(turnOnBtn, { scale: 1, duration: 0.2, ease: 'power2.out' });
});

turnOffBtn.addEventListener('mouseenter', () => {
    gsap.to(turnOffBtn, { scale: 1.05, duration: 0.2, ease: 'power2.out' });
});
turnOffBtn.addEventListener('mouseleave', () => {
    gsap.to(turnOffBtn, { scale: 1, duration: 0.2, ease: 'power2.out' });
});

lampContainer.addEventListener('mouseenter', () => {
    if (isLampOn) {
        gsap.to(lampGlow, { scale: 1.1, duration: 0.3, ease: 'power2.out' });
    }
});

lampContainer.addEventListener('mouseleave', () => {
    if (isLampOn) {
        gsap.to(lampGlow, { scale: 1, duration: 0.3, ease: 'power2.out' });
    }
});

const pullCord = document.getElementById('pullCord');
const cordHandle = document.getElementById('cordHandle');
const pullHint = document.getElementById('pullHint');

let isDragging = false;
let startY = 0;
let currentY = 0;
let pullThreshold = 40;

function toggleLampWithCord() {
    if (isLampOn) {
        sendCommand('turn off the lights');
    } else {
        sendCommand('turn on the lights');
    }
    
    gsap.to(pullCord, {
        rotation: 0,
        duration: 0.1
    });
    
    gsap.timeline()
        .to(lamp, { y: 3, duration: 0.05 })
        .to(lamp, { y: -2, duration: 0.1 })
        .to(lamp, { y: 0, duration: 0.15, ease: 'elastic.out(1, 0.5)' });
}

pullCord.addEventListener('mousedown', (e) => {
    isDragging = true;
    startY = e.clientY;
    pullCord.classList.add('pulling');
    pullCord.classList.remove('released');
    pullCord.style.cursor = 'grabbing';
    e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    currentY = e.clientY - startY;
    currentY = Math.max(0, Math.min(currentY, 60));
    
    gsap.to(pullCord, {
        y: currentY,
        duration: 0.1,
        ease: 'power2.out'
    });
    
    const stretchFactor = 1 + (currentY / 200);
    gsap.to('.cord-string', {
        scaleY: stretchFactor,
        duration: 0.1
    });
    
    if (currentY > pullThreshold) {
        gsap.to(cordHandle, {
            scale: 1.15,
            duration: 0.1
        });
        pullHint.textContent = 'Release to toggle!';
        pullHint.classList.add('visible');
    } else {
        gsap.to(cordHandle, {
            scale: 1,
            duration: 0.1
        });
        pullHint.textContent = 'Pull to toggle';
    }
});

document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    
    const wasPulledEnough = currentY > pullThreshold;
    
    isDragging = false;
    pullCord.classList.remove('pulling');
    pullCord.classList.add('released');
    pullCord.style.cursor = 'grab';
    
    gsap.to(pullCord, {
        y: 0,
        duration: 0.5,
        ease: 'elastic.out(1.2, 0.4)'
    });
    
    gsap.to('.cord-string', {
        scaleY: 1,
        duration: 0.3,
        ease: 'elastic.out(1, 0.5)'
    });
    
    gsap.to(cordHandle, {
        scale: 1,
        duration: 0.2
    });
    
    pullHint.classList.remove('visible');
    pullHint.textContent = 'Pull to toggle';
    
    if (wasPulledEnough) {
        toggleLampWithCord();
    }
    
    currentY = 0;
});

pullCord.addEventListener('touchstart', (e) => {
    isDragging = true;
    startY = e.touches[0].clientY;
    pullCord.classList.add('pulling');
    pullCord.classList.remove('released');
    e.preventDefault();
});

document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    
    currentY = e.touches[0].clientY - startY;
    currentY = Math.max(0, Math.min(currentY, 60));
    
    gsap.to(pullCord, {
        y: currentY,
        duration: 0.1,
        ease: 'power2.out'
    });
    
    const stretchFactor = 1 + (currentY / 200);
    gsap.to('.cord-string', {
        scaleY: stretchFactor,
        duration: 0.1
    });
    
    if (currentY > pullThreshold) {
        gsap.to(cordHandle, {
            scale: 1.15,
            duration: 0.1
        });
    }
});

document.addEventListener('touchend', () => {
    if (!isDragging) return;
    
    const wasPulledEnough = currentY > pullThreshold;
    
    isDragging = false;
    pullCord.classList.remove('pulling');
    pullCord.classList.add('released');
    
    gsap.to(pullCord, {
        y: 0,
        duration: 0.5,
        ease: 'elastic.out(1.2, 0.4)'
    });
    
    gsap.to('.cord-string', {
        scaleY: 1,
        duration: 0.3,
        ease: 'elastic.out(1, 0.5)'
    });
    
    gsap.to(cordHandle, {
        scale: 1,
        duration: 0.2
    });
    
    if (wasPulledEnough) {
        toggleLampWithCord();
    }
    
    currentY = 0;
});

