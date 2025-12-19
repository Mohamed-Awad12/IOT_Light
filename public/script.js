const turnOnBtn = document.getElementById('turnOnBtn');
const turnOffBtn = document.getElementById('turnOffBtn');
const statusDiv = document.getElementById('status');
const lampBulb = document.getElementById('lampBulb');
const lampGlow = document.getElementById('lampGlow');
const lightRays = document.getElementById('lightRays');
const lampStatus = document.getElementById('lampStatus');

let isLampOn = false;
let pollInterval = null;

function updateLampState(isOn) {
    isLampOn = isOn;
    
    if (isOn) {
        lampBulb.classList.add('on');
        lampGlow.classList.add('on');
        lightRays.classList.add('on');
        lampStatus.classList.add('on');
        lampStatus.classList.remove('off');
        lampStatus.textContent = '💡 Light is ON';
    } else {
        lampBulb.classList.remove('on');
        lampGlow.classList.remove('on');
        lightRays.classList.remove('on');
        lampStatus.classList.remove('on');
        lampStatus.classList.add('off');
        lampStatus.textContent = '🌑 Light is OFF';
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
        pullHint.textContent = 'Release to toggle!';
        pullHint.classList.add('visible');
    } else {
        pullHint.textContent = 'Pull to toggle';
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
    
    pullCord.style.transform = `translateY(${currentY}px)`;
    
    if (currentY > pullThreshold) {
        pullHint.textContent = 'Release to toggle!';
        pullHint.classList.add('visible');
    } else {
        pullHint.textContent = 'Pull to toggle';
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
    pullHint.textContent = 'Pull to toggle';
    
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
