import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import Stripe from 'stripe';
import cron from 'node-cron';
import {
    getClients, getClientsOptions, addClient, updateClient, deleteClient, getClientOrders,
    getOrders, addOrder, deleteOrder, updateOrderStatus, updateOrder,
    getInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem,
    getTransactions, addTransaction, deleteTransaction,
    getQuotes, getQuoteById, addQuote, updateQuote, updateQuoteStatus, deleteQuote,
    getStats, getAnalytics, getAlerts, getConfig, setConfig, verifyTenant, createTenant, updateTenantStatus,
    verifyEmail, seedDemoData, clearDemoData, markDemoSeeded, updateTenantStripe, getTenantByStripeCustomer,
    updateTenantPassword, updateTenantWhatsappConfig,
    setResetToken, findTenantByResetToken, clearResetToken,
    getNotifications, addNotification, markNotificationRead,
    scheduleFollowup, getFollowups, cancelFollowup, updateFollowupMessage,
    getAffiliates, getAffiliateByCode, createAffiliate, updateAffiliate, getAffiliateReferrals, setTenantAffiliate,
    recordAffiliateCommission, getCommissionsByAffiliate, getAllCommissions, markCommissionPaid, getAffiliateBalance,
    setAffiliatePassword, getAffiliateByCodeForLogin,
    getAiChats, saveAiChat, getAiSessions, createAiSession, deleteAiSession,
    getAllTenants, resetTenantTrial, extendTenantTrial,
    getOrdersScheduledForTomorrow,
    markTrialWarningSent, getTenantsNearTrialExpiry,
    getCollaborators, addCollaborator, updateCollaborator, deleteCollaborator
} from './database.js';
import { startFollowupCron, processFollowupNow, buildFollowupMessage } from './followup.js';
import * as evolution from './evolution.js';
import { analyzeCleaningTask } from './ai.js';
import { runBackup, getBackupList, getBackupPath } from './backup.js';
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';

const __filename = fileURLToPath(import.meta.url);


// Validação de variáveis obrigatórias
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET não definido no .env!');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET;
const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const PLAN_PRICE = Number(process.env.STRIPE_PRICE_AMOUNT) || 47.90;

// Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;



// Configuração de Email (credenciais do .env)
const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const sendVerificationEmail = async (toEmail, toName, token) => {
  const link = `${APP_URL}/verify?token=${token}`;
  console.log(`\n📧 VERIFICATION LINK for ${toEmail}: ${link}\n`);
  try {
    await mailer.sendMail({
      from: '"LimpeJá Sistema" <suporte@jlescala.com>',
      to: toEmail,
      subject: 'Confirme seu e-mail — LimpeJá',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;background:#0f172a;color:#f8fafc;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#3b82f6,#6d28d9);padding:32px;text-align:center">
            <h1 style="margin:0;font-size:26px">LimpeJá</h1>
            <p style="margin:4px 0 0;opacity:.8">Sistema de Gestão de Higienização</p>
          </div>
          <div style="padding:32px">
            <h2 style="margin:0 0 12px">Olá, ${toName}! 👋</h2>
            <p style="color:#94a3b8">Seu workspace foi criado com sucesso. Clique no botão abaixo para confirmar seu e-mail e entrar no sistema em modo <strong>Beta gratuito</strong>.</p>
            <div style="text-align:center;margin:32px 0">
              <a href="${link}" style="background:#3b82f6;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">Confirmar E-mail e Entrar</a>
            </div>
            <p style="color:#64748b;font-size:13px">Se você não criou esta conta, ignore este e-mail.</p>
          </div>
        </div>
      `,
    });
    console.log(`✅ Email sent to ${toEmail}`);
  } catch(err) {
    console.error('❌ Email send failed:', err.message);
  }
};

const sendPasswordResetEmail = async (toEmail, toName, token) => {
  const link = `${APP_URL}/reset-password?token=${token}`;
  console.log(`\n🔑 RESET LINK for ${toEmail}: ${link}\n`);
  try {
    await mailer.sendMail({
      from: '"LimpeJá Sistema" <suporte@jlescala.com>',
      to: toEmail,
      subject: 'Recupere sua senha — LimpeJá',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;background:#0f172a;color:#f8fafc;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#ef4444,#991b1b);padding:32px;text-align:center">
            <h1 style="margin:0;font-size:26px">LimpeJá</h1>
            <p style="margin:4px 0 0;opacity:.8">Recuperação de Acesso</p>
          </div>
          <div style="padding:32px">
            <h2 style="margin:0 0 12px">Olá, ${toName}! 🔑</h2>
            <p style="color:#94a3b8">Você solicitou a recuperação de senha. Clique no botão abaixo para definir uma nova senha. Este link expira em 1 hora.</p>
            <div style="text-align:center;margin:32px 0">
              <a href="${link}" style="background:#ef4444;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">Definir Nova Senha</a>
            </div>
            <p style="color:#64748b;font-size:13px">Se você não solicitou isso, ignore este e-mail.</p>
          </div>
        </div>
      `,
    });
    console.log(`✅ Reset email sent to ${toEmail}`);
  } catch(err) {
    console.error('❌ Reset email send failed:', err.message);
  }
};

// Segurança: headers HTTP
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// CORS restrito ao domínio do app
app.use(cors({
  origin: APP_URL,
  credentials: true,
}));

// Rate limiting — proteção contra brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 15,
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
// Limiter geral — todas as rotas /api/
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em breve.' },
});
app.use('/api/', generalLimiter);

// Limiter para escrita de dados — POST/PUT/DELETE nas rotas de app
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40, // 40 writes por minuto por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas ações em pouco tempo. Aguarde alguns segundos.' },
});

// Limiter para rotas de IA (cara computacionalmente)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // 10 chamadas de IA por minuto
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de consultas à IA atingido. Tente novamente em 1 minuto.' },
});

