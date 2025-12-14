const historyContent = document.getElementById('historyContent');
const refreshBtn = document.getElementById('refreshBtn');

async function loadHistory() {
    historyContent.innerHTML = '<div class="loading">Loading history...</div>';
    
    try {
        const response = await fetch('/api/history/request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
            displayHistoryTable(result.data);
        } else if (result.success) {
            historyContent.innerHTML = '<div class="loading">No history data available</div>';
        } else {
            historyContent.innerHTML = `<div class="error-message">Failed to load history: ${result.error}</div>`;
        }
    } catch (error) {
        historyContent.innerHTML = `<div class="error-message">Error loading history: ${error.message}</div>`;
    }
}

function displayHistoryTable(data) {
    let tableHTML = `
        <div class="table-wrapper">
            <table class="history-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Date & Time</th>
                        <th>Status</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    data.forEach((item, index) => {
        const date = new Date(item.created_at);
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        const formattedTime = date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const isOn = item.value === '1' || item.value === 1;
        const statusClass = isOn ? 'status-on' : 'status-off';
        const statusText = isOn ? 'ON' : 'OFF';
        
        tableHTML += `
            <tr>
                <td>${index + 1}</td>
                <td class="date-cell">${formattedDate}<br><small style="color: #888;">${formattedTime}</small></td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td><span class="value-cell">${item.value}</span></td>
            </tr>
        `;
    });
    
    tableHTML += `
                </tbody>
            </table>
        </div>
        <div class="entry-count">
            📊 Showing <strong>${data.length}</strong> recent entries
        </div>
    `;
    
    historyContent.innerHTML = tableHTML;
}

// Load history on page load
loadHistory();

// Refresh button
refreshBtn.addEventListener('click', loadHistory);
