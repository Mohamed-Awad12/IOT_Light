const turnOnBtn = document.getElementById('turnOnBtn');
const turnOffBtn = document.getElementById('turnOffBtn');
const statusDiv = document.getElementById('status');
const lampBulb = document.getElementById('lampBulb');
const lampGlow = document.getElementById('lampGlow');
const lightRays = document.getElementById('lightRays');
const lampStatus = document.getElementById('lampStatus');

let pollInterval = null;

function updateLampState(isOn) {
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

