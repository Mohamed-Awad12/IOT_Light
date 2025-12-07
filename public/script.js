const WEBHOOK_URL = 'https://ewgfdfgre.app.n8n.cloud/webhook/google-assistant';

const turnOnBtn = document.getElementById('turnOnBtn');
const turnOffBtn = document.getElementById('turnOffBtn');
const statusDiv = document.getElementById('status');

async function sendCommand(command) {
    try {
        statusDiv.textContent = 'Sending command...';
        statusDiv.className = 'status';

        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ command: command })
        });

        if (response.ok) {
            statusDiv.textContent = `✓ Successfully sent: "${command}"`;
            statusDiv.className = 'status success';
        } else {
            statusDiv.textContent = `✗ Failed to send command (Status: ${response.status})`;
            statusDiv.className = 'status error';
        }
    } catch (error) {
        statusDiv.textContent = `✗ Error: ${error.message}`;
        statusDiv.className = 'status error';
    }
}

turnOnBtn.addEventListener('click', () => {
    sendCommand('turn on the lights');
});

turnOffBtn.addEventListener('click', () => {
    sendCommand('turn off the lights');
});
