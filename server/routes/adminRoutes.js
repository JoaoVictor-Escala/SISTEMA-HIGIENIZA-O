import express from 'express';
import bcrypt from 'bcryptjs';
import {
    getAllTenants, updateTenantStatus, resetTenantTrial, extendTenantTrial,
    getAffiliates, getAffiliateReferrals, createAffiliate, updateAffiliate,
    getAllCommissions, getCommissionsByAffiliate, getAffiliateBalance, markCommissionPaid,
    setAffiliatePassword
} from '../database.js';

export default function(deps) {
    const router = express.Router();
    const { stripe } = deps;
    
    router.get('/tenants', (req, res) => {
        const tenants = getAllTenants();
        res.json(tenants);
    });

    router.get('/metrics', (req, res) => {
        const tenants = getAllTenants();
        const commissions = getAllCommissions();
        
        const proCount = tenants.filter(t => t.subscription_status === 'pro').length;
        const testCount = tenants.filter(t => t.subscription_status === 'pending' || t.subscription_status === 'beta').length;
        const totalTenants = tenants.length;

        const mrr = proCount * 97; // Assumindo R$ 97 como plano padrão

        // Cálculo de churn simples (últimos 30 dias que foram para pending)
        // Como não temos um histórico perfeito de status changes, o churn estimado será
        // o número de cancelados. Mas vamos fazer a Taxa de Conversão primeiro.
        const conversionRate = totalTenants > 0 ? ((proCount / totalTenants) * 100).toFixed(1) : 0;
        
        // Comissões pendentes
        const pendingCommissions = commissions
            .filter(c => c.status === 'pendente')
            .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

        res.json({
            mrr,
            activePro: proCount,
            activeTrials: testCount,
            conversionRate: Number(conversionRate),
            pendingCommissions
        });
    });

    router.put('/tenants/:id/status', (req, res) => {
        const { status, resetTrial } = req.body;
        try {
            if (resetTrial) {
                resetTenantTrial(req.params.id);
            } else {
                updateTenantStatus(req.params.id, status);
            }
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.put('/tenants/:id/extend-trial', (req, res) => {
        const { days } = req.body;
        try {
            if (!days || isNaN(days)) throw new Error('Quantidade de dias inválida');
            extendTenantTrial(req.params.id, Number(days));
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/affiliates', (req, res) => {
        const affiliates = getAffiliates();
        const result = affiliates.map(aff => {
            const referrals = getAffiliateReferrals(aff.code);
            return { ...aff, referrals_count: referrals.length, referrals };
        });
        res.json(result);
    });

    router.post('/affiliates', async (req, res) => {
        try {
            const { name, code, discount_percentage, commission_percentage, pix_key } = req.body;
            const upperCode = code.toUpperCase().trim();
            
            // Criar no Stripe automaticamente se estiver configurado
            if (stripe) {
                try {
                    await stripe.coupons.create({
                        id: upperCode,
                        percent_off: Number(discount_percentage) || 0,
                        duration: 'forever',
                        name: `Indicação: ${name}`
                    });
                } catch (stripeErr) {
                    if (stripeErr.code !== 'resource_already_exists') {
                        return res.status(400).json({ error: `Stripe: ${stripeErr.message}` });
                    }
                }
            }

            const newAff = createAffiliate({ name, code, discount_percentage, commission_percentage, pix_key });
            res.status(201).json(newAff);
        } catch(err) {
            if(err.message.includes('UNIQUE constraint')) {
                res.status(400).json({ error: 'Este código de cupom já existe no sistema local.' });
            } else {
                res.status(500).json({ error: err.message });
            }
        }
    });

    router.put('/affiliates/:id', async (req, res) => {
        try {
            const { name, commission_percentage, pix_key } = req.body;
            const affiliate = updateAffiliate(req.params.id, { name, commission_percentage, pix_key });
            if (!affiliate) return res.status(404).json({ error: 'Afiliado não encontrado' });
            res.json(affiliate);
        } catch(err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/commissions', (req, res) => {
        const commissions = getAllCommissions();
        res.json(commissions);
    });

    router.get('/affiliates/:id/commissions', (req, res) => {
        const affiliates = getAffiliates();
        const aff = affiliates.find(a => a.id === req.params.id);
        if (!aff) return res.status(404).json({ error: 'Afiliado não encontrado' });
        const commissions = getCommissionsByAffiliate(aff.code);
        const balance = getAffiliateBalance(aff.code);
        res.json({ commissions, balance });
    });

    router.put('/commissions/:id/pay', (req, res) => {
        const result = markCommissionPaid(req.params.id);
        if (!result) return res.status(404).json({ error: 'Comissão não encontrada' });
        res.json(result);
    });

    router.put('/affiliates/:id/set-password', async (req, res) => {
        const { password } = req.body;
        if (!password || password.length < 6) return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres' });
        const hash = bcrypt.hashSync(password, 10);
        const result = setAffiliatePassword(req.params.id, hash);
        if (!result) return res.status(404).json({ error: 'Afiliado não encontrado' });
        res.json({ success: true });
    });

    return router;
}
