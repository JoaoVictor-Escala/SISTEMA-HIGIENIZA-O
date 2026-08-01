const API_URL = '/api';

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

const handleResponse = async (res) => {
    if (res.status === 204) return {};
    
    let data = {};
    try {
        data = await res.json();
    } catch (e) {}

    if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
            throw new Error('Sessão expirada. Faça login novamente.');
        }
        throw new Error(data.error || 'Sessão expirada. Faça login novamente.');
    }
    // Trial expired — dispatch a global event so Layout.jsx can show the paywall
    if (res.status === 402) {
        window.dispatchEvent(new CustomEvent('trial-expired', { detail: data }));
        throw new Error(data.message || 'Período de teste encerrado.');
    }
    
    if (!res.ok) throw new Error(data.error || 'Erro na requisição');
    return data;
};

export const get = async (endpoint) => {
    const res = await fetch(`${API_URL}${endpoint}`, { headers: getHeaders() });
    return handleResponse(res);
};

export const post = async (endpoint, data) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
    });
    return handleResponse(res);
};

const put = (url, body) => fetch(`${API_URL}${url}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(body)
}).then(handleResponse);
const del = (url) => fetch(`${API_URL}${url}`, {
    method: 'DELETE',
    headers: getHeaders()
}).then(handleResponse);

// AUTH & STRIPE
export const login = (email, password) => post('/auth/login', { email, password });
export const register = (name, email, password, affiliateCode) => post('/auth/register', { name, email, password, affiliateCode });
export const verifyEmail = (token) => post('/auth/verify-email', { token });
export const forgotPassword = (email) => post('/auth/forgot-password', { email });
export const resetPassword = (token, password) => post('/auth/reset-password', { token, password });
export const subscribePlan = () => { throw new Error('Use o checkout Stripe'); }; // DESATIVADA
export const createCheckoutSession = (priceId) => post('/auth/create-checkout', { priceId });
export const createPaymentIntent = (priceId, couponCode) => post('/auth/create-payment-intent', { priceId, couponCode });
export const checkCoupon = (code) => post('/auth/check-coupon', { code });
export const changePassword = (currentPassword, newPassword) => put('/auth/change-password', { currentPassword, newPassword });
export const getTrialStatus = () => get('/auth/trial-status');
export const verifySubscription = () => get('/auth/verify-subscription');
export const getPlanPrice = () => get('/plan-price');

// CLIENTS
export const getClientsOptions = () => get('/clients/options');
export const getClients = (page, limit, search, tipo) => {
    let query = '';
    if (page && limit) {
        query = `?page=${page}&limit=${limit}`;
        if (search) query += `&search=${encodeURIComponent(search)}`;
        if (tipo) query += `&tipo=${encodeURIComponent(tipo)}`;
    }
    return get(`/clients${query}`);
};
export const addClient = (b) => post('/clients', b);
export const updateClient = (id, b) => put(`/clients/${id}`, b);
export const deleteClient = (id) => del(`/clients/${id}`);
export const getClientOrders = (id) => get(`/clients/${id}/orders`);

// ORDERS
export const getOrders = (page, limit, search, status) => {
    let query = '';
    if (page && limit) {
        query = `?page=${page}&limit=${limit}`;
        if (search) query += `&search=${encodeURIComponent(search)}`;
        if (status) query += `&status=${encodeURIComponent(status)}`;
    }
    return get(`/orders${query}`);
};
export const addOrder = (b) => post('/orders', b);
export const updateOrderStatus = (id, status) => put(`/orders/${id}/status`, { status });
export const updateOrder = (id, b) => put(`/orders/${id}`, b);
export const deleteOrder = (id) => del(`/orders/${id}`);

// INVENTORY
export const getInventory = () => get('/inventory');
export const addInventoryItem = (b) => post('/inventory', b);
export const updateInventoryItem = (id, b) => put(`/inventory/${id}`, b);
export const deleteInventoryItem = (id) => del(`/inventory/${id}`);

// FINANCE
export const getTransactions = () => get('/transactions');
export const addTransaction = (b) => post('/transactions', b);
export const deleteTransaction = (id) => del(`/transactions/${id}`);

// QUOTES & PORTAL
export const getQuotes = () => get('/quotes');
export const getQuoteById = (id) => get(`/quotes/${id}`);
export const addQuote = (b) => post('/quotes', b);
export const updateQuote = (id, b) => put(`/quotes/${id}`, b);
export const updateQuoteStatus = (id, status) => put(`/quotes/${id}/status`, { status });
export const deleteQuote = (id) => del(`/quotes/${id}`);
export const getPortalData = (id) => get(`/portal/${id}`);
export const approvePortalQuote = (id) => put(`/portal/${id}/approve`, {});

// CONFIG
export const getConfig = () => get('/config');
export const setConfig = (b) => put('/config', b);
export const getStats = () => get('/stats');
export const getAnalytics = (period) => get(`/analytics${period ? `?period=${period}` : ''}`);
export const getAlerts = () => get('/alerts');

// FOLLOW-UPS
export const getFollowups = () => get('/followups');
export const cancelFollowup = (id) => del(`/followups/${id}`);
export const sendFollowupNow = (id) => post(`/followups/${id}/send-now`, {});
export const updateFollowup = (id, b) => put(`/followups/${id}`, b);

// WHATSAPP
export const connectWhatsapp = () => post('/whatsapp/connect', {});
export const getWhatsappStatus = () => get('/whatsapp/status');
export const disconnectWhatsapp = () => del('/whatsapp/disconnect');

// NOTIFICATIONS
export const getNotifications = () => get('/notifications');
export const markNotificationRead = (id) => put(`/notifications/${id}/read`, {});

// AI CONSULTANT
export const askConsultantAI = (text, image, sessionId) => post('/ai/chat', { text, image, sessionId });
export const getAiSessions = () => get('/ai/sessions');
export const getAiHistory = (sessionId) => get(`/ai/history/${sessionId}`);
export const deleteAiSession = (sessionId) => del(`/ai/sessions/${sessionId}`);

// Generic API object
export const API = { get, post, put, delete: del };

// COMMISSIONS (Admin)
export const getAffiliateCommissions = (affiliateId) => get(`/admin/affiliates/${affiliateId}/commissions`);
export const markCommissionPaid = (commissionId) => API.put(`/admin/commissions/${commissionId}/pay`, {});
export const getAdminMetrics = () => API.get('/admin/metrics');

// COLLABORATORS
export const getCollaborators = () => get('/collaborators');
export const addCollaborator = (b) => post('/collaborators', b);
export const updateCollaborator = (id, b) => put(`/collaborators/${id}`, b);
export const deleteCollaborator = (id) => del(`/collaborators/${id}`);
