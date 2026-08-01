import React, { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Shield, AlertTriangle } from 'lucide-react';

export default function CheckoutForm({ onSuccess, discountPercent = 0, planPrice = 47.90 }) {
  const stripe = useStripe();
  const elements = useElements();
  const [erro, setErro] = useState(null);
  const [processando, setProcessando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessando(true);
    setErro(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErro(error.message);
      setProcessando(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      setConcluido(true);
      setTimeout(() => onSuccess(), 2000);
    }
  };

  if (concluido) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
        <h3 style={{ color: 'white', marginBottom: 8, fontSize: 20 }}>Assinatura confirmada!</h3>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>Aguarde, estamos preparando seu sistema...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 8 }}>
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '20px',
        marginBottom: 16,
      }}>
        <PaymentElement
          options={{
            layout: 'tabs',
            appearance: {
              theme: 'night',
              variables: {
                colorPrimary: '#3b82f6',
                colorBackground: '#111827',
                colorText: '#f8fafc',
                colorDanger: '#ef4444',
                fontFamily: 'inherit',
                borderRadius: '8px',
              },
            },
          }}
        />
      </div>

      {erro && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(239,68,68,0.1)', color: '#ef4444',
          padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13,
        }}>
          <AlertTriangle size={15} />
          {erro}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processando}
        style={{
          width: '100%', padding: '16px 24px',
          background: processando ? '#1d4ed8' : '#3b82f6',
          color: 'white', border: 'none', borderRadius: 12,
          fontSize: 16, fontWeight: 700,
          cursor: processando ? 'not-allowed' : 'pointer',
          boxShadow: '0 4px 20px rgba(59,130,246,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 10, fontFamily: 'inherit',
          opacity: processando ? 0.8 : 1, transition: 'all 0.2s',
        }}
      >
        {processando ? (
          <>
            <div style={{
              width: 18, height: 18,
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: 'white', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            Processando pagamento...
          </>
        ) : (
          <>
            <Shield size={18} />
            Confirmar Assinatura — R$ {discountPercent > 0 ? (planPrice * (1 - discountPercent/100)).toFixed(2).replace('.', ',') : planPrice.toFixed(2).replace('.', ',')}/mês
          </>
        )}
      </button>

      <p style={{ textAlign: 'center', color: '#475569', fontSize: 11, marginTop: 10 }}>
        🔒 Dados criptografados via Stripe · Cancele quando quiser
      </p>
    </form>
  );
}
