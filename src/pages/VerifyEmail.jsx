import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyEmail } from '../api';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      return;
    }

    verifyEmail(token)
      .then((data) => {
        if (data.success) {
          setStatus('success');
          setTimeout(() => navigate('/login?verified=true'), 2500);
        } else {
          setStatus('error');
        }
      })
      .catch(() => setStatus('error'));
  }, [params, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center', padding: '48px', background: 'rgba(255,255,255,0.05)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', maxWidth: 420, width: '90%' }}>
        <style>{`
          @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(0.95); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}</style>
        
        {status === 'loading' && (
          <>
            <div style={{ fontSize: 56, marginBottom: 20, animation: 'pulse 1.5s infinite' }}>⏳</div>
            <h2 style={{ marginBottom: 8 }}>Verificando seu e-mail...</h2>
            <p style={{ color: '#94a3b8' }}>Aguarde um momento.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ fontSize: 56, marginBottom: 20 }}>✅</div>
            <h2 style={{ color: '#4ade80', marginBottom: 8 }}>E-mail confirmado!</h2>
            <p style={{ color: '#94a3b8', marginBottom: 24 }}>Tudo certo! Você será redirecionado para o login em instantes...</p>
            <div style={{ background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 8, padding: '12px 20px', color: '#4ade80', fontSize: 14 }}>
              🎉 Bem-vindo! Você já pode explorar o sistema em modo Beta.
            </div>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: 56, marginBottom: 20 }}>🔗</div>
            <h2 style={{ color: '#f87171', marginBottom: 8 }}>Link usado ou expirado</h2>
            <p style={{ color: '#94a3b8', marginBottom: 24 }}>
              Este link de confirmação já foi utilizado ou é inválido.<br/>
              Se já confirmou antes, basta fazer login normalmente.
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{ padding: '12px 28px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15, fontWeight: 600 }}
            >
              Ir para o Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
