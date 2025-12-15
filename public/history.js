const historyContent = document.getElementById('historyContent');
const refreshBtn = document.getElementById('refreshBtn');
const loginSection = document.getElementById('loginSection');
const historySection = document.getElementById('historySection');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const passwordInput = document.getElementById('passwordInput');
const loginError = document.getElementById('loginError');

let sessionToken = sessionStorage.getItem('historySessionToken');
let lockoutTimer = null;
let lockoutEndTime = null;

const LOCKOUT_STORAGE_KEY = 'loginLockout';
const MAX_CLIENT_ATTEMPTS = 5;
const CLIENT_LOCKOUT_DURATION = 3 * 60 * 1000; // 3 minutes

function getClientLockoutState() {
    const stored = localStorage.getItem(LOCKOUT_STORAGE_KEY);
    if (!stored) return { attempts: 0, lockoutUntil: 0 };
    try {
        return JSON.parse(stored);
    } catch {
        return { attempts: 0, lockoutUntil: 0 };
    }
}

function setClientLockoutState(state) {
    localStorage.setItem(LOCKOUT_STORAGE_KEY, JSON.stringify(state));
}

function clearClientLockoutState() {
    localStorage.removeItem(LOCKOUT_STORAGE_KEY);
}

function checkClientLockout() {
    const state = getClientLockoutState();
    const now = Date.now();
    
    if (state.lockoutUntil && now < state.lockoutUntil) {
        const remaining = Math.ceil((state.lockoutUntil - now) / 1000);
        return { lockedOut: true, retryAfter: remaining };
    }
    
    if (state.lockoutUntil && now >= state.lockoutUntil) {
        clearClientLockoutState();
        return { lockedOut: false };
    }
    
    return { lockedOut: false, attempts: state.attempts };
}

function recordFailedAttempt() {
    const state = getClientLockoutState();
    state.attempts = (state.attempts || 0) + 1;
    
    if (state.attempts >= MAX_CLIENT_ATTEMPTS) {
        state.lockoutUntil = Date.now() + CLIENT_LOCKOUT_DURATION;
    }
    
    setClientLockoutState(state);
    return state;
}

async function checkAuth() {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        
        if (!data.requiresAuth) {
            showHistorySection();
            loadHistory();
            return;
        }
        
        if (sessionToken) {
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
                sessionStorage.removeItem('historySessionToken');
                sessionToken = null;
            }
        }
        
        showLoginSection();
    } catch (error) {
        console.error('Auth check failed:', error);
        showLoginSection();
    }
}

function showLoginSection() {
    loginSection.classList.remove('hidden');
    historySection.classList.add('hidden');
    
    const clientLockout = checkClientLockout();
    if (clientLockout.lockedOut) {
        startLockoutCountdown(clientLockout.retryAfter);
    }
}

function showHistorySection() {
    loginSection.classList.add('hidden');
    historySection.classList.remove('hidden');
}

async function login() {
    const password = passwordInput.value;
    
    const clientLockout = checkClientLockout();
    if (clientLockout.lockedOut) {
        startLockoutCountdown(clientLockout.retryAfter);
        return;
    }
    
    if (lockoutEndTime && Date.now() < lockoutEndTime) {
        return;
    }
    
    if (!password) {
        showLoginError('Please enter a password');
        return;
    }
    
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';
    
    const recaptchaToken = grecaptcha.getResponse();
    if (!recaptchaToken) {
        showLoginError('Please complete the reCAPTCHA checkbox');
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
        return;
    }
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password, recaptchaToken })
        });
        
        const result = await response.json();
        
        
        if (result.success) {
            clearClientLockoutState();
            sessionToken = result.sessionToken;
            sessionStorage.setItem('historySessionToken', sessionToken);
            hideLoginError();
            clearLockoutTimer();
            showHistorySection();
            loadHistory();
        } else if (result.lockedOut && result.retryAfter) {
            recordFailedAttempt(); 
            grecaptcha.reset(); 
            startLockoutCountdown(result.retryAfter);
        } else {

            const state = recordFailedAttempt();
            const attemptsRemaining = MAX_CLIENT_ATTEMPTS - state.attempts;
            grecaptcha.reset(); 
            
            if (state.lockoutUntil) {
                
                const remaining = Math.ceil((state.lockoutUntil - Date.now()) / 1000);
                startLockoutCountdown(remaining);
            } else {
                
                showLoginError(`Invalid password. ${attemptsRemaining} attempts remaining.`);
                loginBtn.disabled = false;
                loginBtn.textContent = 'Login';
            }
        }
    } catch (error) {
        showLoginError('Login failed: ' + error.message);
        grecaptcha.reset(); 
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
    }
}

function startLockoutCountdown(seconds) {
    lockoutEndTime = Date.now() + (seconds * 1000);
    loginBtn.disabled = true;
    passwordInput.disabled = true;
    
   
    if (lockoutTimer) {
        clearInterval(lockoutTimer);
    }
    
   
    updateLockoutDisplay();
  
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
    clearClientLockoutState();
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


loginBtn.addEventListener('click', login);
passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') login();
});
logoutBtn.addEventListener('click', logout);
refreshBtn.addEventListener('click', loadHistory);


checkAuth();
