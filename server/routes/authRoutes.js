import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import {
    verifyTenant, clearDemoData, seedDemoData, markDemoSeeded, updateTenantStatus,
    setResetToken, findTenantByResetToken, clearResetToken, getTenantByStripeCustomer,
    updateTenantPassword, verifyEmail, createTenant, setTenantAffiliate, getAffiliateByCode,
    getAffiliates
} from '../database.js';

export default function(deps) {
    const router = express.Router();
    const { 
        JWT_SECRET, authLimiter, stripe, mailer, APP_URL, PLAN_PRICE, 
        sendVerificationEmail, sendPasswordResetEmail, requireAuth 
    } = deps;

    router.post('/login', authLimiter, (req, res) => {
        const { email, password } = req.body;
        let userObj = verifyTenant(email);
        let isCollaborator = false;
        let collaborator = null;

        if (!userObj) {
            collaborator = db.prepare('SELECT * FROM collaborators WHERE email = ?').get(email);
            if (collaborator) {
                userObj = verifyTenant(null, collaborator.tenant_id);
                isCollaborator = true;
            }
        }

        if (!userObj) return res.status(401).json({ error: 'Credenciais inválidas' });
        
        const passwordHash = isCollaborator ? collaborator.password_hash : userObj.password_hash;
        const valid = bcrypt.compareSync(password, passwordHash);
        if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' });

        if (!isCollaborator && !userObj.email_verified) {
            return res.status(403).json({ error: 'E-mail não verificado. Verifique sua caixa de entrada e clique no link de confirmação.' });
        }

        if (!isCollaborator && (userObj.subscription_status === 'beta' || userObj.subscription_status === 'pending')) {
            if (!userObj.demo_seeded) {
                console.log(`🌱 First login — seeding demo data for: ${userObj.email}`);
                clearDemoData(userObj.id);
                seedDemoData(userObj.id);
                markDemoSeeded(userObj.id);
                if (userObj.subscription_status !== 'beta') {
                    updateTenantStatus(userObj.id, 'beta');
                    userObj.subscription_status = 'beta';
                }
            }
        }

        const tokenPayload = isCollaborator 
            ? { tenant_id: userObj.id, collaborator_id: collaborator.id, role: collaborator.role }
            : { tenant_id: userObj.id, role: 'owner' };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });
        const isMasterAdmin = !isCollaborator && userObj.role === 'admin';
        
        res.json({ 
            token, 
            user: { 
                name: isCollaborator ? collaborator.name : userObj.name, 
                email: isCollaborator ? collaborator.email : userObj.email, 
                subscription_status: userObj.subscription_status, 
                role: isCollaborator ? collaborator.role : 'owner', 
                isMasterAdmin 
            } 
        });
    });

    router.post('/register', authLimiter, async (req, res) => {
        try {
            const { name, email, password, affiliateCode } = req.body;
            if (!name || !email || !password) return res.status(400).json({ error: 'Preencha todos os campos' });
            if (password.length < 6) return res.status(400).json({ error: 'A senha deve ter ao menos 6 caracteres.' });
            if (!/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ error: 'E-mail inválido.' });
            if (name.length > 100) return res.status(400).json({ error: 'Nome muito longo.' });
            if (verifyTenant(email)) return res.status(400).json({ error: 'Email já cadastrado' });
            
            const hash = bcrypt.hashSync(password, 10);
            const token = Math.random().toString(36).substr(2) + Date.now().toString(36);
            
            // Check affiliate
            let actualAffiliateCode = null;
            if (affiliateCode) {
                const upperCode = affiliateCode.toUpperCase().trim();
                const aff = getAffiliateByCode(upperCode);
                if (aff) {
                    actualAffiliateCode = aff.code;
                }
            }
            
            const tenant = createTenant({ name, email, password_hash: hash, verification_token: token });
            if (actualAffiliateCode) {
                setTenantAffiliate(tenant.id, actualAffiliateCode);
            }
            
            await sendVerificationEmail(email, name.split(' ')[0], token);
            
            res.status(201).json({ success: true, message: 'Conta criada! Verifique seu e-mail para continuar.' });
        } catch(err) {
            res.status(500).json({ error: 'Erro ao criar conta.' });
        }
    });

    router.post('/verify-email', (req, res) => {
        const r = verifyEmail(req.body.token);
        r ? res.json({ success: true, tenant: r }) : res.status(400).json({ error: 'Token inválido ou expirado' });
    });

    router.post('/forgot-password', authLimiter, async (req, res) => {
        const { email } = req.body;
        const tenant = verifyTenant(email);
        if (!tenant) {
            // Delay para dificultar enumeração de emails
            await new Promise(resolve => setTimeout(resolve, 1000));
            return res.json({ success: true }); // Always return success for security
        }

        const token = Math.random().toString(36).substr(2) + Date.now().toString(36);
        setResetToken(email, token);

        await sendPasswordResetEmail(email, tenant.name.split(' ')[0], token);
        res.json({ success: true });
    });

    router.post('/reset-password', (req, res) => {
        const { token, password } = req.body;
        const tenant = findTenantByResetToken(token);
        if (!tenant) return res.status(400).json({ error: 'Link de recuperação inválido ou expirado.' });
        if (password.length < 6) return res.status(400).json({ error: 'A senha deve ter ao menos 6 caracteres.' });

        const hash = bcrypt.hashSync(password, 10);
        updateTenantPassword(tenant.id, hash);
        clearResetToken(tenant.id);
        
        res.json({ success: true, message: 'Senha alterada com sucesso! Faça login.' });
    });

    router.get('/trial-status', requireAuth, (req, res) => {
        const tenant = verifyTenant(null, req.tenantId);
        if (!tenant) return res.status(404).json({ error: 'Conta não encontrada' });
        res.json({
            isPro: tenant.subscription_status === 'pro',
            minutesLeft: req.trialMinutesLeft || null,
            trialExpired: req.trialMinutesLeft === 0 && tenant.subscription_status !== 'pro'
        });
    });

    router.put('/change-password', requireAuth, async (req, res) => {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Preencha todos os campos' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Nova senha deve ter ao menos 6 caracteres' });
        }
    
        const tenant = verifyTenant(null, req.tenantId);
        if (!tenant) return res.status(404).json({ error: 'Conta não encontrada' });
    
        const valid = bcrypt.compareSync(currentPassword, tenant.password_hash);
        if (!valid) return res.status(401).json({ error: 'Senha atual incorreta' });
    
        const hash = bcrypt.hashSync(newPassword, 10);
        updateTenantPassword(tenant.id, hash);
        
        res.json({ success: true });
    });

    router.post('/create-checkout', requireAuth, async (req, res) => {
        if (!stripe) return res.status(503).json({ error: 'Stripe não configurado. Defina STRIPE_SECRET_KEY no .env' });
    
        try {
            const tenant = verifyTenant(null, req.tenantId);
            
            // Try to use existing customer
            let customerId = tenant.stripe_customer_id;
            if (!customerId) {
                const customer = await stripe.customers.create({
                    email: tenant.email,
                    name: tenant.name,
                    metadata: { tenant_id: tenant.id }
                });
                customerId = customer.id;
            }
    
            const session = await stripe.checkout.sessions.create({
                customer: customerId,
                payment_method_types: ['card'],
                line_items: [{ price: process.env.STRIPE_PRICE_PRO, quantity: 1 }],
                mode: 'subscription',
                success_url: `${APP_URL}/?success=true`,
                cancel_url: `${APP_URL}/?canceled=true`,
                client_reference_id: tenant.id,
            });
            res.json({ url: session.url });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    
    router.post('/create-payment-intent', requireAuth, async (req, res) => {
        if (!stripe) return res.status(503).json({ error: 'Stripe não configurado' });
    
        try {
            const tenant = verifyTenant(null, req.tenantId);
            const { couponCode } = req.body;
    
            let customerId = tenant.stripe_customer_id;
            if (!customerId) {
                const customer = await stripe.customers.create({
                    email: tenant.email,
                    name: tenant.name,
                    metadata: { tenant_id: tenant.id }
                });
                customerId = customer.id;
            }
    
            // Look up affiliate discount
            let discountPercent = 0;
            let actualCoupon = null;
    
            if (couponCode) {
                const upperCode = couponCode.toUpperCase().trim();
                const aff = getAffiliateByCode(upperCode);
                if (aff && aff.discount_percentage > 0) {
                    discountPercent = aff.discount_percentage;
                    actualCoupon = aff.code;
                } else if (upperCode === 'JLES10') {
                    // Legacy general coupon
                    discountPercent = 10;
                }
            }
            
            // If they just joined using a referral link, check if we should auto-apply
            if (!couponCode && tenant.referred_by) {
                const aff = getAffiliateByCode(tenant.referred_by);
                if (aff && aff.discount_percentage > 0) {
                    discountPercent = aff.discount_percentage;
                    actualCoupon = aff.code;
                }
            }
    
            const subData = {
                customer: customerId,
                items: [{ price: process.env.STRIPE_PRICE_PRO }],
                payment_behavior: 'default_incomplete',
                payment_settings: { save_default_payment_method: 'on_subscription' },
                expand: ['latest_invoice.payment_intent'],
                metadata: { tenant_id: tenant.id }
            };
    
            // Apply stripe coupon if found
            if (actualCoupon) {
                try {
                    // Verify if coupon exists in Stripe
                    await stripe.coupons.retrieve(actualCoupon);
                    subData.coupon = actualCoupon;
                } catch {
                    // Ignore if coupon doesn't exist in stripe, will just charge full price
                }
            } else if (discountPercent > 0) {
                // If it's a legacy hardcoded coupon like JLES10 but not in Stripe coupons
                try {
                    await stripe.coupons.retrieve('JLES10');
                    subData.coupon = 'JLES10';
                } catch { /* ignore */ }
            }
    
            const subscription = await stripe.subscriptions.create(subData);
    
            res.json({
                subscriptionId: subscription.id,
                clientSecret: subscription.latest_invoice.payment_intent.client_secret,
                discountPercent
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    
    router.get('/verify-subscription', requireAuth, (req, res) => {
        const tenant = verifyTenant(null, req.tenantId);
        if (!tenant) return res.status(404).json({ error: 'Conta não encontrada' });
        res.json({ subscription_status: tenant.subscription_status, role: tenant.role });
    });
    
    router.post('/check-coupon', requireAuth, (req, res) => {
        const code = req.body.code?.trim();
        if (!code) return res.json({ valid: false });
    
        const upperCode = code.toUpperCase();
        
        // Custom coupons
        if (upperCode === 'JLES10') {
            return res.json({ valid: true, discount_percentage: 10, code: 'JLES10' });
        }
        
        // Check DB for affiliate coupons
        const aff = getAffiliateByCode(upperCode);
        if (aff && aff.discount_percentage > 0) {
            return res.json({ valid: true, discount_percentage: aff.discount_percentage, code: aff.code });
        }
        
        res.json({ valid: false });
    });

    return router;
}
