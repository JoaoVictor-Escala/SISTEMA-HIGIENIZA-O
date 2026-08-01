import React from 'react';
import { XCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CheckoutCancel() {
  const navigate = useNavigate();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a, #1e1e2e)',
      fontFamily: "'Inter', sans-serif", padding: 24,
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');`}</style>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{
          width: 80, height: 80, background: 'rgba(239,68,68,0.15)', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', border: '2px solid rgba(239,68,68,0.3)',
        }}>
          <XCircle size={40} color="#f87171" />
        </div>

        <h1 style={{ color: 'white', fontSize: 26, fontWeight: 800, marginBottom: 10 }}>
          Pagamento Cancelado
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
          Não se preocupe — nenhum valor foi cobrado.<br />
          Você pode assinar quando quiser.
        </p>

        <button
          onClick={() => navigate('/')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '13px 24px', background: 'rgba(255,255,255,0.08)',
            color: 'white', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <ArrowLeft size={17} /> Voltar ao Sistema
        </button>
      </div>
    </div>
  );
}
