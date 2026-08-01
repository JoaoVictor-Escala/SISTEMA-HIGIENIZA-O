import React, { useState, useEffect } from 'react';
import { get, post, API } from '../api';
import { 
  Users, Copy, Check, Plus, Tag, Percent, DollarSign, TrendingUp, 
  Edit2, CreditCard, ChevronDown, ChevronUp, CheckCircle, Clock, Wallet, KeyRound, ExternalLink
} from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function CommissionRow({ commission, onPay }) {
  const isPaid = commission.status === 'pago';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', borderRadius: 8,
      background: isPaid ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.06)',
      border: `1px solid ${isPaid ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.2)'}`,
      marginBottom: 6
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{commission.tenant_name}</div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
          Fatura: {fmt(commission.invoice_amount)} · {commission.commission_percentage}% · {new Date(commission.created_at).toLocaleDateString('pt-BR')}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: isPaid ? '#10b981' : '#f59e0b' }}>
          {fmt(commission.commission_amount)}
        </span>
        {isPaid ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#10b981', fontWeight: 600 }}>
            <CheckCircle size={13} /> Pago
          </span>
        ) : (
          <button
            onClick={() => onPay(commission.id)}
            style={{
              background: '#f59e0b', color: 'white', border: 'none', borderRadius: 6,
              padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer'
            }}
          >
            Marcar Pago
          </button>
        )}
      </div>
    </div>
  );
}

