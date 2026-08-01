import React, { useState, useEffect, useCallback } from 'react';
import { API } from '../api';
import {
  Clock, CheckCircle, XCircle, MessageSquare, Send,
  Pencil, Trash2, X, Save, Calendar, Phone, Info, Eye
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

const PRESET_DAYS = [15, 30, 45, 60, 90, 120];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function daysLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const diff = Math.round((d - new Date()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d atrasado`;
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  return `em ${diff} dias`;
}

function statusBadge(status) {
  const map = {
    pendente:  'badge-info',
    enviado:   'badge-success',
    cancelado: 'badge-neutral',
  };
  return map[status] ?? 'badge-neutral';
}

function statusLabel(status) {
  const map = { pendente: 'Agendado', enviado: 'Enviado', cancelado: 'Cancelado' };
  return map[status] ?? status;
}

export default function FollowUp() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [followups, setFollowups] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ message: '', scheduled_for: '' });
  const [configDays, setConfigDays] = useState(60);
  const [followupMessage, setFollowupMessage] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [sending, setSending] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const load = useCallback(async () => {
    try {
      const [fups, cfg] = await Promise.all([
        API.get('/followups'),
        API.get('/config'),
      ]);
      setFollowups(fups);
      setConfig(cfg);
      setConfigDays(cfg.followup_days || 60);
      setFollowupMessage(cfg.followup_message || '');
    } catch {
      toast('Erro ao carregar follow-ups', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await API.put('/config', { followup_days: configDays, followup_message: followupMessage });
      toast(`Configurações de follow-up salvas`);
    } catch {
      toast('Erro ao salvar configuração', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleCancel = async (id, name) => {
    const ok = await confirm({
      title: 'Cancelar Follow-Up',
      message: `Tem certeza que deseja cancelar o follow-up de "${name}"?`,
      confirmText: 'Sim, Cancelar',
      cancelText: 'Voltar',
      type: 'warning',
    });
    if (!ok) return;
    try {
      await API.delete(`/followups/${id}`);
      setFollowups(f => f.map(x => x.id === id ? { ...x, status: 'cancelado' } : x));
      toast('Follow-up cancelado');
    } catch {
      toast('Erro ao cancelar', 'error');
    }
  };

  const handleSendNow = async (f) => {
    setSending(f.id);
    try {
      const res = await API.post(`/followups/${f.id}/send-now`, {});
      window.open(res.link, '_blank');
      setFollowups(prev => prev.map(x => x.id === f.id ? { ...x, status: 'enviado' } : x));
      toast(`WhatsApp aberto para ${f.client_name}`);
    } catch {
      toast('Erro ao processar envio', 'error');
    } finally {
      setSending(null);
    }
  };

  const handleStartEdit = (f) => {
    setEditingId(f.id);
    setEditData({ message: f.message, scheduled_for: f.scheduled_for });
  };

  const handleSaveEdit = async (id) => {
    try {
      const updated = await API.put(`/followups/${id}`, editData);
      setFollowups(f => f.map(x => x.id === id ? updated : x));
      setEditingId(null);
      toast('Follow-up atualizado');
    } catch {
      toast('Erro ao salvar', 'error');
    }
  };

  const DEFAULT_TEMPLATE = `Olá, {nome}! Tudo bem?\n\nAqui é da {empresa}. Faz um tempinho desde o seu último serviço de higienização{servico} e queríamos saber se está tudo bem com o resultado!\n\nQue tal agendar uma nova higienização? Estamos com disponibilidade e adoraríamos te atender novamente.\n\nResponda essa mensagem e vamos marcar!`;

  // Live preview — substitutes variables with example values
  const previewMessage = (followupMessage || DEFAULT_TEMPLATE)
    .replace(/\{nome\}/gi, 'João Silva')
    .replace(/\{empresa\}/gi, config?.companyName || 'LimpeJá')
    .replace(/\{servico\}/gi, ' (Sofá 3 lugares)');

  const insertVar = (varName) => {
    const ta = document.getElementById('followup-msg-textarea');
    if (!ta) return;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const val   = followupMessage;
    setFollowupMessage(val.slice(0, start) + varName + val.slice(end));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + varName.length, start + varName.length); }, 0);
  };

  const filtered = followups.filter(f => filter === 'todos' || f.status === filter);
  const counts = {
    pendente:  followups.filter(f => f.status === 'pendente').length,
    enviado:   followups.filter(f => f.status === 'enviado').length,
    cancelado: followups.filter(f => f.status === 'cancelado').length,
  };

  return (
    <div>
      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Agendados</span>
            <div className="kpi-icon" style={{ background: '#eff6ff' }}>
              <Clock size={16} color="#2563eb" />
            </div>
          </div>
          <div className="kpi-value">{counts.pendente}</div>
          <div className="kpi-sub">Aguardando envio</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Enviados</span>
            <div className="kpi-icon" style={{ background: '#f0fdf4' }}>
              <CheckCircle size={16} color="#16a34a" />
            </div>
          </div>
          <div className="kpi-value">{counts.enviado}</div>
          <div className="kpi-sub">Mensagens disparadas</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Cancelados</span>
            <div className="kpi-icon" style={{ background: '#fef2f2' }}>
              <XCircle size={16} color="#dc2626" />
            </div>
          </div>
          <div className="kpi-value">{counts.cancelado}</div>
          <div className="kpi-sub">Removidos da fila</div>
        </div>
      </div>

      {/* Config Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-header" style={{ marginBottom: 16 }}>
          <div>
            <div className="section-title">Prazo Padrão de Retorno</div>
            <div className="section-sub">
              Tempo até o envio automático após um serviço ser finalizado
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleSaveConfig}
            disabled={savingConfig}
          >
            <Save size={14} />
            {savingConfig ? 'Salvando...' : 'Salvar'}
          </button>
        </div>

        {/* Preset chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {PRESET_DAYS.map(d => (
            <button
              key={d}
              onClick={() => setConfigDays(d)}
              className={configDays === d ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ minWidth: 72, justifyContent: 'center' }}
            >
              {d} dias
            </button>
          ))}
        </div>

        {/* Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
          <input
            type="range" min={7} max={180} value={configDays}
            onChange={e => setConfigDays(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--blue-600)', height: 4 }}
          />
          <span style={{
            minWidth: 72, textAlign: 'center',
            padding: '6px 12px', background: 'var(--blue-50)',
            color: 'var(--blue-600)', borderRadius: 8,
            fontWeight: 700, fontSize: 14,
            border: '1px solid var(--blue-200)',
          }}>
            {configDays} dias
          </span>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', background: 'var(--gray-50)',
          borderRadius: 8, border: '1px solid var(--gray-200)',
        }}>
          <Info size={14} color="var(--gray-400)" />
          <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>
            Ao marcar um serviço como <strong style={{ color: 'var(--gray-700)' }}>Finalizado</strong>,
            o sistema agendará um follow-up para <strong style={{ color: 'var(--blue-600)' }}>{configDays} dias</strong> depois.
          </span>
        </div>
      </div>

      {/* Message Template Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-header" style={{ marginBottom: 16 }}>
          <div>
            <div className="section-title">Mensagem de Follow-Up</div>
            <div className="section-sub">
              Texto enviado aos clientes. Use variáveis que serão substituídas automaticamente.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowPreview(p => !p)}
            >
              <Eye size={14} />
              {showPreview ? 'Editar' : 'Visualizar'}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSaveConfig}
              disabled={savingConfig}
            >
              <Save size={14} />
              {savingConfig ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* Variable tag buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 500 }}>Inserir variável:</span>
          {[
            { var: '{nome}',    label: 'Nome do cliente' },
            { var: '{empresa}', label: 'Nome da empresa' },
            { var: '{servico}', label: 'Serviço realizado' },
          ].map(v => (
            <button
              key={v.var}
              className="btn btn-ghost"
              style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--blue-600)', background: 'var(--blue-50)', border: '1px solid var(--blue-200)' }}
              onClick={() => insertVar(v.var)}
              title={v.label}
            >
              {v.var}
            </button>
          ))}
          <button
            className="btn btn-ghost"
            style={{ fontSize: 12, color: 'var(--gray-400)', marginLeft: 'auto' }}
            onClick={() => setFollowupMessage(DEFAULT_TEMPLATE)}
            title="Restaurar mensagem padrão"
          >
            Restaurar padrão
          </button>
        </div>

        {showPreview ? (
          /* Preview mode */
          <div>
            <div style={{
              fontSize: 11, fontWeight: 600, color: 'var(--gray-400)',
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
            }}>
              Preview — como o cliente vai receber
            </div>
            <div style={{
              background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
              borderRadius: 8, padding: '14px 16px',
              fontSize: 13.5, color: 'var(--gray-700)',
              whiteSpace: 'pre-wrap', lineHeight: 1.7,
              fontFamily: 'inherit',
            }}>
              {previewMessage}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              marginTop: 10, padding: '8px 12px',
              background: 'var(--blue-50)', borderRadius: 8,
              border: '1px solid var(--blue-200)',
            }}>
              <Info size={13} color="var(--blue-600)" />
              <span style={{ fontSize: 12, color: 'var(--blue-600)' }}>
                Preview com dados de exemplo: cliente "João Silva", serviço "Sofá 3 lugares"
              </span>
            </div>
          </div>
        ) : (
          /* Edit mode */
          <div className="field" style={{ margin: 0 }}>
            <textarea
              id="followup-msg-textarea"
              rows={7}
              className="field-input"
              placeholder={DEFAULT_TEMPLATE}
              value={followupMessage}
              onChange={e => setFollowupMessage(e.target.value)}
              style={{ resize: 'vertical', minHeight: 140, fontFamily: 'inherit', lineHeight: 1.6 }}
            />
          </div>
        )}
      </div>

      {/* Fila de Follow-Ups */}

      <div className="card">
        <div className="section-header" style={{ marginBottom: 16 }}>
          <div>
            <div className="section-title">Fila de Follow-Ups</div>
            <div className="section-sub">{followups.length} registro{followups.length !== 1 ? 's' : ''} no total</div>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { key: 'todos',    label: `Todos (${followups.length})` },
              { key: 'pendente', label: `Agendados (${counts.pendente})` },
              { key: 'enviado',  label: `Enviados (${counts.enviado})` },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={filter === f.key ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ fontSize: 12 }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><p>Carregando...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <MessageSquare size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
            <p>
              {filter === 'todos'
                ? 'Nenhum follow-up ainda'
                : `Nenhum follow-up com status "${statusLabel(filter)}"`}
            </p>
            {filter === 'todos' && (
              <p>Marque uma OS como Finalizado para criar o primeiro</p>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Telefone</th>
                  <th>Envio Previsto</th>
                  <th>Status</th>
                  <th>Mensagem</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => (
                  <React.Fragment key={f.id}>
                    <tr>
                      <td>
                        <span className="td-strong">{f.client_name}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Phone size={13} color="var(--gray-400)" />
                          <span className="td-muted">{f.client_phone || '—'}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Calendar size={13} color="var(--gray-400)" />
                          <span style={{ fontSize: 13 }}>{formatDate(f.scheduled_for)}</span>
                          {f.status === 'pendente' && (
                            <span style={{
                              fontSize: 11, padding: '1px 7px', borderRadius: 99,
                              background: 'var(--blue-50)', color: 'var(--blue-600)',
                              fontWeight: 600,
                            }}>
                              {daysLabel(f.scheduled_for)}
                            </span>
                          )}
                          {f.sent_at && (
                            <span className="td-muted" style={{ fontSize: 11 }}>
                              Enviado {new Date(f.sent_at).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${statusBadge(f.status)}`}>
                          {statusLabel(f.status)}
                        </span>
                      </td>
                      <td style={{ maxWidth: 260 }}>
                        <span style={{
                          fontSize: 12, color: 'var(--gray-400)',
                          display: '-webkit-box', WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {f.message}
                        </span>
                      </td>
                      <td>
                        {f.status === 'pendente' && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              className="btn btn-primary"
                              style={{ fontSize: 12, padding: '5px 10px', background: '#25D366', border: 'none' }}
                              onClick={() => handleSendNow(f)}
                              disabled={sending === f.id}
                              title="Abrir WhatsApp com mensagem pronta"
                            >
                              <Send size={12} />
                              {sending === f.id ? '...' : 'Enviar'}
                            </button>
                            <button
                              className="btn btn-ghost"
                              onClick={() => handleStartEdit(f)}
                              title="Editar mensagem ou data"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="btn btn-ghost"
                              style={{ color: 'var(--red-500)' }}
                              onClick={() => handleCancel(f.id, f.client_name)}
                              title="Cancelar follow-up"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* Inline edit row */}
                    {editingId === f.id && (
                      <tr style={{ background: 'var(--gray-50)' }}>
                        <td colSpan={6} style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                              <div className="field" style={{ flex: '0 0 180px', margin: 0 }}>
                                <label className="field-label">Data de envio</label>
                                <input
                                  type="date"
                                  className="field-input"
                                  value={editData.scheduled_for}
                                  onChange={e => setEditData(d => ({ ...d, scheduled_for: e.target.value }))}
                                />
                              </div>
                              <div className="field" style={{ flex: 1, margin: 0 }}>
                                <label className="field-label">Mensagem</label>
                                <textarea
                                  rows={3}
                                  className="field-input"
                                  value={editData.message}
                                  onChange={e => setEditData(d => ({ ...d, message: e.target.value }))}
                                  style={{ resize: 'vertical', minHeight: 72 }}
                                />
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn btn-primary" onClick={() => handleSaveEdit(f.id)}>
                                <Save size={13} /> Salvar alterações
                              </button>
                              <button className="btn btn-secondary" onClick={() => setEditingId(null)}>
                                <X size={13} /> Cancelar
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
