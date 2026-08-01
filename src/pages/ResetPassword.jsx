import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, AlertTriangle, CheckCircle, Lock } from 'lucide-react';
import { resetPassword } from '../api';
import './Login.css';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
        setError('As senhas não coincidem');
        return;
    }
    if (password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres');
        return;
    }

    setLoading(true);
    setError(null);
    try {
      await resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
      return (
          <div className="login-container">
            <div className="login-content">
              <div className="login-card" style={{ textAlign: 'center' }}>
                <AlertTriangle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
                <h2 style={{ color: '#f8fafc' }}>Token Inválido</h2>
                <p style={{ color: '#94a3b8', marginBottom: 24 }}>O link de recuperação parece estar quebrado ou expirado.</p>
                <button onClick={() => navigate('/login')} className="login-btn">Voltar ao Login</button>
              </div>
            </div>
          </div>
      );
  }

  return (
    <div className="login-container">
      <div className="login-bg-shapes"><div className="login-shape shape-1"></div><div className="login-shape shape-2"></div></div>
      <div className="login-content">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo-container">
              <div className="abstract-logo"><div className="shape primary"></div><div className="shape secondary"></div></div>
            </div>
            <h2>Nova Senha</h2>
            <p>Defina sua nova credencial de acesso</p>
          </div>

          {success ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle size={32} color="#4ade80" />
              </div>
              <h3 style={{ color: '#f8fafc', marginBottom: 8 }}>Senha Alterada!</h3>
              <p style={{ color: '#94a3b8' }}>Sua senha foi redefinida com sucesso. Redirecionando para o login...</p>
            </div>
          ) : (
            <form className="login-form" onSubmit={handleSubmit}>
              {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <AlertTriangle size={16} /> {error}
                </div>
              )}

              <div className="login-field">
                <label className="login-label">Nova Senha</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="password" 
                    className="login-input" 
                    placeholder="Mínimo 6 caracteres" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                    style={{ paddingLeft: '40px' }}
                  />
                  <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                </div>
              </div>

              <div className="login-field">
                <label className="login-label">Confirmar Senha</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="password" 
                    className="login-input" 
                    placeholder="Repita a nova senha" 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    required 
                    style={{ paddingLeft: '40px' }}
                  />
                  <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                </div>
              </div>

              <button type="submit" className="login-btn" disabled={loading} style={{ marginTop: '12px' }}>
                <span>{loading ? 'Processando...' : 'Salvar Nova Senha'}</span>
                <ArrowRight size={18} />
              </button>
            </form>
          )}

          <div className="login-footer">
            <span className="login-footer-boston">🛡️ Enterprise-Grade Security</span>
          </div>
        </div>
      </div>
    </div>
  );
}
