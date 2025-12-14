// DOM Elements
const historyContent = document.getElementById('historyContent');
const refreshBtn = document.getElementById('refreshBtn');
const loginSection = document.getElementById('loginSection');
const historySection = document.getElementById('historySection');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const passwordInput = document.getElementById('passwordInput');
const loginError = document.getElementById('loginError');

// Session token stored in sessionStorage (cleared when browser closes)
let sessionToken = sessionStorage.getItem('historySessionToken');
let lockoutTimer = null;
let lockoutEndTime = null;

// Check if authentication is required
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        
        if (!data.requiresAuth) {
            // No auth required, show history directly
            showHistorySection();
            loadHistory();
            return;
        }
        
        // Auth required, check if we have a valid session
        if (sessionToken) {
            // Try to load history with existing token
            const testResponse = await fetch('/api/history/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Token': sessionToken
                }
            });
            
            if (testResponse.ok) {
                showHistorySection();
                const result = await testResponse.json();
                if (result.success && result.data && result.data.length > 0) {
                    displayHistoryTable(result.data);
                } else {
                    historyContent.innerHTML = '<div class="loading" style="animation: none;">No history data available</div>';
                }
                return;
            } else {
                // Session expired, clear it
                sessionStorage.removeItem('historySessionToken');
                sessionToken = null;
            }
        }
        
        // Show login form
        showLoginSection();
    } catch (error) {
        console.error('Auth check failed:', error);
        showLoginSection();
    }
}

function showLoginSection() {
    loginSection.classList.remove('hidden');
    historySection.classList.add('hidden');
}

function showHistorySection() {
    loginSection.classList.add('hidden');
    historySection.classList.remove('hidden');
}

async function login() {
    const password = passwordInput.value;
    
    // Check if currently locked out
    if (lockoutEndTime && Date.now() < lockoutEndTime) {
        return;
    }
    
    if (!password) {
        showLoginError('Please enter a password');
        return;
    }
    
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            sessionToken = result.sessionToken;
            sessionStorage.setItem('historySessionToken', sessionToken);
            hideLoginError();
            clearLockoutTimer();
            showHistorySection();
            loadHistory();
        } else if (result.lockedOut && result.retryAfter) {
            // Start lockout countdown
            startLockoutCountdown(result.retryAfter);
        } else {
            showLoginError(result.error || 'Login failed');
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    } catch (error) {
        showLoginError('Login failed: ' + error.message);
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
    }
}

function startLockoutCountdown(seconds) {
    lockoutEndTime = Date.now() + (seconds * 1000);
    loginBtn.disabled = true;
    passwordInput.disabled = true;
    
    // Clear any existing timer
    if (lockoutTimer) {
        clearInterval(lockoutTimer);
    }
    
    // Update immediately
    updateLockoutDisplay();
    
    // Start countdown timer
    lockoutTimer = setInterval(() => {
        updateLockoutDisplay();
    }, 1000);
}

function updateLockoutDisplay() {
    const now = Date.now();
    const remaining = Math.max(0, lockoutEndTime - now);
    
    if (remaining <= 0) {
        clearLockoutTimer();
        return;
    }
    
    const totalSeconds = Math.ceil(remaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    showLoginError(`Too many failed attempts. Try again in ${timeStr}`);
    loginBtn.textContent = `Locked (${timeStr})`;
}

function clearLockoutTimer() {
    if (lockoutTimer) {
        clearInterval(lockoutTimer);
        lockoutTimer = null;
    }
    lockoutEndTime = null;
    loginBtn.disabled = false;
    loginBtn.textContent = 'Login';
    passwordInput.disabled = false;
    hideLoginError();
}

async function logout() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'X-Session-Token': sessionToken
            }
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    sessionStorage.removeItem('historySessionToken');
    sessionToken = null;
    passwordInput.value = '';
    showLoginSection();
}

function showLoginError(message) {
    loginError.textContent = message;
    loginError.classList.remove('hidden');
}

function hideLoginError() {
    loginError.classList.add('hidden');
}

async function loadHistory() {
    historyContent.innerHTML = '<div class="loading">Loading history...</div>';
    
    try {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (sessionToken) {
            headers['X-Session-Token'] = sessionToken;
        }
        
        const response = await fetch('/api/history/request', {
            method: 'POST',
            headers: headers
        });

        const result = await response.json();

        if (response.status === 401) {
            // Session expired
            sessionStorage.removeItem('historySessionToken');
            sessionToken = null;
            showLoginSection();
            showLoginError('Session expired. Please login again.');
            return;
        }

        if (result.success && result.data && result.data.length > 0) {
            displayHistoryTable(result.data);
        } else if (result.success) {
            historyContent.innerHTML = '<div class="loading" style="animation: none;">No history data available</div>';
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

// Event listeners
loginBtn.addEventListener('click', login);
passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') login();
});
logoutBtn.addEventListener('click', logout);
refreshBtn.addEventListener('click', loadHistory);

// Initialize on page load
checkAuth();