// Stripe webhook needs raw body BEFORE express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// Preço do plano (frontend consulta para não hardcodar)
app.get('/api/plan-price', (req, res) => res.json({ price: PLAN_PRICE, currency: 'BRL' }));


// Middlewares
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Acesso negado: Token ausente' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.tenantId = decoded.tenant_id;
        req.collaboratorId = decoded.collaborator_id || null;
        req.userRole = decoded.role || 'owner';
        next();
    } catch(e) {
        res.status(401).json({ error: 'Token inválido ou expirado' });
    }
};

// Trial enforcement — blocks non-pro tenants after TRIAL_HOURS
const TRIAL_HOURS = 4;
const checkTrial = (req, res, next) => {
    const tenant = verifyTenant(null, req.tenantId);
    if (!tenant) return res.status(401).json({ error: 'Conta não encontrada' });

    // Pro users always pass
    if (tenant.subscription_status === 'pro') return next();

    // Calculate trial time
    const startedAt = tenant.trial_started_at
        ? new Date(tenant.trial_started_at)
        : new Date(tenant.created_at || Date.now());
    const hoursUsed = (Date.now() - startedAt.getTime()) / (1000 * 60 * 60);

    if (hoursUsed >= TRIAL_HOURS) {
        return res.status(402).json({
            trialExpired: true,
            hoursUsed: Math.round(hoursUsed * 10) / 10,
            message: 'Período de teste gratuito encerrado. Assine para continuar.',
        });
    }

    req.trialMinutesLeft = Math.max(0, Math.round((TRIAL_HOURS - hoursUsed) * 60));
    next();
};

// Rotas de Autenticação (com rate limiting)
app.use('/api/auth', authRoutes({
    JWT_SECRET,
    authLimiter,
    stripe,
    mailer,
    APP_URL,
    PLAN_PRICE,
    sendVerificationEmail,
    sendPasswordResetEmail,
    requireAuth
}));


