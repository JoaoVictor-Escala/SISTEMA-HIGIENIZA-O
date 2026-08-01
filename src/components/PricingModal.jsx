import React, { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { X, Sparkles, Check, Shield, Lock } from 'lucide-react';
import CheckoutForm from '../pages/CheckoutForm';
import { checkCoupon, createPaymentIntent } from '../api';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function PricingModal({ onClose, onSuccess, planPrice }) {
  const [paymentStep, setPaymentStep] = useState('plans'); // 'plans' | 'loading' | 'form'
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentError, setPaymentError] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);

  useEffect(() => {
    if (couponCode.trim().length >= 3) {
      const timer = setTimeout(async () => {
        try {
          const res = await checkCoupon(couponCode);
          if (res.valid) {
            setDiscountPercent(res.discount_percentage);
          } else {
            setDiscountPercent(0);
          }
        } catch { setDiscountPercent(0); }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setDiscountPercent(0);
    }
  }, [couponCode]);

  const handleCheckout = async () => {
    setPaymentStep('loading');
    setPaymentError(null);
    try {
      const data = await createPaymentIntent(null, couponCode);
      setClientSecret(data.clientSecret);
      setPaymentStep('form');
    } catch (e) {
      setPaymentError(e.message);
      setPaymentStep('plans');
    }
  };

  const handleBackFromPayment = () => {
    setPaymentStep('plans');
    setClientSecret(null);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(16px)', zIndex: 999999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
      <div style={{ maxWidth: 460, width: '100%', textAlign: 'center' }}>
        <button
          onClick={onClose}
          style={{ position: 'fixed', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <X size={16} /> Fechar
        </button>

        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 20, padding: '6px 16px', marginBottom: 20 }}>
            <Sparkles size={14} color="#60a5fa" />
            <span style={{ color: '#93c5fd', fontSize: 13, fontWeight: 600 }}>Período Beta — Preço especial</span>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: 'white', marginBottom: 8 }}>Acesso Completo ao Sistema</h1>
          <p style={{ color: '#94a3b8', fontSize: 15 }}>Após assinar, os dados de demonstração são removidos e você começa com dados reais.</p>
        </div>

        <div style={{ background: 'rgba(59,130,246,0.08)', border: '2px solid #3b82f6', borderRadius: 20, padding: '36px 32px', textAlign: 'left', boxShadow: '0 0 60px rgba(59,130,246,0.2)', marginBottom: 24 }}>
          {paymentStep === 'plans' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                <div>
                  <div style={{ color: '#93c5fd', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Plano Pro</div>
                  {discountPercent > 0 ? (
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: '#64748b', textDecoration: 'line-through', marginBottom: -4 }}>R$ {planPrice.toFixed(2).replace('.', ',')}</div>
                      <div style={{ fontSize: 48, fontWeight: 800, color: '#10b981', lineHeight: 1 }}>R$ {(planPrice * (1 - discountPercent/100)).toFixed(2).replace('.', ',')}<span style={{ fontSize: 16, color: '#64748b', fontWeight: 400 }}>/mês</span></div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 48, fontWeight: 800, color: 'white', lineHeight: 1 }}>R$ {planPrice.toFixed(2).replace('.', ',')}<span style={{ fontSize: 16, color: '#64748b', fontWeight: 400 }}>/mês</span></div>
                  )}
                </div>
                <div style={{ background: '#3b82f6', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>MAIS POPULAR</div>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  'Clientes, Agenda e OS ilimitados',
                  'Orçamentos com Portal do Cliente',
                  'Financeiro + DRE completo',
                  'Estoque e controle de insumos',
                  'Dashboard com metas mensais',
                  'Relatórios em PDF',
                  'Suporte via WhatsApp'
                ].map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#e2e8f0', fontSize: 14 }}>
                    <span style={{ background: 'rgba(59,130,246,0.25)', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={13} color="#60a5fa" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 6, fontWeight: 500 }}>Possui um cupom ou código de indicação?</label>
                <input
                  type="text"
                  placeholder="Ex: CLIENTENV"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', borderRadius: 8, color: 'white', fontSize: 14, textTransform: 'uppercase' }}
                />
              </div>
              {paymentError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                  <X size={15} /> {paymentError}
                </div>
              )}
              {discountPercent > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                  <Check size={16} /> Cupom de {discountPercent}% aplicado com sucesso!
                </div>
              )}
              <button
                onClick={handleCheckout}
                style={{ width: '100%', padding: '16px 24px', background: discountPercent > 0 ? '#10b981' : '#3b82f6', color: 'white', border: 'none', borderRadius: 12, fontSize: 17, fontWeight: 700, cursor: 'pointer', boxShadow: discountPercent > 0 ? '0 4px 20px rgba(16,185,129,0.4)' : '0 4px 20px rgba(59,130,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.2s', fontFamily: 'inherit' }}
              >
                <Shield size={18} /> Assinar Agora — R$ {discountPercent > 0 ? (planPrice * (1 - discountPercent/100)).toFixed(2).replace('.', ',') : planPrice.toFixed(2).replace('.', ',')}/mês
              </button>
              <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#475569', fontSize: 12, marginTop: 12 }}>
                <Lock size={12} /> Pagamento seguro via Stripe · Cancele quando quiser
              </p>
            </>
          )}

          {paymentStep === 'loading' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
              <p style={{ color: '#94a3b8', fontSize: 14 }}>Preparando pagamento seguro...</p>
            </div>
          )}

          {paymentStep === 'form' && clientSecret && (
            <>
              <div style={{ marginBottom: 20 }}>
                <button onClick={handleBackFromPayment} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, padding: 0, marginBottom: 16 }}>
                  ← Voltar
                </button>
                <div style={{ color: '#93c5fd', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Plano Pro</div>
                {discountPercent > 0 ? (
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b', textDecoration: 'line-through', marginBottom: -4 }}>R$ {planPrice.toFixed(2).replace('.', ',')}</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#10b981', marginBottom: couponCode ? 8 : 0 }}>R$ {(planPrice * (1 - discountPercent/100)).toFixed(2).replace('.', ',')}<span style={{ fontSize: 14, color: '#64748b', fontWeight: 400 }}>/mês</span></div>
                  </div>
                ) : (
                  <div style={{ fontSize: 32, fontWeight: 800, color: 'white', marginBottom: couponCode ? 8 : 0 }}>R$ {planPrice.toFixed(2).replace('.', ',')}<span style={{ fontSize: 14, color: '#64748b', fontWeight: 400 }}>/mês</span></div>
                )}
                {couponCode && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                    <Check size={14} /> Cupom {couponCode.toUpperCase()} ativado com sucesso!
                  </div>
                )}
              </div>
              <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
                <CheckoutForm onSuccess={onSuccess} discountPercent={discountPercent} planPrice={planPrice} />
              </Elements>
            </>
          )}
        </div>

        <button onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = '/login'; }} style={{ background: 'none', color: '#ef4444', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}>Sair da Conta</button>
      </div>
    </div>
  );
}
