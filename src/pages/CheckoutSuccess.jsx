import React, { useEffect, useState } from 'react';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { verifySubscription } from '../api';

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Verifica com o backend se o pagamento foi realmente processado
    let attempts = 0;
    const maxAttempts = 10;

    const checkStatus = async () => {
      try {
        const data = await verifySubscription();
        if (data.isPro) {
          // Atualiza localStorage só após confirmação do backend
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            user.subscription_status = 'pro';
            localStorage.setItem('user', JSON.stringify(user));
          }
          setVerified(true);
          setChecking(false);
        } else {
          attempts++;
          if (attempts < maxAttempts) {
            // Webhook pode demorar — tenta de novo em 3s
            setTimeout(checkStatus, 3000);
          } else {
            setChecking(false);
          }
        }
      } catch {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 3000);
        } else {
          setChecking(false);
        }
      }
    };

    checkStatus();
  }, []);

  useEffect(() => {
    if (!verified) return;
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timer); navigate('/'); }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [verified, navigate]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a, #1e3a8a)',
      fontFamily: "'Inter', sans-serif", padding: 24,
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');`}</style>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        {/* Icon */}
        <div style={{
          width: 88, height: 88, background: verified ? 'rgba(22,163,74,0.2)' : 'rgba(59,130,246,0.2)', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px', border: `2px solid ${verified ? 'rgba(22,163,74,0.4)' : 'rgba(59,130,246,0.4)'}`,
          boxShadow: `0 0 40px ${verified ? 'rgba(22,163,74,0.3)' : 'rgba(59,130,246,0.3)'}`,
        }}>
          {checking ? (
            <Loader2 size={44} color="#60a5fa" style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <CheckCircle size={44} color="#4ade80" />
          )}
        </div>

        <h1 style={{ color: 'white', fontSize: 30, fontWeight: 800, marginBottom: 12 }}>
          {checking ? 'Verificando pagamento...' : (verified ? 'Pagamento Confirmado! 🎉' : 'Pagamento em processamento')}
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.6, marginBottom: 32 }}>
          {checking
            ? 'Estamos confirmando seu pagamento com o Stripe...'
            : verified
              ? <>Sua assinatura foi ativada com sucesso.<br />Bem-vindo ao sistema completo!</>
              : <>Seu pagamento está sendo processado.<br />Pode levar alguns minutos. Tente acessar o sistema em breve.</>
          }
        </p>

        {verified && (
          <div style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '20px 24px', marginBottom: 28,
          }}>
            <div style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>Redirecionando em</div>
            <div style={{ color: '#3b82f6', fontSize: 40, fontWeight: 800 }}>{countdown}s</div>
          </div>
        )}

        <button
          onClick={() => navigate('/')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 28px', background: '#3b82f6', color: 'white',
            border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 4px 20px rgba(59,130,246,0.4)',
          }}
        >
          Ir para o Sistema <ArrowRight size={18} />
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
