// UI Elements
const turnOnBtn = document.getElementById('turnOnBtn');
const turnOffBtn = document.getElementById('turnOffBtn');
const historyBtn = document.getElementById('historyBtn');
const statusDiv = document.getElementById('status');
const historyDisplay = document.getElementById('historyDisplay');

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
            // Wait for the webhook to send back the status response
            statusDiv.textContent = 'Waiting for response...';
            statusDiv.className = 'status';
            
            // Check for status updates
            setTimeout(checkStatus, 1500);
        } else {
            statusDiv.textContent = `✗ Failed: ${data.error}`;
            statusDiv.className = 'status error';
        }
    } catch (error) {
        statusDiv.textContent = `✗ Error: ${error.message}`;
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
            // If no status received yet, keep waiting
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

// History viewer
historyBtn.addEventListener('click', async () => {
    try {
        historyDisplay.textContent = 'Loading history...';
        historyDisplay.style.display = 'block';
        historyDisplay.className = 'history-display';

        const response = await fetch('/api/history/request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const result = await response.json();

        if (result.success && result.data) {
            // Display history data directly from response
            displayHistory(result.data);
        } else if (result.success) {
            historyDisplay.textContent = 'No history data available';
        } else {
            historyDisplay.textContent = `Failed to load history: ${result.error}`;
            historyDisplay.className = 'history-display error';
        }
    } catch (error) {
        historyDisplay.textContent = `Error loading history: ${error.message}`;
        historyDisplay.className = 'history-display error';
    }
});

// Helper function to display history data
function displayHistory(data) {
    if (Array.isArray(data)) {
        // Format Adafruit IO data nicely
        const formatted = data.map(item => {
            const date = new Date(item.created_at).toLocaleString();
            const value = item.value === '1' ? 'ON' : item.value === '0' ? 'OFF' : item.value;
            return `${date} - Light: ${value}`;
        }).join('\n');
        historyDisplay.innerHTML = '<h3>History</h3><pre>' + formatted + '</pre>';
    } else if (typeof data === 'object') {
        historyDisplay.innerHTML = '<h3>History</h3><pre>' + JSON.stringify(data, null, 2) + '</pre>';
    } else {
        historyDisplay.innerHTML = '<h3>History</h3><pre>' + data + '</pre>';
    }
}