// Webhook do Stripe
app.post('/api/stripe/webhook', async (req, res) => {
    if (!stripe) return res.status(503).end();

    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch(err) {
        console.error('Webhook signature failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`📦 Stripe event: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const tenantId = session.metadata?.tenant_id || session.client_reference_id;
        const plan = session.metadata?.plan || 'pro';
        if (tenantId) {
            clearDemoData(tenantId);
            updateTenantStatus(tenantId, 'pro');
            updateTenantStripe(tenantId, session.customer, plan);
        }
    }

    // Ativa o tenant quando o pagamento do Elements for confirmado
    if (event.type === 'invoice.payment_succeeded') {
        const invoice = event.data.object;
        const tenantId = invoice.subscription_details?.metadata?.tenant_id;
        let activatedTenant;

        if (tenantId) {
            const tenant = verifyTenant(null, tenantId);
            if (tenant && tenant.subscription_status !== 'pro') {
                clearDemoData(tenantId);
                updateTenantStatus(tenantId, 'pro');
                updateTenantStripe(tenantId, invoice.customer, 'pro');
            }
            activatedTenant = verifyTenant(null, tenantId);
        } else {
            // Fallback: busca pelo stripe customer
            const tenant = getTenantByStripeCustomer(invoice.customer);
            if (tenant && tenant.subscription_status !== 'pro') {
                clearDemoData(tenant.id);
                updateTenantStatus(tenant.id, 'pro');
            }
            activatedTenant = tenant;
        }

        // === AUTO-RECORD AFFILIATE COMMISSION ===
        if (activatedTenant && activatedTenant.referred_by) {
            const affiliate = getAffiliateByCode(activatedTenant.referred_by);
            if (affiliate && affiliate.commission_percentage > 0) {
                const invoiceAmountBrl = (invoice.amount_paid || 0) / 100;
                const commissionAmount = parseFloat((invoiceAmountBrl * affiliate.commission_percentage / 100).toFixed(2));
                const recorded = recordAffiliateCommission({
                    affiliate_code: affiliate.code,
                    tenant_id: activatedTenant.id,
                    tenant_name: activatedTenant.name,
                    invoice_amount: invoiceAmountBrl,
                    commission_amount: commissionAmount,
                    commission_percentage: affiliate.commission_percentage,
                    stripe_invoice_id: invoice.id,
                });
                if (recorded) {
                    console.log(`💰 Comissão registrada: ${affiliate.name} | R$ ${commissionAmount} (${affiliate.commission_percentage}% de R$ ${invoiceAmountBrl})`);
                }
            }
        }
    }

    // Assinatura cancelada — downgrade para pending (bloqueia o acesso)
    if (event.type === 'customer.subscription.deleted') {
        const sub = event.data.object;
        const tenant = getTenantByStripeCustomer(sub.customer);
        if (tenant) {
            updateTenantStatus(tenant.id, 'pending');
            console.log(`🔴 Assinatura cancelada — ${tenant.email} rebaixado para pending.`);
        }
    }

    // Falha no pagamento da fatura — bloqueia acesso imediatamente
    if (event.type === 'invoice.payment_failed') {
        const invoice = event.data.object;
        const tenant = getTenantByStripeCustomer(invoice.customer);
        if (tenant) {
            updateTenantStatus(tenant.id, 'pending');
            console.warn(`⚠️  Falha no pagamento para ${tenant.email} (fatura: ${invoice.id}). Rebaixado para pending.`);
        }
    }

    // Atualização de status da assinatura (ex: trial → active, active → past_due)
    if (event.type === 'customer.subscription.updated') {
        const sub = event.data.object;
        const tenant = getTenantByStripeCustomer(sub.customer);
        if (tenant) {
            if (sub.status === 'active') {
                // Garantir que está como pro se ficou active
                if (tenant.subscription_status !== 'pro') {
                    updateTenantStatus(tenant.id, 'pro');
                    console.log(`✅ Assinatura reativada — ${tenant.email} voltou para pro.`);
                }
            } else if (sub.status === 'past_due' || sub.status === 'unpaid' || sub.status === 'canceled') {
                // Inadimplente ou cancelado — bloqueia acesso
                updateTenantStatus(tenant.id, 'pending');
                console.log(`🔴 Assinatura ${sub.status} — ${tenant.email} rebaixado para pending.`);
            }
        }
    }

    res.json({ received: true });
});



// Rotas da API (Protegidas)

// Clientes
app.get('/api/clients/options', requireAuth, checkTrial, (req, res) => res.json(getClientsOptions(req.tenantId)));
app.get('/api/clients', requireAuth, checkTrial, (req, res) => {
    const { page, limit, search, tipo } = req.query;
    res.json(getClients(req.tenantId, page, limit, search, tipo));
});
app.post('/api/clients', requireAuth, checkTrial, writeLimiter, (req, res) => res.status(201).json(addClient(req.tenantId, req.body)));
app.put('/api/clients/:id', requireAuth, checkTrial, writeLimiter, (req, res) => {
    const r = updateClient(req.tenantId, req.params.id, req.body);
    r ? res.json(r) : res.status(404).json({ error: 'Not found' });
});
app.delete('/api/clients/:id', requireAuth, checkTrial, writeLimiter, (req, res) => { deleteClient(req.tenantId, req.params.id); res.status(204).end(); });
app.get('/api/clients/:id/orders', requireAuth, checkTrial, (req, res) => res.json(getClientOrders(req.tenantId, req.params.id)));

// Ordens de Serviço
app.get('/api/orders', requireAuth, checkTrial, (req, res) => {
    const { page, limit, search, status } = req.query;
    res.json(getOrders(req.tenantId, page, limit, search, status, req.collaboratorId, req.userRole));
});
app.post('/api/orders', requireAuth, checkTrial, writeLimiter, (req, res) => res.status(201).json(addOrder(req.tenantId, req.body)));
app.put('/api/orders/:id/status', requireAuth, checkTrial, (req, res) => {
    const { status } = req.body;
    const order = getOrders(req.tenantId, null, null, null, null, req.collaboratorId, req.userRole).find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Not found' });

    const r = updateOrderStatus(req.tenantId, req.params.id, status);

    // Auto-create receita transaction when order is finalized (if not already exists)
    if (status === 'Finalizado' && order.status !== 'Finalizado' && Number(order.price) > 0) {
        const txDesc = `${order.service || order.description} — ${order.client_name || ''}`.trim();
        const alreadyExists = getTransactions(req.tenantId).some(t =>
            t.description === txDesc && t.type === 'receita' && Math.abs(Number(t.amount) - Number(order.price)) < 0.01
        );
        if (!alreadyExists) {
            addTransaction(req.tenantId, {
                description: txDesc,
                amount: Number(order.price),
                type: 'receita',
                date: new Date().toISOString().split('T')[0],
                category: 'Serviço de Higienização',
            });
        }
    }

    // Auto-schedule follow-up when order is finalized
    if (status === 'Finalizado' && order.status !== 'Finalizado') {
        try {
            const cfg = getConfig(req.tenantId);
            const days = cfg.followup_days || 60;
            // Find client phone
            const clients = getClients(req.tenantId);
            const client = clients.find(c => c.id === order.client_id);
            const phone = client?.phone || '';
            if (phone) {
                const message = buildFollowupMessage(
                    order.client_name,
                    cfg.companyName,
                    order.service || order.description,
                    cfg.followup_message || ''
                );
                scheduleFollowup(
                    req.tenantId,
                    order.id,
                    order.client_id,
                    order.client_name,
                    phone,
                    message,
                    days
                );
                console.log(`📲 Follow-up agendado para ${order.client_name} em ${days} dias.`);
            } else {
                console.log(`⚠️  Follow-up não agendado — ${order.client_name} sem telefone.`);
            }
        } catch (err) {
            console.error('❌ Erro ao agendar follow-up:', err.message);
        }
    }

    r ? res.json(r) : res.status(404).json({ error: 'Not found' });
});
app.put('/api/orders/:id', requireAuth, (req, res) => {
    const r = updateOrder(req.tenantId, req.params.id, req.body);
    r ? res.json(r) : res.status(404).json({ error: 'Not found' });
});
app.delete('/api/orders/:id', requireAuth, checkTrial, (req, res) => { deleteOrder(req.tenantId, req.params.id); res.status(204).end(); });

// Estoque
app.get('/api/inventory', requireAuth, checkTrial, (req, res) => res.json(getInventory(req.tenantId)));
app.post('/api/inventory', requireAuth, checkTrial, (req, res) => res.status(201).json(addInventoryItem(req.tenantId, req.body)));
app.put('/api/inventory/:id', requireAuth, checkTrial, (req, res) => {
    const r = updateInventoryItem(req.tenantId, req.params.id, req.body);
    r ? res.json(r) : res.status(404).json({ error: 'Not found' });
});
app.delete('/api/inventory/:id', requireAuth, checkTrial, (req, res) => { deleteInventoryItem(req.tenantId, req.params.id); res.status(204).end(); });

// Transações (Oculto para Técnicos)
app.get('/api/transactions', requireAuth, checkTrial, (req, res) => {
    if (req.userRole === 'tecnico') return res.status(403).json({ error: 'Acesso negado: Somente proprietários.' });
    res.json(getTransactions(req.tenantId));
});
app.post('/api/transactions', requireAuth, checkTrial, (req, res) => {
    if (req.userRole === 'tecnico') return res.status(403).json({ error: 'Acesso negado: Somente proprietários.' });
    res.status(201).json(addTransaction(req.tenantId, req.body));
});
app.delete('/api/transactions/:id', requireAuth, checkTrial, (req, res) => {
    if (req.userRole === 'tecnico') return res.status(403).json({ error: 'Acesso negado: Somente proprietários.' });
    deleteTransaction(req.tenantId, req.params.id); 
    res.status(204).end(); 
});

// Colaboradores (Equipe)
app.get('/api/collaborators', requireAuth, checkTrial, (req, res) => {
    if (req.userRole === 'tecnico') return res.status(403).json({ error: 'Acesso negado: Somente proprietários.' });
    res.json(getCollaborators(req.tenantId));
});
app.post('/api/collaborators', requireAuth, checkTrial, writeLimiter, async (req, res) => {
    if (req.userRole === 'tecnico') return res.status(403).json({ error: 'Acesso negado: Somente proprietários.' });
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
    const password_hash = bcrypt.hashSync(password, 10);
    try {
        const result = addCollaborator(req.tenantId, { name, email, password_hash, role });
        res.status(201).json(result);
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'E-mail já cadastrado na equipe.' });
        }
        res.status(500).json({ error: err.message });
    }
});
app.put('/api/collaborators/:id', requireAuth, checkTrial, writeLimiter, async (req, res) => {
    if (req.userRole === 'tecnico') return res.status(403).json({ error: 'Acesso negado: Somente proprietários.' });
    const { name, role, password } = req.body;
    const fields = { name, role };
    if (password) {
        fields.password_hash = bcrypt.hashSync(password, 10);
    }
    const result = updateCollaborator(req.tenantId, req.params.id, fields);
    result ? res.json(result) : res.status(404).json({ error: 'Not found' });
});
app.delete('/api/collaborators/:id', requireAuth, checkTrial, writeLimiter, (req, res) => {
    if (req.userRole === 'tecnico') return res.status(403).json({ error: 'Acesso negado: Somente proprietários.' });
    deleteCollaborator(req.tenantId, req.params.id);
    res.status(204).end();
});

