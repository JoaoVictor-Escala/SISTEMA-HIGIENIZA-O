import React, { useEffect, useState, useRef } from 'react';
import { getConfig, setConfig, changePassword, getWhatsappStatus, connectWhatsapp, disconnectWhatsapp, getCollaborators, addCollaborator, updateCollaborator, deleteCollaborator } from '../api';
import { Save, Download, Building2, User, Phone, Lock, Eye, EyeOff, QrCode, PowerOff, Plus, Trash2, Edit3, Users } from 'lucide-react';
import { useToast } from '../context/ToastContext';

function CollaboratorsManager() {
  const { toast } = useToast();
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('tecnico');
  
  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('tecnico');
  const [editPassword, setEditPassword] = useState('');

  const loadCollaborators = async () => {
    try {
      const data = await getCollaborators();
      setCollaborators(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollaborators();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await addCollaborator({ name, email, password, role });
      toast('Colaborador adicionado com sucesso!', 'success');
      setName('');
      setEmail('');
      setPassword('');
      setRole('tecnico');
      loadCollaborators();
    } catch (err) {
      toast(err.message || 'Erro ao adicionar colaborador', 'error');
    }
  };

  const handleUpdate = async (id) => {
    try {
      await updateCollaborator(id, { name: editName, role: editRole, password: editPassword || undefined });
      toast('Colaborador atualizado com sucesso!', 'success');
      setEditingId(null);
      setEditPassword('');
      loadCollaborators();
    } catch (err) {
      toast(err.message || 'Erro ao atualizar colaborador', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente remover este colaborador da equipe? O acesso dele será revogado e as OS vinculadas a ele ficarão sem responsável.')) return;
    try {
      await deleteCollaborator(id);
      toast('Colaborador removido!', 'success');
      loadCollaborators();
    } catch (err) {
      toast(err.message || 'Erro ao remover colaborador', 'error');
    }
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditRole(c.role);
    setEditPassword('');
  };

  return (
    <div className="card animate-fadeIn" style={{ marginTop: 16 }}>
      <div className="section-header" style={{ marginBottom: 20 }}>
        <div>
          <div className="section-title">Gerenciamento da Equipe</div>
          <div className="section-sub">Cadastre e gerencie os técnicos e funcionários de campo</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'start' }}>
        {/* Lista de Colaboradores */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--gray-700)' }}>Integrantes Ativos</h3>
          {loading ? (
            <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>Carregando...</p>
          ) : collaborators.length === 0 ? (
            <div style={{ background: 'var(--gray-50)', padding: 20, textAlign: 'center', borderRadius: 8, border: '1px dashed var(--gray-200)' }}>
              <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>Nenhum colaborador cadastrado ainda.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {collaborators.map(c => (
                <div key={c.id} style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 8, padding: 12 }}>
                  {editingId === c.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input className="field-input" placeholder="Nome" value={editName} onChange={e => setEditName(e.target.value)} required />
                      <select className="field-input" value={editRole} onChange={e => setEditRole(e.target.value)}>
                        <option value="tecnico">Técnico de Campo</option>
                        <option value="admin">Administrador (Gerente)</option>
                      </select>
                      <input type="password" className="field-input" placeholder="Nova senha (deixe vazio se não quiser alterar)" value={editPassword} onChange={e => setEditPassword(e.target.value)} />
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button className="btn btn-primary" onClick={() => handleUpdate(c.id)} style={{ padding: '6px 12px', fontSize: 12 }}>Salvar</button>
                        <button className="btn btn-ghost" onClick={() => setEditingId(null)} style={{ padding: '6px 12px', fontSize: 12 }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--gray-900)' }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{c.email}</div>
                        <div style={{ marginTop: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: c.role === 'tecnico' ? '#eff6ff' : '#f0fdf4', color: c.role === 'tecnico' ? '#2563eb' : '#16a34a' }}>
                            {c.role === 'tecnico' ? 'Técnico' : 'Administrador'}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost" onClick={() => startEdit(c)} style={{ padding: 6, minWidth: 0 }} title="Editar"><Edit3 size={14} /></button>
                        <button className="btn btn-ghost" onClick={() => handleDelete(c.id)} style={{ padding: 6, minWidth: 0, color: 'var(--red-500)' }} title="Excluir"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Formulário de Adicionar */}
        <div style={{ background: 'var(--gray-50)', padding: 16, borderRadius: 12, border: '1px solid var(--gray-200)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--gray-700)', display: 'flex', alignItems: 'center', gap: 6 }}><Users size={16} /> Adicionar Membro</h3>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field">
              <label className="field-label">Nome Completo</label>
              <input className="field-input" placeholder="Ex: Carlos Silva" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="field">
              <label className="field-label">E-mail de Acesso (Único)</label>
              <input type="email" className="field-input" placeholder="carlos@empresa.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label className="field-label">Senha Inicial</label>
              <input type="password" className="field-input" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="field">
              <label className="field-label">Cargo / Função</label>
              <select className="field-input" value={role} onChange={e => setRole(e.target.value)}>
                <option value="tecnico">Técnico de Campo (Acesso Limitado)</option>
                <option value="admin">Administrador / Gerente (Acesso Total)</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }}><Plus size={14} /> Adicionar Colaborador</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function Configuracoes() {
  const { toast } = useToast();
  const [form, setForm] = useState({ companyName: '', ownerName: '', whatsapp: '' });
  const [loading, setLoading] = useState(true);

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const [whatsStatus, setWhatsStatus] = useState('disconnected');
  const [qrCode, setQrCode] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const pollingRef = useRef(null);

  const checkWhatsappStatus = async () => {
    try {
      const res = await getWhatsappStatus();
      setWhatsStatus(res.status);
      if (res.status === 'open') {
        setQrCode(null);
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    getConfig().then(c => { 
      setForm(c); 
      setLoading(false); 
      if (user?.role !== 'tecnico') {
        checkWhatsappStatus();
      }
    }).catch(() => setLoading(false));

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try { await setConfig(form); toast('Configurações salvas com sucesso!', 'success'); }
    catch { toast('Erro ao salvar configurações.', 'error'); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (novaSenha !== confirmarSenha) { toast('As senhas não coincidem.', 'error'); return; }
    setSalvandoSenha(true);
    try {
      await changePassword(senhaAtual, novaSenha);
      toast('Senha alterada com sucesso!', 'success');
      setSenhaAtual(''); setNovaSenha(''); setConfirmarSenha('');
    } catch (err) { toast(err.message, 'error'); }
    finally { setSalvandoSenha(false); }
  };

  const handleBackup = () => {
    const apiUrl = import.meta.env.DEV ? 'http://localhost:3002/api' : '/api';
    window.open(`${apiUrl}/backup`, '_blank');
    toast('Backup sendo preparado para download...', 'info');
  };

  const handleConnectWhatsapp = async () => {
    setConnecting(true);
    try {
      const res = await connectWhatsapp();
      if (res.qrcode) {
        setQrCode(res.qrcode);
        setWhatsStatus('connecting');
        
        // Polling para checar se o usuário leu o QR code
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(checkWhatsappStatus, 5000);
      } else {
        checkWhatsappStatus(); // se não vier qrcode, pode já estar logado
      }
    } catch {
      toast('Erro ao gerar QR Code.', 'error');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectWhatsapp = async () => {
    if (!confirm('Deseja realmente desconectar o WhatsApp Automático?')) return;
    try {
      await disconnectWhatsapp();
      setWhatsStatus('disconnected');
      setQrCode(null);
      if (pollingRef.current) clearInterval(pollingRef.current);
      toast('WhatsApp desconectado!', 'success');
    } catch {
      toast('Erro ao desconectar.', 'error');
    }
  };

  if (loading) return <div className="empty-state"><p>Carregando...</p></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: user?.role === 'tecnico' ? '1fr' : '1fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* COLUNA ESQUERDA */}
        {user?.role !== 'tecnico' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Info da Empresa */}
            <div className="card">
              <div className="section-header" style={{ marginBottom: 24 }}>
                <div>
                  <div className="section-title">Informações da Empresa</div>
                  <div className="section-sub">Esses dados aparecem nos orçamentos em PDF e na interface</div>
                </div>
              </div>
              <form onSubmit={handleSave}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                  <div className="field">
                    <label className="field-label"><Building2 size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />Nome da Empresa *</label>
                    <input className="field-input" placeholder="Ex: Higienizadora do João" value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} required />
                  </div>
                  <div className="field">
                    <label className="field-label"><User size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />Nome do Responsável</label>
                    <input className="field-input" placeholder="Seu nome" value={form.ownerName} onChange={e => setForm({ ...form, ownerName: e.target.value })} />
                  </div>
                  <div className="field">
                    <label className="field-label"><Phone size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />WhatsApp / Telefone</label>
                    <input className="field-input" placeholder="(11) 99999-9999" value={form.whatsapp || ''} onChange={e => setForm({ ...form, whatsapp: e.target.value })} />
                    <span style={{ fontSize: 11.5, color: 'var(--gray-400)', marginTop: 4 }}>Aparece no rodapé do orçamento PDF</span>
                  </div>
                  <div className="field">
                    <label className="field-label">🎯 Meta Mensal (R$)</label>
                    <input type="number" className="field-input" placeholder="Ex: 5000" value={form.monthlyGoal || ''} onChange={e => setForm({ ...form, monthlyGoal: Number(e.target.value) })} />
                    <span style={{ fontSize: 11.5, color: 'var(--gray-400)', marginTop: 4 }}>Para o dashboard animado</span>
                  </div>
                  <div className="field">
                    <label className="field-label">Link de Avaliação Google Meu Negócio</label>
                    <input className="field-input" placeholder="Ex: https://g.page/r/xyz/review" value={form.googleReviewLink || ''} onChange={e => setForm({ ...form, googleReviewLink: e.target.value })} />
                    <span style={{ fontSize: 11.5, color: 'var(--gray-400)', marginTop: 4 }}>Aparece no portal do cliente quando o serviço é Finalizado</span>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary">
                  <Save size={15} /> Salvar Configurações
                </button>
              </form>
            </div>

            {/* Backup */}
            <div className="card">
              <div className="section-header" style={{ marginBottom: 20 }}>
                <div>
                  <div className="section-title">Backup dos Dados</div>
                  <div className="section-sub">Baixe uma cópia completa do banco de dados do sistema</div>
                </div>
              </div>
              <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 8, padding: '16px 20px', marginBottom: 16 }}>
                <p style={{ fontSize: 13.5, color: 'var(--gray-600)', lineHeight: 1.6 }}>
                  O backup salva <strong>todos os dados</strong> (clientes, ordens, estoque, financeiro e orçamentos) em um arquivo <code style={{ background: 'var(--gray-200)', padding: '1px 5px', borderRadius: 3, fontFamily: 'monospace' }}>.json</code>.
                  Guarde em um local seguro (Google Drive, etc.) e use para restaurar se necessário.
                </p>
              </div>
              <button className="btn btn-secondary" onClick={handleBackup}>
                <Download size={15} /> Baixar Backup Completo
              </button>
            </div>

          </div>
        )}

        {/* COLUNA DIREITA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Minha Conta */}
          <div className="card">
            <div className="section-header" style={{ marginBottom: 20 }}>
              <div>
                <div className="section-title">Minha Conta</div>
                <div className="section-sub">Informações do seu acesso ao sistema</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 8 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--blue-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-900)' }}>{user?.name || 'Usuário'}</div>
                <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>{user?.email || '—'}</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: user?.subscription_status === 'pro' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', color: user?.subscription_status === 'pro' ? '#16a34a' : '#b45309' }}>
                  {user?.role === 'tecnico' ? 'TÉCNICO' : user?.subscription_status === 'pro' ? 'PRO' : 'Beta'}
                </span>
              </div>
            </div>
          </div>

          {/* WhatsApp Automático */}
          {user?.role !== 'tecnico' && (
            <div className="card">
              <div className="section-header" style={{ marginBottom: 20 }}>
                <div>
                  <div className="section-title">WhatsApp Automático</div>
                  <div className="section-sub">Conecte seu aparelho para disparos automáticos</div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  {whatsStatus === 'open' ? (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: '#dcfce7', color: '#16a34a' }}>🟢 Conectado</span>
                  ) : whatsStatus === 'connecting' ? (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: '#fef9c3', color: '#ca8a04' }}>🟡 Aguardando...</span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: '#fee2e2', color: '#dc2626' }}>🔴 Desconectado</span>
                  )}
                </div>
              </div>

              <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 8, padding: '16px', marginBottom: 16 }}>
                <p style={{ fontSize: 13.5, color: 'var(--gray-600)', lineHeight: 1.6, marginBottom: qrCode ? 16 : 0 }}>
                  O sistema utiliza a tecnologia <strong>Evolution API</strong> para envio de mensagens. 
                  Ao conectar seu celular, os follow-ups agendados serão disparados <strong>automaticamente</strong> nos horários programados.
                </p>

                {qrCode && whatsStatus !== 'open' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 16, background: '#fff', padding: 16, borderRadius: 8, border: '1px solid var(--gray-200)' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 12 }}>Leia o QR Code abaixo com seu WhatsApp:</p>
                    <img src={qrCode.startsWith('data:image') ? qrCode : `data:image/png;base64,${qrCode}`} alt="QR Code WhatsApp" style={{ width: 220, height: 220, borderRadius: 8 }} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                {whatsStatus === 'open' ? (
                  <button className="btn btn-secondary" onClick={handleDisconnectWhatsapp} style={{ color: 'var(--red-600)', borderColor: 'var(--red-200)', background: 'var(--red-50)' }}>
                    <PowerOff size={15} /> Desconectar Celular
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={handleConnectWhatsapp} disabled={connecting}>
                    <QrCode size={15} /> {connecting ? 'Gerando...' : 'Gerar QR Code'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Segurança */}
          <div className="card">
            <div className="section-header" style={{ marginBottom: 24 }}>
              <div>
                <div className="section-title">Segurança</div>
                <div className="section-sub">Altere sua senha de acesso ao sistema</div>
              </div>
            </div>
            <form onSubmit={handleChangePassword}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                <div className="field">
                  <label className="field-label"><Lock size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />Senha Atual</label>
                  <div style={{ position: 'relative' }}>
                    <input type={mostrarSenha ? 'text' : 'password'} className="field-input" placeholder="••••••••" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} required style={{ paddingRight: 40 }} />
                    <button type="button" onClick={() => setMostrarSenha(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', display: 'flex' }}>
                      {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Nova Senha</label>
                  <input type={mostrarSenha ? 'text' : 'password'} className="field-input" placeholder="Mínimo 6 caracteres" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} required />
                </div>
                <div className="field">
                  <label className="field-label">Confirmar Nova Senha</label>
                  <input type={mostrarSenha ? 'text' : 'password'} className="field-input" placeholder="Repita a nova senha" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} required />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={salvandoSenha}>
                <Lock size={15} /> {salvandoSenha ? 'Salvando...' : 'Alterar Senha'}
              </button>
            </form>
          </div>

        </div>

      </div>

      {user?.role !== 'tecnico' && (
        <CollaboratorsManager />
      )}
    </div>
  );
}
