import db from './db.js';

const handleOrderCompletion = (tenant_id, client_id, scheduled_for) => {
  if (!client_id) return;
  let datePart = '';
  if (scheduled_for && typeof scheduled_for === 'string') {
    datePart = scheduled_for.substring(0, 10);
  }
  // Validate format YYYY-MM-DD
  const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(datePart);
  if (!isValidFormat) {
    datePart = new Date().toISOString().split('T')[0];
  }

  db.prepare("UPDATE clients SET tipo = 'cliente', last_service_date = ? WHERE id = ? AND tenant_id = ?")
    .run(datePart, client_id, tenant_id);
};

export const getClients = (tenant_id, page, limit, search, tipo) => {
  if (!page || !limit) {
    // Retorno legado (todo o array)
    let q = 'SELECT * FROM clients WHERE tenant_id = ?';
    let p = [tenant_id];
    if (tipo && tipo !== 'todos') {
      q += " AND (tipo = ? OR (? = 'cliente' AND tipo IS NULL))";
      p.push(tipo, tipo);
    }
    q += ' ORDER BY id DESC';
    return db.prepare(q).all(...p);
  }

  const offset = (page - 1) * limit;
  let query = 'SELECT * FROM clients WHERE tenant_id = ?';
  let countQuery = 'SELECT COUNT(*) as total FROM clients WHERE tenant_id = ?';
  const params = [tenant_id];

  if (tipo && tipo !== 'todos') {
    query += " AND (tipo = ? OR (? = 'cliente' AND tipo IS NULL))";
    countQuery += " AND (tipo = ? OR (? = 'cliente' AND tipo IS NULL))";
    params.push(tipo, tipo);
  }

  if (search && search.trim() !== '') {
    query += ' AND (name LIKE ? OR phone LIKE ?)';
    countQuery += ' AND (name LIKE ? OR phone LIKE ?)';
    const searchParam = `%${search.trim()}%`;
    params.push(searchParam, searchParam);
  }

  query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  const rows = db.prepare(query).all(...params, limit, offset);
  const total = db.prepare(countQuery).get(...params).total;

  return {
    data: rows,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / limit)
  };
};

export const getClientsOptions = (tenant_id) => {
  return db.prepare('SELECT id, name, phone, address FROM clients WHERE tenant_id = ? ORDER BY name ASC').all(tenant_id);
};

export const addClient = (tenant_id, client) => {
  const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  const stmt = db.prepare('INSERT INTO clients (id, tenant_id, name, phone, address, last_service_date, tipo) VALUES (?, ?, ?, ?, ?, ?, ?)');
  stmt.run(id, tenant_id, client.name, client.phone || '', client.address || '', client.last_service_date || '', client.tipo || 'cliente');
  return db.prepare('SELECT * FROM clients WHERE id = ? AND tenant_id = ?').get(id, tenant_id);
};
export const updateClient = (tenant_id, id, fields) => {
  const current = db.prepare('SELECT * FROM clients WHERE id = ? AND tenant_id = ?').get(id, tenant_id);
  if (!current) return null;
  const name = fields.name !== undefined ? fields.name : current.name;
  const phone = fields.phone !== undefined ? fields.phone : current.phone;
  const address = fields.address !== undefined ? fields.address : current.address;
  const last_service_date = fields.last_service_date !== undefined ? fields.last_service_date : current.last_service_date;
  const tipo = fields.tipo !== undefined ? fields.tipo : (current.tipo || 'cliente');
  db.prepare('UPDATE clients SET name=?, phone=?, address=?, last_service_date=?, tipo=? WHERE id=? AND tenant_id=?').run(name, phone, address, last_service_date, tipo, id, tenant_id);
  return db.prepare('SELECT * FROM clients WHERE id = ? AND tenant_id = ?').get(id, tenant_id);
};
export const deleteClient = (tenant_id, id) => {
  db.prepare('DELETE FROM clients WHERE id = ? AND tenant_id = ?').run(id, tenant_id);
};
export const getClientOrders = (tenant_id, id) => {
  return db.prepare('SELECT * FROM orders WHERE client_id = ? AND tenant_id = ?').all(id, tenant_id);
};