// Propostas
app.get('/api/quotes', requireAuth, checkTrial, (req, res) => res.json(getQuotes(req.tenantId)));
app.get('/api/quotes/:id', (req, res) => { // PUBLIC!
    const q = getQuoteById(null, req.params.id);
    q ? res.json(q) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/quotes', requireAuth, checkTrial, (req, res) => res.status(201).json(addQuote(req.tenantId, req.body)));
app.put('/api/quotes/:id', requireAuth, checkTrial, (req, res) => {
    const r = updateQuote(req.tenantId, req.params.id, req.body);
    r ? res.json(r) : res.status(404).json({ error: 'Not found' });
});
app.put('/api/quotes/:id/status', (req, res) => { // PUBLIC! (for client portal)
    const authHeader = req.headers.authorization;
    let tenantId = null;
    if (authHeader) {
       try { tenantId = jwt.verify(authHeader.split(' ')[1], JWT_SECRET).tenant_id; } catch { /* ignore */ }
    }
    const r = updateQuoteStatus(tenantId, req.params.id, req.body.status);
    r ? res.json(r) : res.status(404).json({ error: 'Not found' });
});
app.delete('/api/quotes/:id', requireAuth, checkTrial, (req, res) => { deleteQuote(req.tenantId, req.params.id); res.status(204).end(); });

// Rotas do Portal (Públicas)

// GET /api/portal/:id — returns quote + company info + linked OS
app.get('/api/portal/:id', (req, res) => {
    let quote = getQuoteById(null, req.params.id);
    
    if (!quote) {
        // Fallback: If not a quote ID, maybe it's an Order ID directly?
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
        if (order) {
            const orderCfg = getConfig(order.tenant_id);
            // Mock a quote object so the portal displays the service correctly
            return res.json({
                quote: { 
                    id: order.id, 
                    tenant_id: order.tenant_id, 
                    client_id: order.client_id, 
                    client_name: order.client_name, 
                    total: order.price, 
                    status: 'Aprovado', 
                    services: JSON.stringify([{ name: order.description || order.service, qty: 1, price: order.price }]), 
                    created_at: order.date 
                },
                company: { name: orderCfg.companyName, whatsapp: orderCfg.whatsapp },
                order: order,
            });
        }
        return res.status(404).json({ error: 'Proposta não encontrada' });
    }

    const cfg = getConfig(quote.tenant_id);

    // Find OS linked to this quote
    const allOrders = getOrders(quote.tenant_id);
    const order = allOrders.find(o => o.quote_id === req.params.id) || null;
    res.json({
        quote,
        company: { name: cfg.companyName, whatsapp: cfg.whatsapp },
        order,
    });
});

// PUT /api/portal/:id/approve — client approves the quote
app.put('/api/portal/:id/approve', (req, res) => {
    const quote = getQuoteById(null, req.params.id);
    if (!quote) return res.status(404).json({ error: 'Proposta não encontrada' });
    if (quote.status !== 'Pendente') return res.status(400).json({ error: 'Proposta já respondida', status: quote.status });
    
    updateQuoteStatus(null, req.params.id, 'Aprovado');

    // Disparar Notificação para o Tenant
    addNotification(
        quote.tenant_id, 
        '🎉 Proposta Aprovada!', 
        `O cliente aprovou a proposta para o serviço: ${quote.service || 'Higienização'}.`,
        'success'
    );

    res.json({ success: true, status: 'Aprovado' });
});

// Notificações
app.get('/api/notifications', requireAuth, (req, res) => res.json(getNotifications(req.tenantId)));
app.put('/api/notifications/:id/read', requireAuth, (req, res) => {
    markNotificationRead(req.tenantId, req.params.id);
    res.json({ success: true });
});

// Configurações
app.get('/api/config', requireAuth, (req, res) => res.json(getConfig(req.tenantId)));
app.put('/api/config', requireAuth, (req, res) => res.json(setConfig(req.tenantId, req.body)));

// Evolution API (WhatsApp)
app.post('/api/whatsapp/connect', requireAuth, async (req, res) => {
    try {
        const instanceName = `limpeja_${req.tenantId}`;
        const response = await evolution.createInstance(instanceName);
        
        let qrcode = '';
        if (response.qrcode?.base64) qrcode = response.qrcode.base64;
        else if (response.hash?.qrcode) qrcode = response.hash.qrcode;
        else if (response.base64) qrcode = response.base64;

        updateTenantWhatsappConfig(req.tenantId, instanceName, 'connecting');
        res.json({ instanceName, qrcode });
    } catch (err) {
        console.error('Erro ao conectar WhatsApp:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/whatsapp/status', requireAuth, async (req, res) => {
    try {
        const config = getConfig(req.tenantId);
        if (!config.whatsapp_instance_name) return res.json({ status: 'disconnected' });

        const response = await evolution.getConnectionState(config.whatsapp_instance_name);
        const state = response?.instance?.state || 'disconnected';
        
        updateTenantWhatsappConfig(req.tenantId, config.whatsapp_instance_name, state);
        res.json({ status: state });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/whatsapp/disconnect', requireAuth, async (req, res) => {
    try {
        const config = getConfig(req.tenantId);
        if (config.whatsapp_instance_name) {
            await evolution.logoutInstance(config.whatsapp_instance_name);
            updateTenantWhatsappConfig(req.tenantId, null, 'disconnected');
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Alertas e Estatísticas
app.get('/api/alerts', requireAuth, (req, res) => res.json(getAlerts(req.tenantId, req.collaboratorId, req.userRole)));
app.get('/api/stats', requireAuth, (req, res) => {
    if (req.userRole === 'tecnico') return res.status(403).json({ error: 'Acesso negado' });
    res.json(getStats(req.tenantId));
});
app.get('/api/analytics', requireAuth, (req, res) => {
    if (req.userRole === 'tecnico') return res.status(403).json({ error: 'Acesso negado' });
    res.json(getAnalytics(req.tenantId, req.query.period));
});

// Consultor IA
app.get('/api/ai/sessions', requireAuth, (req, res) => {
    try {
        const sessions = getAiSessions(req.tenantId);
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/ai/sessions/:id', requireAuth, (req, res) => {
    try {
        deleteAiSession(req.tenantId, req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/ai/history/:sessionId', requireAuth, (req, res) => {
    try {
        const history = getAiChats(req.tenantId, req.params.sessionId);
        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/ai/chat', requireAuth, aiLimiter, async (req, res) => {
    try {
        const tenant = verifyTenant(null, req.tenantId);
        if (!tenant || tenant.subscription_status !== 'pro') {
            return res.status(403).json({ error: 'O Consultor IA é um recurso premium. Finalize sua assinatura para ter acesso ilimitado à inteligência artificial.' });
        }

        const { image, text } = req.body;
        let { sessionId } = req.body;
        
        let sessionCreated = false;
        let sessionTitle = '';
        if (!sessionId) {
            // Auto-generate title from text (max 30 chars)
            sessionTitle = text ? text.substring(0, 30) + (text.length > 30 ? '...' : '') : 'Chat com Imagem';
            const newSession = createAiSession(req.tenantId, sessionTitle);
            sessionId = newSession.id;
            sessionCreated = true;
        }
        
        // 1. Fetch previous history
        const history = getAiChats(req.tenantId, sessionId);
        
        // 2. Save user message to DB
        let userContent = text || '';
        
        saveAiChat(req.tenantId, sessionId, 'user', userContent, image);
        
        // 3. Get response from AI using history
        const responseText = await analyzeCleaningTask(image, text, history);
        
        // 4. Save AI response to DB
        const aiMessage = saveAiChat(req.tenantId, sessionId, 'ai', responseText);
        
        res.json({ 
            response: responseText, 
            id: aiMessage.id, 
            sessionId: sessionId,
            sessionCreated: sessionCreated,
            sessionTitle: sessionTitle
        });
    } catch (err) {
        console.error('Erro na rota de IA:', err.message);
        res.status(500).json({ error: err.message || 'Erro ao processar com IA' });
    }
});

// Rotas de Follow-up
app.get('/api/followups', requireAuth, (req, res) => {
    res.json(getFollowups(req.tenantId));
});

app.delete('/api/followups/:id', requireAuth, (req, res) => {
    const r = cancelFollowup(req.tenantId, req.params.id);
    r ? res.json(r) : res.status(404).json({ error: 'Not found' });
});

app.put('/api/followups/:id', requireAuth, (req, res) => {
    const { message, scheduled_for } = req.body;
    const r = updateFollowupMessage(req.tenantId, req.params.id, message, scheduled_for);
    r ? res.json(r) : res.status(404).json({ error: 'Not found' });
});

app.post('/api/followups/:id/send-now', requireAuth, async (req, res) => {
    const followups = getFollowups(req.tenantId);
    const f = followups.find(x => x.id === req.params.id);
    if (!f) return res.status(404).json({ error: 'Not found' });
    if (f.status !== 'pendente') return res.status(400).json({ error: 'Follow-up já processado' });
    const link = await processFollowupNow(f);
    res.json({ success: true, link, client_name: f.client_name });
});

// Admin Routes (Master)
const requireMasterAdmin = (req, res, next) => {
    const tenant = verifyTenant(null, req.tenantId);
    if (tenant && tenant.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Acesso negado. Apenas administradores mestre.' });
    }
};

app.use('/api/admin', requireAuth, requireMasterAdmin, adminRoutes({ stripe }));

// ===== AFFILIATE PORTAL ROUTES =====
const AFFILIATE_JWT_SECRET = process.env.JWT_SECRET + '_affiliate';

const requireAffiliateAuth = (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'Token ausente' });
    try {
        const decoded = jwt.verify(auth.split(' ')[1], AFFILIATE_JWT_SECRET);
        req.affiliateCode = decoded.code;
        req.affiliateId = decoded.id;
        next();
    } catch(e) {
        res.status(401).json({ error: 'Token inválido' });
    }
};

// POST /api/parceiro/login
app.post('/api/parceiro/login', async (req, res) => {
    const { code, password } = req.body;
    if (!code || !password) return res.status(400).json({ error: 'Código e senha são obrigatórios' });
    const affiliate = getAffiliateByCodeForLogin(code);
    if (!affiliate) return res.status(401).json({ error: 'Código ou senha inválidos' });
    if (!affiliate.password_hash) return res.status(401).json({ error: 'Senha não configurada. Solicite ao administrador.' });
    const valid = bcrypt.compareSync(password, affiliate.password_hash);
    if (!valid) return res.status(401).json({ error: 'Código ou senha inválidos' });
    const token = jwt.sign({ id: affiliate.id, code: affiliate.code, name: affiliate.name }, AFFILIATE_JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, affiliate: { id: affiliate.id, name: affiliate.name, code: affiliate.code, commission_percentage: affiliate.commission_percentage, pix_key: affiliate.pix_key } });
});

// GET /api/parceiro/dashboard
app.get('/api/parceiro/dashboard', requireAffiliateAuth, (req, res) => {
    const code = req.affiliateCode;
    const referrals = getAffiliateReferrals(code);
    const commissions = getCommissionsByAffiliate(code);
    const balance = getAffiliateBalance(code);
    const affiliate = getAffiliateByCodeForLogin(code);
    const activeReferrals = referrals.filter(r => r.subscription_status === 'pro');
    const totalEarned = commissions.reduce((acc, c) => acc + Number(c.commission_amount || 0), 0);

    // Aggregate commissions by month (last 6 months) for charts
    const now = new Date();
    const commissionsByMonth = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        const monthTotal = commissions
            .filter(c => c.created_at && c.created_at.startsWith(monthKey))
            .reduce((acc, c) => acc + Number(c.commission_amount || 0), 0);
        commissionsByMonth.push({
            name: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
            value: monthTotal
        });
    }

    // Referral status distribution for pie chart
    const referralDistribution = [
        { name: 'Ativos', value: referrals.filter(r => r.subscription_status === 'pro').length, color: '#10b981' },
        { name: 'Em Trial', value: referrals.filter(r => r.subscription_status === 'beta').length, color: '#3b82f6' },
        { name: 'Inativos', value: referrals.filter(r => r.subscription_status === 'beta' || r.subscription_status === 'inactive').length - referrals.filter(r => r.subscription_status === 'beta').length, color: '#94a3b8' },
    ].filter(d => d.value > 0);

    res.json({
        affiliate: { name: affiliate.name, code: affiliate.code, commission_percentage: affiliate.commission_percentage, pix_key: affiliate.pix_key },
        stats: {
            totalReferrals: referrals.length,
            activeReferrals: activeReferrals.length,
            totalEarned,
            pendingBalance: balance.pending,
            paidBalance: balance.paid,
        },
        commissions,
        commissionsByMonth,
        referralDistribution,
        referrals: referrals.map(r => ({ name: r.name, status: r.subscription_status, created_at: r.created_at })),
    });
});

// PUT /api/admin/affiliates/:id/set-password — admin sets affiliate portal password
app.put('/api/admin/affiliates/:id/set-password', requireAuth, requireMasterAdmin, async (req, res) => {
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres' });
    const hash = bcrypt.hashSync(password, 10);
    setAffiliatePassword(req.params.id, hash);
    res.json({ success: true });
});

// Inicia o cron de follow-up
startFollowupCron();

// Cron: Lembretes diários de agendamentos (todo dia às 18h BRT)
cron.schedule('0 18 * * *', async () => {
    console.log('⏰ Cron: Enviando lembretes de agendamentos para amanhã...');
    try {
        const orders = getOrdersScheduledForTomorrow();
        // Group by tenant
        const byTenant = {};
        for (const o of orders) {
            if (!byTenant[o.tenant_id]) {
                byTenant[o.tenant_id] = {
                    email: o.tenant_email,
                    ownerName: o.tenant_owner_name,
                    companyName: o.company_name || 'Sua Empresa',
                    orders: []
                };
            }
            byTenant[o.tenant_id].orders.push(o);
        }

        for (const [, tenant] of Object.entries(byTenant)) {
            if (!tenant.email) continue;
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateLabel = tomorrow.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

            const orderRows = tenant.orders.map(o => {
                const time = o.scheduled_for
                    ? new Date(o.scheduled_for).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    : '--:--';
                return `
                  <tr>
                    <td style="padding:10px 12px;border-bottom:1px solid #1e293b;font-weight:600">${o.service || o.description}</td>
                    <td style="padding:10px 12px;border-bottom:1px solid #1e293b;color:#94a3b8">${o.client_name}</td>
                    <td style="padding:10px 12px;border-bottom:1px solid #1e293b;color:#3b82f6;font-weight:700">${time}</td>
                    <td style="padding:10px 12px;border-bottom:1px solid #1e293b;color:#10b981;font-weight:700">R$ ${Number(o.price || 0).toFixed(2).replace('.', ',')}</td>
                  </tr>`;
            }).join('');

            try {
                await mailer.sendMail({
                    from: '"LimpeJá Sistema" <suporte@jlescala.com>',
                    to: tenant.email,
                    subject: `📅 ${tenant.orders.length} agendamento${tenant.orders.length > 1 ? 's' : ''} para amanhã — ${tenant.companyName}`,
                    html: `
                        <div style="font-family:Arial,sans-serif;max-width:580px;margin:auto;background:#0f172a;color:#f8fafc;border-radius:16px;overflow:hidden">
                          <div style="background:linear-gradient(135deg,#1d4ed8,#7c3aed);padding:36px;text-align:center">
                            <div style="font-size:32px;margin-bottom:8px">📅</div>
                            <h1 style="margin:0;font-size:22px;font-weight:800">Agenda de Amanhã</h1>
                            <p style="margin:6px 0 0;opacity:.8;font-size:14px">${tenant.companyName}</p>
                          </div>
                          <div style="padding:32px">
                            <p style="color:#94a3b8;font-size:14px;margin-bottom:24px">
                              Olá, <strong style="color:#f1f5f9">${tenant.ownerName || 'parceiro'}</strong>! ✋<br/>
                              Você tem <strong style="color:#3b82f6">${tenant.orders.length} serviço${tenant.orders.length > 1 ? 's' : ''}</strong> agendado${tenant.orders.length > 1 ? 's' : ''} para <strong style="color:#f1f5f9">${dateLabel}</strong>.
                            </p>
                            <table style="width:100%;border-collapse:collapse;background:#1e293b;border-radius:12px;overflow:hidden">
                              <thead>
                                <tr style="background:#334155">
                                  <th style="padding:12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8">Serviço</th>
                                  <th style="padding:12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8">Cliente</th>
                                  <th style="padding:12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8">Horário</th>
                                  <th style="padding:12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8">Valor</th>
                                </tr>
                              </thead>
                              <tbody>${orderRows}</tbody>
                            </table>
                            <div style="margin-top:28px;text-align:center">
                              <a href="${APP_URL}/agenda" style="display:inline-block;background:#3b82f6;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">Ver Agenda Completa →</a>
                            </div>
                            <p style="color:#475569;font-size:12px;text-align:center;margin-top:24px">LimpeJá SaaS · Gerado automaticamente</p>
                          </div>
                        </div>
                    `,
                });
                console.log(`✅ Lembrete enviado para ${tenant.email} (${tenant.orders.length} OS)`);
            } catch (mailErr) {
                console.error(`❌ Erro ao enviar lembrete para ${tenant.email}:`, mailErr.message);
            }
        }
    } catch (err) {
        console.error('❌ Erro no cron de lembretes:', err.message);
    }
}, { timezone: 'America/Sao_Paulo' });

// ===== ONBOARDING COMPLETE — envia e-mail de boas-vindas =====
app.post('/api/onboarding/complete', requireAuth, async (req, res) => {
    try {
        const tenant = verifyTenant(null, req.tenantId);
        if (!tenant) return res.status(404).json({ error: 'Conta não encontrada' });

        // Mark onboarding as done
        setConfig(req.tenantId, { onboarding_completed: 1 });
        const config = getConfig(req.tenantId);
        const companyName = config.companyName || tenant.name || 'sua empresa';
        const ownerName = config.ownerName || tenant.name || 'usuário';

        // Send welcome email (non-blocking)
        mailer.sendMail({
            from: '"LimpeJá Sistema" <suporte@jlescala.com>',
            to: tenant.email,
            subject: `🎉 Bem-vindo ao LimpeJá, ${ownerName}! Veja como aproveitar tudo`,
            html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#0f172a;color:#f8fafc;border-radius:16px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#1d4ed8 0%,#7c3aed 100%);padding:40px;text-align:center">
    <div style="font-size:48px;margin-bottom:12px">🚀</div>
    <h1 style="margin:0;font-size:26px;font-weight:800;color:white">Tudo pronto, ${ownerName}!</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:15px">${companyName} está no ar no LimpeJá</p>
  </div>

  <div style="padding:36px">
    <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin-bottom:28px">
      Sua conta foi configurada com sucesso! Separamos um guia rápido para você tirar o máximo do sistema nos próximos dias.
    </p>

    <!-- Tips -->
    <div style="display:flex;flex-direction:column;gap:16px">

      <div style="background:#1e293b;border-radius:12px;padding:20px;display:flex;gap:16px;align-items:flex-start">
        <div style="font-size:28px;flex-shrink:0">📋</div>
        <div>
          <div style="font-weight:700;font-size:15px;color:#f1f5f9;margin-bottom:4px">1. Cadastre seus primeiros clientes</div>
          <div style="color:#64748b;font-size:13px;line-height:1.6">Acesse <strong style="color:#3b82f6">Clientes → Adicionar</strong> e cadastre os clientes que você já atende. Isso habilita a criação de OS e agendamentos.</div>
        </div>
      </div>

      <div style="background:#1e293b;border-radius:12px;padding:20px;display:flex;gap:16px;align-items:flex-start">
        <div style="font-size:28px;flex-shrink:0">📅</div>
        <div>
          <div style="font-weight:700;font-size:15px;color:#f1f5f9;margin-bottom:4px">2. Crie uma Ordem de Serviço</div>
          <div style="color:#64748b;font-size:13px;line-height:1.6">Na <strong style="color:#3b82f6">Agenda</strong>, adicione sua primeira OS com data, horário e valor. O sistema controla o status automaticamente.</div>
        </div>
      </div>

      <div style="background:#1e293b;border-radius:12px;padding:20px;display:flex;gap:16px;align-items:flex-start">
        <div style="font-size:28px;flex-shrink:0">💰</div>
        <div>
          <div style="font-weight:700;font-size:15px;color:#f1f5f9;margin-bottom:4px">3. Controle suas finanças</div>
          <div style="color:#64748b;font-size:13px;line-height:1.6">Registre receitas e despesas em <strong style="color:#3b82f6">Financeiro</strong> para ter uma visão real do lucro do seu negócio.</div>
        </div>
      </div>

      <div style="background:#1e293b;border-radius:12px;padding:20px;display:flex;gap:16px;align-items:flex-start">
        <div style="font-size:28px;flex-shrink:0">🤖</div>
        <div>
          <div style="font-weight:700;font-size:15px;color:#f1f5f9;margin-bottom:4px">4. Use o Consultor IA</div>
          <div style="color:#64748b;font-size:13px;line-height:1.6">Tire fotos de sofás, tapetes e peças e envie para o <strong style="color:#8b5cf6">Consultor IA</strong> receber um orçamento e diagnóstico instantâneo.</div>
        </div>
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-top:32px">
      <a href="${APP_URL}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:white;padding:16px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 20px rgba(59,130,246,0.3)">
        Acessar meu sistema →
      </a>
    </div>

    <p style="color:#334155;font-size:12px;text-align:center;margin-top:28px">
      LimpeJá SaaS &middot; Qualquer dúvida, responda este e-mail.
    </p>
  </div>
</div>
            `,
        }).catch(e => console.warn('⚠️  Welcome email failed:', e.message));

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== BACKUP ROUTES (Master Admin only) =====

// GET /api/admin/backups — lista os backups locais disponíveis
app.get('/api/admin/backups', requireAuth, requireMasterAdmin, (req, res) => {
    try {
        res.json(getBackupList());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/admin/backups/run — dispara backup manual imediatamente
app.post('/api/admin/backups/run', requireAuth, requireMasterAdmin, async (req, res) => {
    try {
        const result = await runBackup();
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/admin/backups/download/:fileName — faz download de um arquivo de backup
app.get('/api/admin/backups/download/:fileName', requireAuth, requireMasterAdmin, (req, res) => {
    const filePath = getBackupPath(req.params.fileName);
    if (!filePath) return res.status(404).json({ error: 'Backup não encontrado' });
    res.download(filePath, req.params.fileName);
});

// Cron de backup: todo dia às 2h da manhã (BRT)
cron.schedule('0 2 * * *', async () => {
    console.log('💾 Cron: Iniciando backup automático do banco de dados...');
    try {
        const result = await runBackup();
        console.log(`✅ Backup concluído: ${result.fileName} (${result.sizeKb} KB)${result.uploadedToS3 ? ' + S3' : ''}`);
    } catch (err) {
        console.error('❌ Falha no backup automático:', err.message);
    }
}, { timezone: 'America/Sao_Paulo' });

// Backup inicial ao iniciar o servidor (garante pelo menos 1 backup recente)
runBackup().then(r => {
    console.log(`💾 Backup inicial criado: ${r.fileName} (${r.sizeKb} KB)`);
}).catch(err => {
    console.warn('⚠️ Não foi possível criar o backup inicial:', err.message);
});

// Cron: Alerta de trial expirando — a cada 15 minutos
cron.schedule('*/15 * * * *', async () => {
    try {
        const nearExpiry = getTenantsNearTrialExpiry();
        for (const tenant of nearExpiry) {
            const msLeft = (() => {
                const TRIAL_MS = 4 * 60 * 60 * 1000;
                const start = tenant.trial_started_at
                    ? new Date(tenant.trial_started_at).getTime()
                    : new Date(tenant.created_at).getTime();
                return Math.max(0, (start + TRIAL_MS) - Date.now());
            })();
            const minutesLeft = Math.ceil(msLeft / 60000);

            try {
                await mailer.sendMail({
                    from: '"LimpeJá Sistema" <suporte@jlescala.com>',
                    to: tenant.email,
                    subject: `⏰ Seu período de teste expira em ${minutesLeft} minuto${minutesLeft !== 1 ? 's' : ''}!`,
                    html: `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;background:#0f172a;color:#f8fafc;border-radius:16px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:36px;text-align:center">
    <div style="font-size:40px;margin-bottom:10px">⏰</div>
    <h1 style="margin:0;font-size:22px;font-weight:800;color:white">Seu trial está acabando!</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px">Apenas <strong>${minutesLeft} minuto${minutesLeft !== 1 ? 's' : ''}</strong> restantes</p>
  </div>

  <div style="padding:32px">
    <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin-bottom:24px">
      Olá, <strong style="color:#f1f5f9">${tenant.name}</strong>! 👋<br/>
      Seu período de teste gratuito está prestes a encerrar. Para continuar com acesso completo ao sistema, assine agora.
    </p>

    <div style="background:#1e293b;border-radius:12px;padding:20px;margin-bottom:24px">
      <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">O que você mantém ao assinar</div>
      ${['Todos os seus clientes e histórico de OS', 'Orçamentos e Portal do Cliente', 'Controle Financeiro completo', 'Consultor IA com análise por foto', 'Follow-up automático de clientes'].map(f =>
        `<div style="color:#e2e8f0;font-size:13px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;gap:8px">
          <span style="color:#10b981">✓</span> ${f}
        </div>`).join('')}
    </div>

    <div style="text-align:center">
      <a href="${APP_URL}/login" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:white;padding:16px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 20px rgba(59,130,246,0.3)">
        Assinar agora e continuar →
      </a>
    </div>

    <p style="color:#334155;font-size:12px;text-align:center;margin-top:24px">
      LimpeJá SaaS · Se tiver dúvidas, responda este e-mail.
    </p>
  </div>
</div>
                    `,
                });
                markTrialWarningSent(tenant.id);
                console.log(`⚠️  Trial warning enviado para ${tenant.email} (${minutesLeft}min restantes)`);
            } catch (mailErr) {
                console.error(`❌ Falha ao enviar trial warning para ${tenant.email}:`, mailErr.message);
            }
        }
    } catch (err) {
        console.error('❌ Erro no cron de trial warning:', err.message);
    }
});

// Global error handler — captura erros não tratados nas rotas
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    console.error('💥 Erro não tratado:', err.stack || err.message);
    res.status(500).json({ error: 'Erro interno do servidor. Tente novamente.' });
});

app.listen(PORT, () => console.log(`✅ Backend SaaS running on http://localhost:${PORT}`))
  .on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Porta ${PORT} já está em uso!`);
      process.exit(1);
    }
  });