function SetPasswordModal({ affiliateId, affiliateName, onClose }) {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError('Mínimo 6 caracteres'); return; }
    setSaving(true); setError('');
    try {
      await API.put(`/admin/affiliates/${affiliateId}/set-password`, { password });
      setDone(true);
    } catch (err) { setError(err.message || 'Erro ao salvar senha'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="bg-white dark:bg-slate-800" style={{ width: '100%', maxWidth: 360, borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <KeyRound size={18} color="#3b82f6" />
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Senha do Portal — {affiliateName}</h3>
        </div>
        {done ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <CheckCircle size={32} color="#10b981" style={{ margin: '0 auto 10px', display: 'block' }} />
            <p style={{ fontWeight: 600, color: '#10b981' }}>Senha definida com sucesso!</p>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              O afiliado já pode acessar: <strong>sistema.impactoclean.com.br/parceiro</strong>
            </p>
            <button onClick={onClose} style={{ marginTop: 16, padding: '8px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Fechar</button>
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {error && <div style={{ color: '#dc2626', fontSize: 12, background: '#fef2f2', padding: '8px 12px', borderRadius: 6 }}>{error}</div>}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Nova Senha</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres"
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none' }} />
            </div>
            <p style={{ fontSize: 11, color: '#94a3b8' }}>
              O afiliado usará o código <strong>{affiliateName}</strong> + esta senha para acessar o portal em <strong>/parceiro</strong>.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 8, fontWeight: 600, cursor: 'pointer', background: 'none', fontSize: 13 }}>Cancelar</button>
              <button type="submit" disabled={saving} style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>{saving ? 'Salvando...' : 'Definir Senha'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function AffiliateCard({ aff, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const [commData, setCommData] = useState(null);
  const [loadingComm, setLoadingComm] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [showSetPwd, setShowSetPwd] = useState(false);

  const loadCommissions = async () => {
    if (commData) { setExpanded(e => !e); return; }
    setLoadingComm(true);
    setExpanded(true);
    try {
      const data = await get(`/admin/affiliates/${aff.id}/commissions`);
      setCommData(data);
    } catch { /* ignore */ }
    setLoadingComm(false);
  };

  const handlePay = async (commId) => {
    try {
      await API.put(`/admin/commissions/${commId}/pay`, {});
      const data = await get(`/admin/affiliates/${aff.id}/commissions`);
      setCommData(data);
    } catch { /* ignore */ }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const pendingBalance = commData?.balance?.pending || 0;
  const paidBalance = commData?.balance?.paid || 0;

  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      className="dark:bg-slate-800 dark:border-slate-700">

      {showSetPwd && <SetPasswordModal affiliateId={aff.id} affiliateName={aff.name} onClose={() => setShowSetPwd(false)} />}
      
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', gap: 16, flexWrap: 'wrap' }}>
        
        {/* Avatar */}
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
          {aff.name.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{aff.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ background: '#dbeafe', color: '#1d4ed8', fontFamily: 'monospace', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700 }}>
              {aff.code}
            </span>
            <button onClick={() => copyToClipboard(aff.code)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
              {copiedCode === aff.code ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            </button>
            {aff.pix_key && (
              <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                <CreditCard size={11} /> {aff.pix_key}
                <button onClick={() => copyToClipboard(aff.pix_key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
                  {copiedCode === aff.pix_key ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Comissão</div>
            <div style={{ fontWeight: 700, color: '#3b82f6' }}>{aff.commission_percentage}%</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Indicações</div>
            <div style={{ fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={13} /> {aff.referrals_count || 0}
            </div>
          </div>
          {commData && (
            <>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>A pagar</div>
                <div style={{ fontWeight: 700, color: '#f59e0b' }}>{fmt(pendingBalance)}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Já pago</div>
                <div style={{ fontWeight: 700, color: '#10b981' }}>{fmt(paidBalance)}</div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => onEdit(aff)} style={{ padding: '6px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', borderRadius: 6 }} title="Editar">
            <Edit2 size={16} />
          </button>
          <button onClick={() => setShowSetPwd(true)} style={{ padding: '6px 8px', background: 'none', border: '1px solid #e2e8f0', cursor: 'pointer', color: '#6366f1', borderRadius: 6 }} title="Definir senha do portal">
            <KeyRound size={16} />
          </button>
          <a href="/parceiro" target="_blank" rel="noopener noreferrer" style={{ padding: '6px 8px', background: 'none', border: '1px solid #e2e8f0', cursor: 'pointer', color: '#64748b', borderRadius: 6, display: 'flex', alignItems: 'center' }} title="Abrir portal do parceiro">
            <ExternalLink size={16} />
          </a>
          <button
            onClick={loadCommissions}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: expanded ? '#f1f5f9' : '#3b82f6', color: expanded ? '#475569' : 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
          >
            <Wallet size={14} />
            Comissões
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Expanded commissions panel */}
      {expanded && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '16px 20px', background: '#fafbfc' }}
          className="dark:bg-slate-900/40 dark:border-slate-700">
          {loadingComm ? (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>Carregando...</div>
          ) : commData?.commissions?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>
              <Clock size={20} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
              Nenhuma comissão registrada ainda.<br />
              <span style={{ fontSize: 11 }}>Será registrada automaticamente quando um cliente indicado por ele pagar.</span>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Histórico de Comissões</span>
                {pendingBalance > 0 && (
                  <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: '1px solid #fde68a' }}>
                    Saldo pendente: {fmt(pendingBalance)}
                  </span>
                )}
              </div>
              {commData.commissions.map(c => (
                <CommissionRow key={c.id} commission={c} onPay={handlePay} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Afiliados() {
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', discount_percentage: 20, commission_percentage: 30, pix_key: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadAffiliates = async () => {
    try {
      const data = await get('/admin/affiliates');
      setAffiliates(data);
    } catch {
      setError('Erro ao carregar afiliados. Você tem permissão de administrador mestre?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAffiliates(); }, []);

  const handleOpenNew = () => {
    setIsEditing(false); setEditingId(null);
    setFormData({ name: '', code: '', discount_percentage: 20, commission_percentage: 30, pix_key: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (aff) => {
    setIsEditing(true); setEditingId(aff.id);
    setFormData({ name: aff.name, code: aff.code, discount_percentage: aff.discount_percentage, commission_percentage: aff.commission_percentage, pix_key: aff.pix_key || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setError(null);
    try {
      if (isEditing) { await API.put(`/admin/affiliates/${editingId}`, formData); }
      else { await post('/admin/affiliates', formData); }
      await loadAffiliates();
      setShowModal(false);
    } catch (err) { setError(err.message || 'Erro ao salvar afiliado'); }
    finally { setSubmitting(false); }
  };

   // loaded lazily per card

  if (loading) return <div className="p-8 text-slate-400">Carregando painel de afiliados...</div>;
  if (error && !showModal) return <div className="p-8 text-red-400">{error}</div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={22} color="#3b82f6" /> Parceiros e Afiliados
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
            Comissões são registradas automaticamente a cada pagamento do cliente indicado.
          </p>
        </div>
        <button onClick={handleOpenNew} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
          <Plus size={16} /> Novo Afiliado
        </button>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <div style={{ color: '#64748b', fontSize: 12, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Afiliados</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{affiliates.length}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <div style={{ color: '#64748b', fontSize: 12, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Indicações</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#3b82f6' }}>
            {affiliates.reduce((acc, aff) => acc + (aff.referrals_count || 0), 0)}
          </div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 shadow-sm">
          <div style={{ color: '#92400e', fontSize: 12, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Como funciona</div>
          <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.4 }}>
            A cada pagamento, a comissão é calculada e registrada automaticamente. Clique em "Comissões" no afiliado para ver e marcar como pago.
          </div>
        </div>
      </div>

      {/* Affiliate Cards */}
      {affiliates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
          <Users size={36} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
          <p style={{ fontWeight: 600 }}>Nenhum afiliado ainda</p>
          <p style={{ fontSize: 13 }}>Clique em "Novo Afiliado" para cadastrar o primeiro parceiro.</p>
        </div>
      ) : (
        affiliates.map(aff => (
          <AffiliateCard key={aff.id} aff={aff} onEdit={handleOpenEdit} />
        ))
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="bg-white dark:bg-slate-800" style={{ width: '100%', maxWidth: 420, borderRadius: 20, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>{isEditing ? 'Editar Afiliado' : 'Cadastrar Afiliado'}</h2>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{isEditing ? 'Atualize as informações do parceiro.' : 'Crie um código de indicação e defina a comissão.'}</p>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {error && <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, fontSize: 13 }}>{error}</div>}
              
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Nome do Parceiro</label>
                <div style={{ position: 'relative' }}>
                  <Users size={14} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
                  <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Keel (Liga do Sofá)" style={{ width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Chave Pix</label>
                <div style={{ position: 'relative' }}>
                  <CreditCard size={14} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
                  <input value={formData.pix_key} onChange={e => setFormData({ ...formData, pix_key: e.target.value })} placeholder="e-mail, CPF, celular ou chave aleatória" style={{ width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Código do Cupom</label>
                <div style={{ position: 'relative' }}>
                  <Tag size={14} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
                  <input required disabled={isEditing} value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="Ex: CLIENTENV" style={{ width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', opacity: isEditing ? 0.6 : 1 }} />
                </div>
                {isEditing && <p style={{ fontSize: 11, color: '#f97316', marginTop: 4 }}>O código não pode ser alterado após criado na Stripe.</p>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Desconto (%)</label>
                  <div style={{ position: 'relative' }}>
                    <Percent size={14} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
                    <input required disabled={isEditing} type="number" min="0" max="100" value={formData.discount_percentage} onChange={e => setFormData({ ...formData, discount_percentage: e.target.value })} style={{ width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', opacity: isEditing ? 0.6 : 1 }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Comissão (%)</label>
                  <div style={{ position: 'relative' }}>
                    <DollarSign size={14} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
                    <input required type="number" min="0" max="100" value={formData.commission_percentage} onChange={e => setFormData({ ...formData, commission_percentage: e.target.value })} style={{ width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>

              {!isEditing && (
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#065f46' }}>
                  O cupom <strong>{formData.code || '...'}</strong> de {formData.discount_percentage}% será criado automaticamente no Stripe ao salvar.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '9px 18px', background: 'none', border: '1px solid #d1d5db', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} style={{ padding: '9px 18px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Salvar Afiliado')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