// ===== ORDERS =====
export const getOrders = (tenant_id, page, limit, search, status, collaborator_id = null, role = null) => {
  if (!page || !limit) {
    // Retorno legado (todo o array)
    let q = 'SELECT * FROM orders WHERE tenant_id = ?';
    let p = [tenant_id];
    if (status && status !== 'Todos') {
      q += ' AND status = ?';
      p.push(status);
    }
    if (role === 'tecnico' && collaborator_id) {
      q += ' AND assigned_to = ?';
      p.push(collaborator_id);
    }
    q += ' ORDER BY id DESC';
    return db.prepare(q).all(...p);
  }

  const offset = (page - 1) * limit;
  let query = 'SELECT * FROM orders WHERE tenant_id = ?';
  let countQuery = 'SELECT COUNT(*) as total FROM orders WHERE tenant_id = ?';
  const params = [tenant_id];

  if (status && status !== 'Todos') {
    query += ' AND status = ?';
    countQuery += ' AND status = ?';
    params.push(status);
  }

  if (role === 'tecnico' && collaborator_id) {
    query += ' AND assigned_to = ?';
    countQuery += ' AND assigned_to = ?';
    params.push(collaborator_id);
  }

  if (search && search.trim() !== '') {
    query += ' AND (description LIKE ? OR service LIKE ? OR client_name LIKE ?)';
    countQuery += ' AND (description LIKE ? OR service LIKE ? OR client_name LIKE ?)';
    const searchParam = `%${search.trim()}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  const rows = db.prepare(query).all(...params, limit, offset);
  const total = db.prepare(countQuery).get(...params).total;

  return {
    data: rows,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / limit)
  };
};
export const addOrder = (tenant_id, order) => {
  const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  const todayDate = new Date().toISOString().split('T')[0];
  // Resolve client_name if only client_id was passed
  let client_name = order.client_name || '';
  if (!client_name && order.client_id) {
    const c = db.prepare('SELECT name FROM clients WHERE id = ? AND tenant_id = ?').get(order.client_id, tenant_id);
    if (c) client_name = c.name;
  }
  db.prepare(
    'INSERT INTO orders (id, tenant_id, client_id, client_name, service, description, date, scheduled_for, status, price, down_payment, quote_id, assigned_to) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id, tenant_id,
    order.client_id, client_name,
    order.description || order.service || '',
    order.description || '',
    todayDate,
    order.scheduled_for || '',
    order.status || 'Agendado',
    Number(order.price) || 0,
    Number(order.down_payment) || 0,
    order.quote_id || null,
    order.assigned_to || null
  );

  if (order.status === 'Finalizado') {
    if (order.client_id) {
      handleOrderCompletion(tenant_id, order.client_id, order.scheduled_for);
    }
    if (order.quote_id) {
      db.prepare('DELETE FROM quotes WHERE id = ? AND tenant_id = ?').run(order.quote_id, tenant_id);
    }
  }

  return db.prepare('SELECT * FROM orders WHERE id = ? AND tenant_id = ?').get(id, tenant_id);
};
export const deleteOrder = (tenant_id, id) => {
  db.prepare('DELETE FROM orders WHERE id = ? AND tenant_id = ?').run(id, tenant_id);
};
export const updateOrderStatus = (tenant_id, id, status) => {
  db.prepare('UPDATE orders SET status = ? WHERE id = ? AND tenant_id = ?').run(status, id, tenant_id);

  if (status === 'Finalizado') {
    const order = db.prepare('SELECT client_id, scheduled_for, quote_id FROM orders WHERE id = ? AND tenant_id = ?').get(id, tenant_id);
    if (order) {
      if (order.client_id) {
        handleOrderCompletion(tenant_id, order.client_id, order.scheduled_for);
      }
      if (order.quote_id) {
        db.prepare('DELETE FROM quotes WHERE id = ? AND tenant_id = ?').run(order.quote_id, tenant_id);
      }
    }
  }

  return db.prepare('SELECT * FROM orders WHERE id = ? AND tenant_id = ?').get(id, tenant_id);
};
export const updateOrder = (tenant_id, id, fields) => {
  const current = db.prepare('SELECT * FROM orders WHERE id = ? AND tenant_id = ?').get(id, tenant_id);
  if (!current) return null;
  const service       = fields.description !== undefined ? fields.description : (fields.service !== undefined ? fields.service : current.service);
  const description   = fields.description !== undefined ? fields.description : current.description;
  const scheduled_for = fields.scheduled_for !== undefined ? fields.scheduled_for : current.scheduled_for;
  const price         = fields.price !== undefined ? Number(fields.price) : current.price;
  const down_payment  = fields.down_payment !== undefined ? Number(fields.down_payment) : current.down_payment;
  const status        = fields.status !== undefined ? fields.status : current.status;
  const client_id     = fields.client_id !== undefined ? fields.client_id : current.client_id;
  const assigned_to   = fields.assigned_to !== undefined ? fields.assigned_to : current.assigned_to;
  // Resolve client name from DB if client_id changed
  let client_name = current.client_name;
  if (fields.client_id && fields.client_id !== current.client_id) {
    const c = db.prepare('SELECT name FROM clients WHERE id = ? AND tenant_id = ?').get(fields.client_id, tenant_id);
    if (c) client_name = c.name;
  }
  db.prepare('UPDATE orders SET service=?, description=?, scheduled_for=?, price=?, down_payment=?, status=?, client_id=?, client_name=?, assigned_to=? WHERE id=? AND tenant_id=?')
    .run(service, description, scheduled_for, price, down_payment, status, client_id, client_name, assigned_to, id, tenant_id);

  if (status === 'Finalizado') {
    handleOrderCompletion(tenant_id, client_id, scheduled_for);
    if (current.quote_id) {
      db.prepare('DELETE FROM quotes WHERE id = ? AND tenant_id = ?').run(current.quote_id, tenant_id);
    }
  }

  return db.prepare('SELECT * FROM orders WHERE id = ? AND tenant_id = ?').get(id, tenant_id);
};


// ===== INVENTORY =====
export const getInventory = (tenant_id) => {
  return db.prepare('SELECT * FROM inventory WHERE tenant_id = ?').all(tenant_id);
};
export const addInventoryItem = (tenant_id, item) => {
  const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  const cost = Number(item.cost || item.price_per_unit) || 0; // accept both field names
  db.prepare('INSERT INTO inventory (id, tenant_id, name, quantity, min_quantity, cost) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, tenant_id, item.name, Number(item.quantity) || 0, Number(item.min_quantity) || 0, cost);
  return db.prepare('SELECT * FROM inventory WHERE id = ? AND tenant_id = ?').get(id, tenant_id);
};
export const updateInventoryItem = (tenant_id, id, fields) => {
  const current = db.prepare('SELECT * FROM inventory WHERE id = ? AND tenant_id = ?').get(id, tenant_id);
  if (!current) return null;
  const name = fields.name !== undefined ? fields.name : current.name;
  const quantity = fields.quantity !== undefined ? Number(fields.quantity) : current.quantity;
  const min_quantity = fields.min_quantity !== undefined ? Number(fields.min_quantity) : current.min_quantity;
  db.prepare('UPDATE inventory SET name=?, quantity=?, min_quantity=? WHERE id=? AND tenant_id=?')
    .run(name, quantity, min_quantity, id, tenant_id);
  return db.prepare('SELECT * FROM inventory WHERE id = ? AND tenant_id = ?').get(id, tenant_id);
};
export const deleteInventoryItem = (tenant_id, id) => {
  db.prepare('DELETE FROM inventory WHERE id = ? AND tenant_id = ?').run(id, tenant_id);
};

// ===== TRANSACTIONS =====
export const getTransactions = (tenant_id) => {
  return db.prepare('SELECT * FROM transactions WHERE tenant_id = ?').all(tenant_id);
};
export const addTransaction = (tenant_id, tx) => {
  const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  db.prepare('INSERT INTO transactions (id, tenant_id, description, amount, type, date, category) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, tenant_id, tx.description, Number(tx.amount) || 0, tx.type, tx.date, tx.category || '');
  return db.prepare('SELECT * FROM transactions WHERE id = ? AND tenant_id = ?').get(id, tenant_id);
};
export const deleteTransaction = (tenant_id, id) => {
  db.prepare('DELETE FROM transactions WHERE id = ? AND tenant_id = ?').run(id, tenant_id);
};

// ===== QUOTES =====
export const getQuotes = (tenant_id) => {
  return db.prepare('SELECT * FROM quotes WHERE tenant_id = ?').all(tenant_id);
};
export const getQuoteById = (tenant_id, id) => {
  if (!tenant_id) return db.prepare('SELECT * FROM quotes WHERE id = ?').get(id);
  return db.prepare('SELECT * FROM quotes WHERE id = ? AND tenant_id = ?').get(id, tenant_id);
};
export const addQuote = (tenant_id, quote) => {
  const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  // Accept both client_name (direct) or client_id (resolve from DB)
  let client_name = quote.client_name || '';
  let client_phone = quote.client_phone || '';
  if (quote.client_id) {
    const c = db.prepare('SELECT name, phone FROM clients WHERE id = ? AND tenant_id = ?').get(quote.client_id, tenant_id);
    if (c) { client_name = c.name; client_phone = c.phone || ''; }
  }
  // Accept both 'lines' (frontend format) and 'services' (original format)
  const servicesData = quote.lines || quote.services || [];
  const servicesJson = typeof servicesData === 'string' ? servicesData : JSON.stringify(servicesData);
  db.prepare('INSERT INTO quotes (id, tenant_id, client_id, client_name, client_phone, services, notes, total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, tenant_id, quote.client_id || null, client_name, client_phone, servicesJson, quote.notes || '', Number(quote.total) || 0, 'Pendente');
  return db.prepare('SELECT * FROM quotes WHERE id = ? AND tenant_id = ?').get(id, tenant_id);
};
export const updateQuote = (tenant_id, id, quote) => {
  let client_name = quote.client_name || '';
  let client_phone = quote.client_phone || '';
  if (quote.client_id) {
    const c = db.prepare('SELECT name, phone FROM clients WHERE id = ? AND tenant_id = ?').get(quote.client_id, tenant_id);
    if (c) { client_name = c.name; client_phone = c.phone || ''; }
  }
  const servicesData = quote.lines || quote.services || [];
  const servicesJson = typeof servicesData === 'string' ? servicesData : JSON.stringify(servicesData);
  db.prepare('UPDATE quotes SET client_id=?, client_name=?, client_phone=?, services=?, notes=?, total=? WHERE id=? AND tenant_id=?')
    .run(quote.client_id || null, client_name, client_phone, servicesJson, quote.notes || '', Number(quote.total) || 0, id, tenant_id);
  return db.prepare('SELECT * FROM quotes WHERE id = ? AND tenant_id = ?').get(id, tenant_id);
};
export const updateQuoteStatus = (tenant_id, id, status) => {
  if (!tenant_id) {
    db.prepare('UPDATE quotes SET status = ? WHERE id = ?').run(status, id);
    return db.prepare('SELECT * FROM quotes WHERE id = ?').get(id);
  }
  db.prepare('UPDATE quotes SET status = ? WHERE id = ? AND tenant_id = ?').run(status, id, tenant_id);
  return db.prepare('SELECT * FROM quotes WHERE id = ? AND tenant_id = ?').get(id, tenant_id);
};
export const deleteQuote = (tenant_id, id) => {
  db.prepare('DELETE FROM quotes WHERE id = ? AND tenant_id = ?').run(id, tenant_id);
};

// ===== CONFIG =====
export const getConfig = (tenant_id) => {
  let c = db.prepare('SELECT * FROM config WHERE tenant_id = ?').get(tenant_id);
  if (!c) {
    db.prepare('INSERT INTO config (tenant_id, companyName, ownerName, whatsapp, monthlyGoal, followup_days, followup_message) VALUES (?, ?, ?, ?, ?, ?, ?)').run(tenant_id, 'Minha Empresa', 'Proprietário', '', 10000, 60, '');
    c = db.prepare('SELECT * FROM config WHERE tenant_id = ?').get(tenant_id);
  }
  return c;
};
export const setConfig = (tenant_id, config) => {
  const c = getConfig(tenant_id);
  const companyName    = config.companyName    !== undefined ? config.companyName    : c.companyName;
  const ownerName      = config.ownerName      !== undefined ? config.ownerName      : c.ownerName;
  const whatsapp       = config.whatsapp       !== undefined ? config.whatsapp       : c.whatsapp;
  const monthlyGoal    = config.monthlyGoal    !== undefined ? Number(config.monthlyGoal) : c.monthlyGoal;
  const followup_days  = config.followup_days  !== undefined ? Number(config.followup_days) : (c.followup_days || 60);
  const followup_message = config.followup_message !== undefined ? config.followup_message : (c.followup_message || '');
  const onboarding_completed = config.onboarding_completed !== undefined ? Number(config.onboarding_completed) : (c.onboarding_completed || 0);
  db.prepare('UPDATE config SET companyName=?, ownerName=?, whatsapp=?, monthlyGoal=?, followup_days=?, followup_message=?, onboarding_completed=? WHERE tenant_id=?')
    .run(companyName, ownerName, whatsapp, monthlyGoal, followup_days, followup_message, onboarding_completed, tenant_id);
  return getConfig(tenant_id);
};

// ===== ALERTS =====
export const getAlerts = (tenant_id, collaborator_id = null, role = null) => {
  const inv = db.prepare(`SELECT * FROM inventory WHERE tenant_id = ? AND quantity <= min_quantity AND min_quantity > 0`).all(tenant_id);
  const lowStock = inv.length;
  
  const pend = db.prepare(`SELECT * FROM quotes WHERE tenant_id = ? AND status = 'Pendente'`).all(tenant_id);
  const pendingQuotes = pend.length;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const isoDate = sixMonthsAgo.toISOString().slice(0, 10);
  const clientsRet = db.prepare(`SELECT * FROM clients WHERE tenant_id = ? AND last_service_date < ? AND last_service_date != '' ORDER BY last_service_date ASC`).all(tenant_id, isoDate);

  const pendingFollowups = db.prepare(`SELECT COUNT(*) as count FROM followups WHERE tenant_id = ? AND status = 'pendente'`).get(tenant_id)?.count || 0;

  const todayStr = new Date().toISOString().split('T')[0];
  let todayQuery = 'SELECT * FROM orders WHERE tenant_id = ? AND scheduled_for LIKE ? || \'%\'';
  let todayParams = [tenant_id, todayStr];
  if (role === 'tecnico' && collaborator_id) {
    todayQuery += ' AND assigned_to = ?';
    todayParams.push(collaborator_id);
  }
  todayQuery += ' ORDER BY scheduled_for ASC';
  const todayOrders = db.prepare(todayQuery).all(...todayParams);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  let tomorrowQuery = `
    SELECT o.*, c.phone as client_phone 
    FROM orders o 
    LEFT JOIN clients c ON c.id = o.client_id AND c.tenant_id = o.tenant_id
    WHERE o.tenant_id = ? AND o.scheduled_for LIKE ? || '%'
  `;
  let tomorrowParams = [tenant_id, tomorrowStr];
  if (role === 'tecnico' && collaborator_id) {
    tomorrowQuery += ' AND o.assigned_to = ?';
    tomorrowParams.push(collaborator_id);
  }
  tomorrowQuery += ' ORDER BY o.scheduled_for ASC';
  const tomorrowOrders = db.prepare(tomorrowQuery).all(...tomorrowParams);

  return { 
    lowStock, 
    pendingQuotes, 
    clientsToReturn: clientsRet, // Return array now
    clientsToReturnCount: clientsRet.length,
    pendingFollowups, 
    total: lowStock + pendingQuotes + clientsRet.length,
    todayOrders,
    tomorrowOrders
  };
};

// ===== FOLLOW-UPS =====
export const scheduleFollowup = (tenant_id, order_id, client_id, client_name, client_phone, message, days) => {
  const id = Date.now().toString() + Math.random().toString(36).substr(2, 4);
  const d = new Date();
  d.setDate(d.getDate() + days);
  const scheduled_for = d.toISOString().split('T')[0];
  db.prepare(
    'INSERT INTO followups (id, tenant_id, order_id, client_id, client_name, client_phone, message, scheduled_for, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, tenant_id, order_id, client_id, client_name, client_phone, message, scheduled_for, 'pendente');
  return db.prepare('SELECT * FROM followups WHERE id = ?').get(id);
};
export const getFollowups = (tenant_id) => {
  return db.prepare('SELECT * FROM followups WHERE tenant_id = ? ORDER BY scheduled_for ASC').all(tenant_id);
};
export const cancelFollowup = (tenant_id, id) => {
  db.prepare('UPDATE followups SET status = ? WHERE id = ? AND tenant_id = ?').run('cancelado', id, tenant_id);
  return db.prepare('SELECT * FROM followups WHERE id = ?').get(id);
};
export const markFollowupSent = (id) => {
  const now = new Date().toISOString();
  db.prepare('UPDATE followups SET status = ?, sent_at = ? WHERE id = ?').run('enviado', now, id);
};
export const getPendingFollowupsDue = () => {
  const today = new Date().toISOString().split('T')[0];
  return db.prepare("SELECT * FROM followups WHERE status = 'pendente' AND scheduled_for <= ?").all(today);
};
export const updateFollowupMessage = (tenant_id, id, message, scheduled_for) => {
  const f = db.prepare('SELECT * FROM followups WHERE id = ? AND tenant_id = ?').get(id, tenant_id);
  if (!f) return null;
  const newMsg = message !== undefined ? message : f.message;
  const newDate = scheduled_for !== undefined ? scheduled_for : f.scheduled_for;
  db.prepare('UPDATE followups SET message = ?, scheduled_for = ? WHERE id = ? AND tenant_id = ?').run(newMsg, newDate, id, tenant_id);
  return db.prepare('SELECT * FROM followups WHERE id = ?').get(id);
};

// ===== STATS =====
export const getStats = (tenant_id) => {
  const orders = db.prepare('SELECT * FROM orders WHERE tenant_id = ?').all(tenant_id);
  const clientsCount = db.prepare('SELECT COUNT(*) as count FROM clients WHERE tenant_id = ?').get(tenant_id).count;

  // Revenue from receita transactions this month (consistent with Financeiro)
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  const monthTxs = db.prepare(
    "SELECT * FROM transactions WHERE tenant_id = ? AND type = 'receita' AND date >= ? AND date <= ?"
  ).all(tenant_id, startOfMonth, endOfMonth);
  const monthlyRevenue = monthTxs.reduce((a, t) => a + Number(t.amount || 0), 0);

  return {
    monthlyRevenue,
    finishedOrders: orders.filter(o => o.status === 'Finalizado').length,
    pendingOrders:  orders.filter(o => o.status === 'Aguardando').length,
    scheduledOrders: orders.filter(o => o.status === 'Agendado').length,
    returnsCount: clientsCount,
  };
};

// Returns all orders scheduled for tomorrow across ALL tenants (for email reminders)
export const getOrdersScheduledForTomorrow = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
  // Join with tenants to get tenant email for sending reminder
  return db.prepare(`
    SELECT o.*, t.email as tenant_email, t.name as tenant_owner_name,
           c.companyName as company_name
    FROM orders o
    JOIN tenants t ON t.id = o.tenant_id
    LEFT JOIN config c ON c.tenant_id = o.tenant_id
    WHERE o.scheduled_for LIKE ? || '%'
      AND o.status NOT IN ('Finalizado', 'Cancelado')
  `).all(tomorrowDate);
};

export const getAnalytics = (tenant_id, period = '1y') => {
  // 1. Revenue by period
  const revenueByMonth = [];
  const now = new Date();

  if (period === '7d') {
    // Last 7 days — daily data
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }).replace('.', '');
      
      const txs = db.prepare(
        "SELECT SUM(amount) as total FROM transactions WHERE tenant_id = ? AND type = 'receita' AND date = ?"
      ).get(tenant_id, dateStr);
      
      revenueByMonth.push({
        name: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
        revenue: txs?.total || 0
      });
    }
  } else if (period === '1m') {
    // Last 30 days — group by week (4 weeks)
    for (let i = 3; i >= 0; i--) {
      const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i * 7));
      const weekStart = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate() - 6);
      const startStr = weekStart.toISOString().split('T')[0];
      const endStr = weekEnd.toISOString().split('T')[0];
      const label = `${weekStart.getDate()}/${weekStart.getMonth()+1} - ${weekEnd.getDate()}/${weekEnd.getMonth()+1}`;
      
      const txs = db.prepare(
        "SELECT SUM(amount) as total FROM transactions WHERE tenant_id = ? AND type = 'receita' AND date >= ? AND date <= ?"
      ).get(tenant_id, startStr, endStr);
      
      revenueByMonth.push({
        name: label,
        revenue: txs?.total || 0
      });
    }
  } else {
    // Last 12 months — monthly data (default '1y')
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      const monthStr = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      
      const txs = db.prepare(
        "SELECT SUM(amount) as total FROM transactions WHERE tenant_id = ? AND type = 'receita' AND date >= ? AND date <= ?"
      ).get(tenant_id, startOfMonth, endOfMonth);
      
      revenueByMonth.push({
        name: monthStr.charAt(0).toUpperCase() + monthStr.slice(1),
        revenue: txs?.total || 0
      });
    }
  }

  // 2. Services Distribution (top 5 services from finalized orders)
  const topServicesRaw = db.prepare(`
    SELECT service, COUNT(*) as count 
    FROM orders 
    WHERE tenant_id = ? AND status = 'Finalizado' 
    GROUP BY service 
    ORDER BY count DESC 
    LIMIT 5
  `).all(tenant_id);
  const servicesDistribution = topServicesRaw.map(s => ({
    name: s.service || 'Outros',
    value: s.count
  }));

  // 3. CRM Conversion (quotes statuses)
  const quotesRaw = db.prepare(`
    SELECT status, COUNT(*) as count 
    FROM quotes 
    WHERE tenant_id = ? 
    GROUP BY status
  `).all(tenant_id);
  const crmConversion = quotesRaw.map(q => ({
    name: q.status,
    value: q.count
  }));

  // 4. Inadimplência (Valor A Receber)
  const totalFinalizedOrders = db.prepare(`
    SELECT SUM(price) as total 
    FROM orders 
    WHERE tenant_id = ? AND status = 'Finalizado'
  `).get(tenant_id)?.total || 0;
  
  const totalReceita = db.prepare(`
    SELECT SUM(amount) as total 
    FROM transactions 
    WHERE tenant_id = ? AND type = 'receita'
  `).get(tenant_id)?.total || 0;

  const inadimplencia = Math.max(0, totalFinalizedOrders - totalReceita);

  return {
    revenueByMonth,
    servicesDistribution,
    crmConversion,
    inadimplencia,
    totalFaturado: totalFinalizedOrders
  };
};


// Auth Helpers
export const verifyTenant = (email, id) => {
  if (id) return db.prepare('SELECT * FROM tenants WHERE id = ?').get(id);
  return db.prepare('SELECT * FROM tenants WHERE email = ?').get(email);
};

export const createTenant = (name, email, password_hash, verification_token, referred_by = null) => {
  const tenant_id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
  db.prepare('INSERT INTO tenants (id, name, email, password_hash, subscription_status, email_verified, verification_token, referred_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(tenant_id, name, email, password_hash, 'beta', 0, verification_token, referred_by);
  db.prepare('INSERT INTO config (tenant_id, companyName, ownerName, whatsapp, monthlyGoal) VALUES (?, ?, ?, ?, ?)')
    .run(tenant_id, name, name, '', 10000);
  return db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenant_id);
};

export const verifyEmail = (token) => {
  const tenant = db.prepare('SELECT * FROM tenants WHERE verification_token = ?').get(token);
  if (!tenant) return null;
  db.prepare('UPDATE tenants SET email_verified = 1, verification_token = NULL WHERE id = ?').run(tenant.id);
  return db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenant.id);
};

export const seedDemoData = (tenant_id) => {
  const now = new Date().toISOString().split('T')[0];
  const uid = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 4);

  const todayDate = now;
  const oldDate = (monthsAgo) => {
    const d = new Date();
    d.setMonth(d.getMonth() - monthsAgo);
    return d.toISOString().split('T')[0];
  };
  const todayAt = (h, m) => {
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  // Demo Clients — 2 with old service dates to trigger "Clientes para Contato"
  const demoClients = [
    { id: uid(), name: 'Ana Souza (DEMO)', phone: '(31) 98888-1001', address: 'Rua das Flores, 120 - BH', last_service: todayDate },
    { id: uid(), name: 'Carlos Lima (DEMO)', phone: '(31) 99777-2002', address: 'Av. Afonso Pena, 500 - BH', last_service: todayDate },
    { id: uid(), name: 'Hotel Exemplo (DEMO)', phone: '(31) 3333-9090', address: 'Rua dos Hoteis, 10 - BH', last_service: todayDate },
    { id: uid(), name: 'Maria Oliveira (DEMO)', phone: '(31) 98111-3003', address: 'Rua Principal, 77 - Contagem', last_service: oldDate(8) },
    { id: uid(), name: 'Roberto Costa (DEMO)', phone: '(31) 97555-4004', address: 'Av. Brasil, 900 - BH', last_service: oldDate(10) },
  ];
  demoClients.forEach(c => {
    db.prepare('INSERT INTO clients (id, tenant_id, name, phone, address, last_service_date) VALUES (?, ?, ?, ?, ?, ?)')
      .run(c.id, tenant_id, c.name, c.phone, c.address, c.last_service);
  });

  // Demo Orders — 2 with scheduled_for today so they show on "Agenda de Hoje"
  const demoOrders = [
    { id: uid(), client_id: demoClients[0].id, client_name: demoClients[0].name, service: 'Sofá 3 lugares', status: 'Finalizado', price: 320, scheduled_for: todayAt(9, 0) },
    { id: uid(), client_id: demoClients[1].id, client_name: demoClients[1].name, service: 'Tapete 4x3m', status: 'Agendado', price: 180, scheduled_for: todayAt(14, 30) },
    { id: uid(), client_id: demoClients[2].id, client_name: demoClients[2].name, service: 'Cadeiras (6 und)', status: 'Aguardando', price: 420, scheduled_for: null },
  ];
  demoOrders.forEach(o => {
    db.prepare('INSERT INTO orders (id, tenant_id, client_id, client_name, service, date, scheduled_for, status, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(o.id, tenant_id, o.client_id, o.client_name, o.service, todayDate, o.scheduled_for, o.status, o.price);
  });

  // Demo Transactions
  const demoTxs = [
    { id: uid(), description: 'Serviço Ana Souza (DEMO)', amount: 320, type: 'receita', date: todayDate, category: 'Serviço de Higienização' },
    { id: uid(), description: 'Tapete Carlos Lima (DEMO)', amount: 180, type: 'receita', date: todayDate, category: 'Serviço de Higienização' },
    { id: uid(), description: 'Produto de limpeza (DEMO)', amount: 85, type: 'despesa', date: todayDate, category: 'Materiais/Insumos' },
  ];
  demoTxs.forEach(t => {
    db.prepare('INSERT INTO transactions (id, tenant_id, description, amount, type, date, category) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(t.id, tenant_id, t.description, t.amount, t.type, t.date, t.category);
  });

  // Demo Inventory
  db.prepare('INSERT INTO inventory (id, tenant_id, name, quantity, min_quantity, cost) VALUES (?, ?, ?, ?, ?, ?)')
    .run(uid(), tenant_id, 'Detergente Enzyme (DEMO)', 12, 5, 25);
  db.prepare('INSERT INTO inventory (id, tenant_id, name, quantity, min_quantity, cost) VALUES (?, ?, ?, ?, ?, ?)')
    .run(uid(), tenant_id, 'Saco de assar (DEMO)', 3, 10, 8);
};

// Only wipe rows that are demo data (name contains '(DEMO)')
export const clearDemoData = (tenant_id) => {
  db.prepare("DELETE FROM orders WHERE tenant_id = ? AND (client_name LIKE '%(DEMO)%' OR service LIKE '%(DEMO)%')").run(tenant_id);
  db.prepare("DELETE FROM clients WHERE tenant_id = ? AND name LIKE '%(DEMO)%'").run(tenant_id);
  db.prepare("DELETE FROM transactions WHERE tenant_id = ? AND description LIKE '%(DEMO)%'").run(tenant_id);
  db.prepare("DELETE FROM inventory WHERE tenant_id = ? AND name LIKE '%(DEMO)%'").run(tenant_id);
  db.prepare("DELETE FROM quotes WHERE tenant_id = ? AND client_name LIKE '%(DEMO)%'").run(tenant_id);
};

export const markDemoSeeded = (tenant_id) => {
  db.prepare('UPDATE tenants SET demo_seeded = 1 WHERE id = ?').run(tenant_id);
};

export const updateTenantStatus = (tenant_id, status) => {
  db.prepare('UPDATE tenants SET subscription_status = ? WHERE id = ?').run(status, tenant_id);
  return db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenant_id);
};

export const resetTenantTrial = (tenant_id) => {
  const now = new Date().toISOString();
  db.prepare('UPDATE tenants SET trial_started_at = ?, subscription_status = ? WHERE id = ?').run(now, 'pending', tenant_id);
  return db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenant_id);
};

export const extendTenantTrial = (tenant_id, days) => {
  const msPerHour = 1000 * 60 * 60;
  const targetDate = new Date(Date.now() + (days * 24 - 4) * msPerHour).toISOString();
  db.prepare('UPDATE tenants SET trial_started_at = ?, subscription_status = ? WHERE id = ?').run(targetDate, 'pending', tenant_id);
  return db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenant_id);
};

export const markTrialWarningSent = (tenant_id) => {
  db.prepare('UPDATE tenants SET trial_warning_sent = 1 WHERE id = ?').run(tenant_id);
};

// Returns non-pro tenants whose trial expires within the next 75 minutes
// and haven't received a warning email yet
export const getTenantsNearTrialExpiry = () => {
  const TRIAL_HOURS = 4;
  const all = db.prepare(
    "SELECT * FROM tenants WHERE subscription_status != 'pro' AND email_verified = 1 AND trial_warning_sent = 0"
  ).all();

  const now = Date.now();
  return all.filter(t => {
    const startedAt = t.trial_started_at
      ? new Date(t.trial_started_at).getTime()
      : new Date(t.created_at || now).getTime();
    const expiresAt = startedAt + TRIAL_HOURS * 60 * 60 * 1000;
    const msLeft = expiresAt - now;
    // Send warning if 0 < msLeft <= 75 minutes
    return msLeft > 0 && msLeft <= 75 * 60 * 1000;
  });
};


export const getAllTenants = () => {
  const tenants = db.prepare('SELECT id, name, email, subscription_status, created_at, trial_started_at FROM tenants ORDER BY created_at DESC').all();
  return tenants.map(t => {
    const clientsCount = db.prepare('SELECT COUNT(*) as count FROM clients WHERE tenant_id = ?').get(t.id)?.count || 0;
    return { ...t, clientsCount };
  });
};

export const updateTenantStripe = (tenant_id, stripe_customer_id, plan) => {
  db.prepare('UPDATE tenants SET stripe_customer_id = ?, stripe_plan = ? WHERE id = ?')
    .run(stripe_customer_id, plan, tenant_id);
};

export const getTenantByStripeCustomer = (stripe_customer_id) => {
  return db.prepare('SELECT * FROM tenants WHERE stripe_customer_id = ?').get(stripe_customer_id);
};

export const updateTenantPassword = (tenant_id, new_hash) => {
  db.prepare('UPDATE tenants SET password_hash = ? WHERE id = ?').run(new_hash, tenant_id);
};

export const updateTenantWhatsappConfig = (tenant_id, instance_name, status) => {
  db.prepare('UPDATE config SET whatsapp_instance_name = ?, whatsapp_status = ? WHERE tenant_id = ?')
    .run(instance_name, status, tenant_id);
};

export const setResetToken = (email, token, expiry) => {
  db.prepare('UPDATE tenants SET reset_password_token = ?, reset_password_expiry = ? WHERE email = ?')
    .run(token, expiry, email);
};

export const findTenantByResetToken = (token) => {
  return db.prepare('SELECT * FROM tenants WHERE reset_password_token = ?').get(token);
};

export const clearResetToken = (tenant_id) => {
  db.prepare('UPDATE tenants SET reset_password_token = NULL, reset_password_expiry = NULL WHERE id = ?')
    .run(tenant_id);
};

// ===== NOTIFICATIONS =====
export const getNotifications = (tenant_id) => {
  return db.prepare('SELECT * FROM notifications WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50').all(tenant_id);
};

export const addNotification = (tenant_id, title, message, type = 'info') => {
  const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  db.prepare('INSERT INTO notifications (id, tenant_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
    .run(id, tenant_id, title, message, type);
  return { id, title, message, type };
};

export const markNotificationRead = (tenant_id, id) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND tenant_id = ?').run(id, tenant_id);
};

// ===== AFFILIATES =====
export const getAffiliates = () => {
  return db.prepare('SELECT * FROM affiliates ORDER BY created_at DESC').all();
};

export const getAffiliateByCode = (code) => {
  if (!code) return null;
  return db.prepare('SELECT * FROM affiliates WHERE UPPER(code) = UPPER(?)').get(code.trim());
};

export const createAffiliate = (affiliate) => {
  const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  const code = affiliate.code.toUpperCase().trim();
  db.prepare('INSERT INTO affiliates (id, name, code, discount_percentage, commission_percentage, pix_key) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, affiliate.name, code, Number(affiliate.discount_percentage) || 0, Number(affiliate.commission_percentage) || 0, affiliate.pix_key || '');
  return db.prepare('SELECT * FROM affiliates WHERE id = ?').get(id);
};

export const updateAffiliate = (id, data) => {
  db.prepare('UPDATE affiliates SET name = ?, commission_percentage = ?, pix_key = ? WHERE id = ?')
    .run(data.name, Number(data.commission_percentage) || 0, data.pix_key || '', id);
  return db.prepare('SELECT * FROM affiliates WHERE id = ?').get(id);
};

export const setAffiliatePassword = (id, password_hash) => {
  db.prepare('UPDATE affiliates SET password_hash = ? WHERE id = ?').run(password_hash, id);
};

export const getAffiliateByCodeForLogin = (code) => {
  if (!code) return null;
  return db.prepare('SELECT * FROM affiliates WHERE UPPER(code) = UPPER(?)').get(code.trim());
};

export const getAffiliateReferrals = (code) => {
  if (!code) return [];
  // Returns all tenants who used this code, with their subscription status
  return db.prepare('SELECT id, name, email, subscription_status, created_at FROM tenants WHERE UPPER(referred_by) = UPPER(?) ORDER BY created_at DESC').all(code.trim());
};

export const setTenantAffiliate = (tenant_id, code) => {
  if (!code) return;
  db.prepare('UPDATE tenants SET referred_by = ? WHERE id = ?').run(code.toUpperCase().trim(), tenant_id);
};

// ===== AFFILIATE COMMISSIONS =====
export const recordAffiliateCommission = ({ affiliate_code, tenant_id, tenant_name, invoice_amount, commission_amount, commission_percentage, stripe_invoice_id }) => {
  const id = Date.now().toString() + Math.random().toString(36).substr(2, 4);
  // Avoid duplicate commissions for the same invoice
  const exists = db.prepare('SELECT id FROM affiliate_commissions WHERE stripe_invoice_id = ?').get(stripe_invoice_id);
  if (exists) return null;
  db.prepare('INSERT INTO affiliate_commissions (id, affiliate_code, tenant_id, tenant_name, invoice_amount, commission_amount, commission_percentage, stripe_invoice_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, affiliate_code.toUpperCase(), tenant_id, tenant_name, invoice_amount, commission_amount, commission_percentage, stripe_invoice_id || null);
  return db.prepare('SELECT * FROM affiliate_commissions WHERE id = ?').get(id);
};

export const getCommissionsByAffiliate = (affiliate_code) => {
  return db.prepare('SELECT * FROM affiliate_commissions WHERE UPPER(affiliate_code) = UPPER(?) ORDER BY created_at DESC').all(affiliate_code);
};

export const getAllCommissions = () => {
  return db.prepare('SELECT * FROM affiliate_commissions ORDER BY created_at DESC').all();
};

export const markCommissionPaid = (id) => {
  const now = new Date().toISOString();
  db.prepare("UPDATE affiliate_commissions SET status = 'pago', paid_at = ? WHERE id = ?").run(now, id);
  return db.prepare('SELECT * FROM affiliate_commissions WHERE id = ?').get(id);
};

export const getAffiliateBalance = (affiliate_code) => {
  const pending = db.prepare("SELECT SUM(commission_amount) as total FROM affiliate_commissions WHERE UPPER(affiliate_code) = UPPER(?) AND status = 'pendente'").get(affiliate_code);
  const paid    = db.prepare("SELECT SUM(commission_amount) as total FROM affiliate_commissions WHERE UPPER(affiliate_code) = UPPER(?) AND status = 'pago'").get(affiliate_code);
  return { pending: pending?.total || 0, paid: paid?.total || 0 };
};

// --- AI CHAT HISTORY ---
export const getAiSessions = (tenantId) => {
  return db.prepare('SELECT id, title, created_at FROM ai_chat_sessions WHERE tenant_id = ? ORDER BY created_at DESC').all(tenantId);
};

export const createAiSession = (tenantId, title) => {
  const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
  db.prepare('INSERT INTO ai_chat_sessions (id, tenant_id, title) VALUES (?, ?, ?)')
    .run(id, tenantId, title);
  return { id, title };
};

export const deleteAiSession = (tenantId, sessionId) => {
  db.prepare('DELETE FROM ai_chat_sessions WHERE tenant_id = ? AND id = ?').run(tenantId, sessionId);
};

export const getAiChats = (tenantId, sessionId) => {
  if (!sessionId) return [];
  return db.prepare('SELECT id, role, content as text, image, created_at FROM ai_chats WHERE tenant_id = ? AND session_id = ? ORDER BY created_at ASC').all(tenantId, sessionId);
};

export const saveAiChat = (tenantId, sessionId, role, content, image = null) => {
  const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
  db.prepare('INSERT INTO ai_chats (id, tenant_id, session_id, role, content, image) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, tenantId, sessionId, role, content, image);
  return { id, role, text: content, image };
};

export const clearAiChats = (tenantId, sessionId) => {
  db.prepare('DELETE FROM ai_chats WHERE tenant_id = ? AND session_id = ?').run(tenantId, sessionId);
};


// ===== COLLABORATORS =====
export const getCollaborators = (tenant_id) => {
  return db.prepare('SELECT id, tenant_id, name, email, role, created_at FROM collaborators WHERE tenant_id = ? ORDER BY name ASC').all(tenant_id);
};

export const addCollaborator = (tenant_id, colab) => {
  const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  db.prepare('INSERT INTO collaborators (id, tenant_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, tenant_id, colab.name, colab.email, colab.password_hash, colab.role || 'tecnico');
  return db.prepare('SELECT id, tenant_id, name, email, role, created_at FROM collaborators WHERE id = ? AND tenant_id = ?').get(id, tenant_id);
};

export const updateCollaborator = (tenant_id, id, fields) => {
  const current = db.prepare('SELECT * FROM collaborators WHERE id = ? AND tenant_id = ?').get(id, tenant_id);
  if (!current) return null;
  const name = fields.name !== undefined ? fields.name : current.name;
  const role = fields.role !== undefined ? fields.role : current.role;
  let password_hash = current.password_hash;
  if (fields.password_hash) {
    password_hash = fields.password_hash;
  }
  db.prepare('UPDATE collaborators SET name = ?, role = ?, password_hash = ? WHERE id = ? AND tenant_id = ?')
    .run(name, role, password_hash, id, tenant_id);
  return db.prepare('SELECT id, tenant_id, name, email, role, created_at FROM collaborators WHERE id = ? AND tenant_id = ?').get(id, tenant_id);
};

export const deleteCollaborator = (tenant_id, id) => {
  db.prepare('DELETE FROM collaborators WHERE id = ? AND tenant_id = ?').run(id, tenant_id);
  // Unassign any orders assigned to this collaborator
  db.prepare('UPDATE orders SET assigned_to = NULL WHERE assigned_to = ? AND tenant_id = ?').run(id, tenant_id);
};

