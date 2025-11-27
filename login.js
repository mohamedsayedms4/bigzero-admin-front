// تكوين API
const API_BASE_URL = 'https://api-spring.bigzero.online/api/v1/auth';

// التبديل بين التبويبات
function switchTab(tab) {
    const tabs = document.querySelectorAll('.tab');
    const forms = document.querySelectorAll('.form-section');
    
    tabs.forEach(t => t.classList.remove('active'));
    forms.forEach(f => f.classList.remove('active'));
    
    if (tab === 'login') {
        tabs[0].classList.add('active');
        document.getElementById('loginForm').classList.add('active');
    } else {
        tabs[1].classList.add('active');
        document.getElementById('signupForm').classList.add('active');
    }
    
    hideAlert();
}

// عرض/إخفاء الرسائل
function showAlert(message, type = 'success') {
    const alert = document.getElementById('alertMessage');
    alert.textContent = message;
    alert.className = `alert alert-${type} show`;
}

function hideAlert() {
    const alert = document.getElementById('alertMessage');
    alert.classList.remove('show');
}

// فحص قوة كلمة المرور
function checkPasswordStrength() {
    const password = document.getElementById('signupPassword').value;
    const bar = document.getElementById('strengthBar');
    
    bar.className = 'password-strength-bar';
    
    if (password.length < 8) {
        bar.classList.add('strength-weak');
    } else if (password.length < 12 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
        bar.classList.add('strength-medium');
    } else {
        bar.classList.add('strength-strong');
    }
}

// تسجيل الدخول
async function handleLogin(event) {
    event.preventDefault();
    hideAlert();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');
    
    btn.disabled = true;
    btn.innerHTML = 'جاري تسجيل الدخول...<span class="loading"></span>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) {
            throw new Error('فشل تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور');
        }
        
        const data = await response.json();
        
        // حفظ التوكنات
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        
        showAlert('تم تسجيل الدخول بنجاح! 🎉', 'success');
        
        setTimeout(() => {
            loadDashboard();
        }, 1000);
        
    } catch (error) {
        showAlert(error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'تسجيل الدخول';
    }
}

// إنشاء حساب جديد
async function handleSignup(event) {
    event.preventDefault();
    hideAlert();
    
    const username = document.getElementById('signupUsername').value;
    const email = document.getElementById('signupEmail').value;
    const phone = document.getElementById('signupPhone').value;
    const password = document.getElementById('signupPassword').value;
    const btn = document.getElementById('signupBtn');
    
    btn.disabled = true;
    btn.innerHTML = 'جاري إنشاء الحساب...<span class="loading"></span>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, phone, password })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'فشل إنشاء الحساب');
        }
        
        const data = await response.json();
        
        // حفظ التوكنات
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        
        showAlert('تم إنشاء الحساب بنجاح! 🎉', 'success');
        
        setTimeout(() => {
            loadDashboard();
        }, 1000);
        
    } catch (error) {
        showAlert(error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'إنشاء حساب';
    }
}

// تحميل لوحة التحكم
async function loadDashboard() {
    const accessToken = localStorage.getItem('accessToken');
    
    if (!accessToken) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/hello`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (response.status === 401) {
            // محاولة تجديد التوكن
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                return loadDashboard();
            } else {
                throw new Error('انتهت صلاحية الجلسة');
            }
        }
        
        if (!response.ok) {
            throw new Error('فشل تحميل البيانات');
        }
        
        const data = await response.json();
        
        // عرض معلومات المستخدم
        document.getElementById('dashUsername').textContent = data.message.replace('Hello, ', '').replace('!', '');
        document.getElementById('dashEmail').textContent = data.email || '-';
        document.getElementById('dashIp').textContent = data.ip;
        
        // إخفاء نموذج تسجيل الدخول وعرض لوحة التحكم
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('dashboard').classList.add('active');
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        logout();
    }
}

// تجديد الـ Access Token
async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
        return false;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken })
        });
        
        if (!response.ok) {
            return false;
        }
        
        const data = await response.json();
        
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        
        return true;
        
    } catch (error) {
        console.error('Error refreshing token:', error);
        return false;
    }
}

// تسجيل الخروج
async function handleLogout() {
    const accessToken = localStorage.getItem('accessToken');
    
    try {
        await fetch(`${API_BASE_URL}/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
    } catch (error) {
        console.error('Error logging out:', error);
    } finally {
        logout();
    }
}

function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('dashboard').classList.remove('active');
    
    // إعادة تعيين النماذج
    document.getElementById('loginForm').reset();
    document.getElementById('signupForm').reset();
    
    switchTab('login');
    showAlert('تم تسجيل الخروج بنجاح', 'success');
}

// فحص حالة تسجيل الدخول عند تحميل الصفحة
window.addEventListener('load', () => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
        loadDashboard();
    }
});

// تجديد التوكن تلقائياً كل 50 دقيقة (قبل انتهاء صلاحية الـ Access Token)
setInterval(async () => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
        await refreshAccessToken();
    }
}, 50 * 60 * 1000);