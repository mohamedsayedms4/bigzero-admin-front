// ملف الإعدادات - غير الـ API URL حسب السيرفر الخاص بك
const API_CONFIG = {
    BASE_URL: 'https://api-spring.bigzero.online',
    ENDPOINTS: {
        SUPPLIERS: '/api/suppliers',
        INVOICES: '/api/invoices',
        PRODUCTS: '/api/v1/products'
    }
};

// دوال مساعدة للـ API
const apiHelper = {
    // دالة للحصول على Headers
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        const token = localStorage.getItem('accessToken');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    },

    // تجديد التوكن
    async refreshToken() {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) return false;

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refreshToken })
            });

            if (!response.ok) return false;

            const data = await response.json();
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            return true;

        } catch (error) {
            console.error('Error refreshing token:', error);
            return false;
        }
    },

    // معالجة الأخطاء 401
    async handleUnauthorized() {
        const refreshed = await this.refreshToken();
        if (!refreshed) {
            showAlert('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى', 'error');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setTimeout(() => {
                location.reload();
            }, 2000);
            throw new Error('Unauthorized - Session expired');
        }
        return refreshed;
    },

    // GET request
    async get(url, retryCount = 0) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders()
            });
            
            if (response.status === 401 && retryCount < 1) {
                await this.handleUnauthorized();
                return this.get(url, retryCount + 1);
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('GET Error:', error);
            throw error;
        }
    },

    // POST request
    async post(url, data, retryCount = 0) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });
            
            if (response.status === 401 && retryCount < 1) {
                await this.handleUnauthorized();
                return this.post(url, data, retryCount + 1);
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('POST Error:', error);
            throw error;
        }
    },

    // PUT request
    async put(url, data, retryCount = 0) {
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });
            
            if (response.status === 401 && retryCount < 1) {
                await this.handleUnauthorized();
                return this.put(url, data, retryCount + 1);
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('PUT Error:', error);
            throw error;
        }
    },

    // DELETE request
    async delete(url, retryCount = 0) {
        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            
            if (response.status === 401 && retryCount < 1) {
                await this.handleUnauthorized();
                return this.delete(url, retryCount + 1);
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return true;
        } catch (error) {
            console.error('DELETE Error:', error);
            throw error;
        }
    }
};

// دوال للتعامل مع الـ API
const supplierAPI = {
    getAll: () => apiHelper.get(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SUPPLIERS}`),
    getById: (id) => apiHelper.get(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SUPPLIERS}/${id}`),
    create: (data) => apiHelper.post(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SUPPLIERS}`, data),
    update: (id, data) => apiHelper.put(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SUPPLIERS}/${id}`, data),
    delete: (id) => apiHelper.delete(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SUPPLIERS}/${id}`)
};

const invoiceAPI = {
    getAll: () => apiHelper.get(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.INVOICES}`),
    getById: (id) => apiHelper.get(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.INVOICES}/${id}`),
    getBySupplier: (supplierId) => apiHelper.get(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.INVOICES}/supplier/${supplierId}`),
    create: (data) => apiHelper.post(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.INVOICES}`, data),
    update: (id, data) => apiHelper.put(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.INVOICES}/${id}`, data),
    delete: (id) => apiHelper.delete(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.INVOICES}/${id}`)
};

const productAPI = {
    getById: (id) => apiHelper.get(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}/${id}`)
};

// دوال مساعدة لتنسيق البيانات
const formatHelper = {
    currency: (amount) => {
        if (amount === null || amount === undefined) return '0.00 جنيه';
        return parseFloat(amount).toFixed(2) + ' جنيه';
    },

    date: (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    dateInput: (dateString) => {
        if (!dateString) {
            const today = new Date();
            return today.toISOString().split('T')[0];
        }
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    }
};

// دالة لعرض رسائل التنبيه
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : '#dc3545'};
        color: ${type === 'warning' ? '#000' : 'white'};
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s;
        font-weight: bold;
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.style.animation = 'fadeOut 0.3s';
        setTimeout(() => alertDiv.remove(), 300);
    }, 3000);
}

// إضافة الأنيميشن للـ CSS
if (!document.getElementById('alert-animations')) {
    const style = document.createElement('style');
    style.id = 'alert-animations';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes fadeOut {
            from {
                opacity: 1;
            }
            to {
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}