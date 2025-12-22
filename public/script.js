const turnOnBtn = document.getElementById('turnOnBtn');
const turnOffBtn = document.getElementById('turnOffBtn');
const statusDiv = document.getElementById('status');
const lampBulb = document.getElementById('lampBulb');
const lampGlow = document.getElementById('lampGlow');
const lightRays = document.getElementById('lightRays');
const lampStatus = document.getElementById('lampStatus');
const connectionStatus = document.getElementById('connectionStatus');

let isLampOn = false;
let pollInterval = null;
let isConnected = false;

// Connection status management
function updateConnectionStatus(connected) {
    isConnected = connected;
    if (connectionStatus) {
        const statusText = connectionStatus.querySelector('.status-text');
        if (connected) {
            connectionStatus.classList.add('connected');
            connectionStatus.classList.remove('disconnected');
            if (statusText) statusText.textContent = 'Connected';
        } else {
            connectionStatus.classList.remove('connected');
            connectionStatus.classList.add('disconnected');
            if (statusText) statusText.textContent = 'Disconnected';
        }
    }
}

// Enhanced lamp state update with animations
function updateLampState(isOn, animate = true) {
    const wasOn = isLampOn;
    isLampOn = isOn;
    
    if (isOn) {
        lampBulb.classList.add('on');
        lampGlow.classList.add('on');
        lightRays.classList.add('on');
        lampStatus.classList.add('on');
        lampStatus.classList.remove('off');
        lampStatus.textContent = '💡 Light is ON';
        
        // Celebration effect when turning on
        if (!wasOn && animate && typeof confetti !== 'undefined') {
            confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.6 },
                colors: ['#ffc107', '#ff9800', '#ffeb3b', '#fff8e1']
            });
        }
    } else {
        lampBulb.classList.remove('on');
        lampGlow.classList.remove('on');
        lightRays.classList.remove('on');
        lampStatus.classList.remove('on');
        lampStatus.classList.add('off');
        lampStatus.textContent = '🌑 Light is OFF';
    }
    
    // GSAP animation for smooth state change
    if (animate && typeof gsap !== 'undefined') {
        gsap.fromTo(lampBulb, 
            { scale: 0.95 }, 
            { scale: 1, duration: 0.3, ease: 'back.out(1.7)' }
        );
    }
}

async function fetchLightStatus() {
    try {
        const response = await fetch('/api/status/lamp');
        
        if (response.ok) {
            const data = await response.json();
            updateConnectionStatus(true);
            if (data.success) {
                updateLampState(data.isOn, false);
            }
        } else {
            updateConnectionStatus(false);
        }
    } catch (error) {
        console.error('Error fetching light status:', error);
        updateConnectionStatus(false);
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

startPolling();


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

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopPolling();
    } else {
        startPolling();
    }
});

const pullCord = document.getElementById('pullCord');
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
    
    pullCord.style.transform = `translateY(${currentY}px)`;
    
    if (currentY > pullThreshold) {
        pullHint.classList.add('visible');
    } else {
        pullHint.classList.remove('visible');
    }
});

document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    
    const wasPulledEnough = currentY > pullThreshold;
    
    isDragging = false;
    pullCord.classList.remove('pulling');
    pullCord.classList.add('released');
    pullCord.style.cursor = 'grab';
    pullCord.style.transform = '';
    
    pullHint.classList.remove('visible');
    
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
    
    pullCord.style.transform = `translateY(${currentY}px)`;
    
    if (currentY > pullThreshold) {
      
        pullHint.classList.add('visible');
    } else {
      
        pullHint.classList.remove('visible');
    }
});

document.addEventListener('touchend', () => {
    if (!isDragging) return;
    
    const wasPulledEnough = currentY > pullThreshold;
    
    isDragging = false;
    pullCord.classList.remove('pulling');
    pullCord.classList.add('released');
    pullCord.style.transform = '';
    
    pullHint.classList.remove('visible');
    
    
    if (wasPulledEnough) {
        toggleLampWithCord();
    }
    
    currentY = 0;
});

const hiddenToggle = document.getElementById('hiddenToggle');

async function directToggle() {
    const newValue = isLampOn ? '0' : '1';
    
    try {
        const response = await fetch('/api/control/direct', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ value: newValue })
        });

        const data = await response.json();

        if (data.success) {
            updateLampState(!isLampOn);
        }
    } catch (error) {
        console.error('Direct toggle error:', error);
    }
}

hiddenToggle.addEventListener('click', directToggle);
