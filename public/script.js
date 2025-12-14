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
            // Display the history data directly from response
            if (typeof result.data === 'object') {
                historyDisplay.innerHTML = '<h3>History</h3><pre>' + JSON.stringify(result.data, null, 2) + '</pre>';
            } else {
                historyDisplay.innerHTML = '<h3>History</h3><pre>' + result.data + '</pre>';
            }
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

const MAX_HISTORY_POLLS = 15; // Increased to 15 attempts
const POLL_INTERVAL = 2000; // Increased to 2 seconds

function pollForHistory(attempt) {
    if (attempt >= MAX_HISTORY_POLLS) {
        historyDisplay.textContent = 'History data not received. Please try again.';
        historyDisplay.className = 'history-display error';
        return;
    }
    
    // Start polling immediately on first attempt, then use interval
    const delay = attempt === 0 ? 500 : POLL_INTERVAL;
    
    setTimeout(async () => {
        try {
            const response = await fetch('/api/history');
            const data = await response.json();
            
            if (data.history) {
                // Display the history data
                if (typeof data.history === 'object') {
                    historyDisplay.innerHTML = '<h3>History</h3><pre>' + JSON.stringify(data.history, null, 2) + '</pre>';
                } else {
                    historyDisplay.innerHTML = '<h3>History</h3><pre>' + data.history + '</pre>';
                }
                
                // Clear the history on server after successful display
                fetch('/api/history', { method: 'DELETE' });
            } else {
                // Continue polling
                historyDisplay.textContent = `Waiting for history data... (${attempt + 1}/${MAX_HISTORY_POLLS})`;
                pollForHistory(attempt + 1);
            }
        } catch (error) {
            historyDisplay.textContent = `Error loading history: ${error.message}`;
            historyDisplay.className = 'history-display error';
        }
    }, delay);

}

async function checkHistoryStatus() {
    try {
        const response = await fetch('/api/history');
        const data = await response.json();
        console.log(data);
        
        if (data.history) {
            // Display the history data
            if (typeof data.history === 'object') {
                historyDisplay.innerHTML = '<h3>History</h3><pre>' + JSON.stringify(data.history, null, 2) + '</pre>';
            } else {
                historyDisplay.innerHTML = '<h3>History</h3><pre>' + data.history + '</pre>';
            }
        } else {
            historyDisplay.textContent = 'No history data received yet';
        }
    } catch (error) {
        historyDisplay.textContent = `Error loading history: ${error.message}`;
        historyDisplay.className = 'history-display error';
    }
}
