import React, { useEffect, useState } from 'react';
import { getQuotes, addQuote, updateQuote, updateQuoteStatus, deleteQuote, getClientsOptions, addOrder, getConfig } from '../api';
import { Plus, Trash2, X, Check, XCircle, ChevronDown, ChevronUp, ArrowRight, FileDown, MessageCircle, Copy, Pencil } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';


const FMT_BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const FMT_DATE = (s) => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('pt-BR');
}
// Gera HTML do orçamento e abre dialog de impressão (Salvar como PDF)
const generatePDF = async (q, clientName, companyName, whatsapp) => {
  const lines = (() => { try { return JSON.parse(q.lines); } catch { return []; } })();
  const numFmt = (v) => 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',');

  const div = document.createElement('div');
  div.style.width = '800px';
  div.style.padding = '40px';
  div.style.background = '#fff';
  div.style.position = 'absolute';
  div.style.left = '-9999px';
  div.style.top = '0';
  div.style.fontFamily = 'Arial, sans-serif';
  div.style.color = '#111827';
  
  div.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:3px solid #2563eb;margin-bottom:32px">
      <div>
        <div style="font-size:26px;font-weight:800;color:#2563eb">${companyName}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px">Higienização Profissional${whatsapp ? ' · ' + whatsapp : ''}</div>
      </div>
      <div>
        <div style="font-size:22px;font-weight:700;text-align:right">ORÇAMENTO</div>
        <div style="font-size:13px;color:#6b7280;text-align:right">#${q.id.slice(-6).toUpperCase()} · ${new Date().toLocaleDateString('pt-BR')}</div>
      </div>
    </div>
    <div style="background:#f3f4f6;border-left:4px solid #2563eb;border-radius:6px;padding:14px 18px;margin-bottom:28px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:4px">Para</div>
      <div style="font-size:20px;font-weight:700">${clientName}</div>
    </div>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;padding:8px 14px;border-radius:6px;font-size:13px;font-weight:600;display:inline-block;margin-bottom:24px">✓ Válido por 15 dias</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead>
        <tr>
          <th style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;padding:10px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;text-align:left">Serviço / Item</th>
          <th style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;padding:10px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;text-align:right">Qtd.</th>
          <th style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;padding:10px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;text-align:right">Valor Unit.</th>
          <th style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;padding:10px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;text-align:right">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${lines.map(l => `<tr>
          <td style="padding:12px 14px;border-bottom:1px solid #f3f4f6">${l.name || '—'}</td>
          <td style="padding:12px 14px;border-bottom:1px solid #f3f4f6;text-align:right">${l.qty || 1}</td>
          <td style="padding:12px 14px;border-bottom:1px solid #f3f4f6;text-align:right">${numFmt(l.price)}</td>
          <td style="padding:12px 14px;border-bottom:1px solid #f3f4f6;text-align:right">${numFmt((l.qty || 1) * (l.price || 0))}</td>
        </tr>`).join('')}
        <tr>
          <td colspan="3" style="border-top:2px solid #e5e7eb;background:#eff6ff;padding:14px;font-weight:700;text-align:right">TOTAL</td>
          <td style="border-top:2px solid #e5e7eb;background:#eff6ff;padding:14px;font-size:20px;font-weight:800;color:#2563eb;text-align:right">${numFmt(q.total)}</td>
        </tr>
      </tbody>
    </table>
    ${q.notes ? `<div style="font-size:13px;color:#6b7280;background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:12px 16px;margin-bottom:24px"><strong>Obs.:</strong> ${q.notes}</div>` : ''}
    <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;color:#9ca3af;font-size:11px">
      <span>${companyName} — Higienização Profissional</span>
      <span>Gerado em ${new Date().toLocaleDateString('pt-BR')}</span>
    </div>
  `;

  document.body.appendChild(div);
  
  try {
    const canvas = await html2canvas(div, { scale: 2, useCORS: true, logging: false });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('Orcamento_' + clientName.replace(/\s+/g, '_') + '.pdf');
  } catch (err) {
    console.error('Erro ao gerar PDF', err);
    alert('Erro ao gerar PDF');
  } finally {
    document.body.removeChild(div);
  }
};

const buildWhatsAppMessage = (q, clientName, companyName, whatsapp) => {
  const lines = (() => { try { return JSON.parse(q.lines); } catch { return []; } })();
  const numFmt = (v) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
  const items = lines
    .filter(l => l.name)
    .map(l => `  • ${l.name}${Number(l.qty) > 1 ? ` (${l.qty}x)` : ''} — ${numFmt((l.qty || 1) * (l.price || 0))}`)
    .join('\n');
  const parts = [
    `🧹 *ORÇAMENTO DE HIGIENIZAÇÃO*`,
    ``,
    `Olá, *${clientName}*! 👋`,
    `Segue o orçamento que você pediu:`,
    ``,
    `*📋 Serviços:*`,
    items,
    ``,
    `*💰 Total: ${numFmt(q.total)}*`,
    ``,
    `✅ Válido por 15 dias`,
    q.notes ? `📝 Obs.: ${q.notes}` : null,
    ``,
    `💳 *Aprove online sua proposta e veja os detalhes:*`,
    `${window.location.origin}/proposta/${q.id}`,
    ``,
    `Para confirmar ou tirar dúvidas, é só responder! 😊`,
    whatsapp ? `📞 ${whatsapp}` : null,
  ].filter(l => l !== null);
  return parts.join('\n');
};

// Limpa e formata telefone para link wa.me
const cleanPhone = (phone) => {
  if (!phone) return '';
  let n = phone.replace(/\D/g, '');
  if (n.startsWith('0')) n = n.slice(1);
  if (!n.startsWith('55') && n.length <= 11) n = '55' + n;
  return n;
};

const SERVICOS_BASE = [
  { name: 'Sofá 2 lugares', price: 120 },
  { name: 'Sofá 3 lugares', price: 170 },
  { name: 'Sofá em L', price: 220 },
  { name: 'Poltrona', price: 80 },
  { name: 'Cadeira', price: 60 },
  { name: 'Tapete até 2m²', price: 90 },
  { name: 'Tapete grande', price: 150 },
  { name: 'Colchão Solteiro', price: 100 },
  { name: 'Colchão Casal', price: 150 },
  { name: 'Colchão Queen/King', price: 200 },
  { name: 'Impermeabilização', price: 50 },
];

const EmptyLine = () => ({ id: Date.now(), name: '', qty: 1, price: '' });

export default function Orcamentos() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [quotes, setQuotes] = useState([]);
  const [clients, setClients] = useState([]);
  const [cfg, setCfg] = useState({ companyName: 'Higienizadora', whatsapp: '' });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({ client_id: '', notes: '', lines: [EmptyLine()] });

  const load = async () => {
    setLoading(true);
    const [q, c] = await Promise.all([getQuotes().catch(() => []), getClientsOptions().catch(() => [])]);
    setQuotes([...q].reverse());
    setClients(c);
    setLoading(false);
  };

  useEffect(() => {
    load();
    getConfig().then(c => setCfg(c)).catch(() => {});
  }, []);

  const getClientName = (id) => clients.find(c => c.id === id)?.name ?? '—';
  const getClientPhone = (id) => clients.find(c => c.id === id)?.phone ?? '';

  const lineTotal = (l) => Number(l.qty || 1) * Number(l.price || 0);
  const formTotal = form.lines.reduce((a, l) => a + lineTotal(l), 0);

  const addLine = () => setForm({ ...form, lines: [...form.lines, EmptyLine()] });
  const removeLine = (id) => setForm({ ...form, lines: form.lines.filter(l => l.id !== id) });
  const updateLine = (id, field, value) => setForm({ ...form, lines: form.lines.map(l => l.id === id ? { ...l, [field]: value } : l) });
  const applyPreset = (id, preset) => {
    setForm({ ...form, lines: form.lines.map(l => l.id === id ? { ...l, name: preset.name, price: preset.price } : l) });
  };

  const handlePDF = (q) => {
    generatePDF(q, getClientName(q.client_id), cfg.companyName || 'Higienizadora', cfg.whatsapp || '');
    toast('Abrindo PDF — clique em "Salvar como PDF" no dialog de impressão', 'info');
  };

  const handleWhatsApp = (q) => {
    const clientName = getClientName(q.client_id);
    const clientPhone = getClientPhone(q.client_id);
    const msg = buildWhatsAppMessage(q, clientName, cfg.companyName || 'Higienizadora', cfg.whatsapp || '');
    const phone = cleanPhone(clientPhone);
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    toast(`Abrindo WhatsApp${phone ? ' para ' + clientName : ' — sem telefone cadastrado'}`, 'success');
  };

  const copyMessage = (q) => {
    const clientName = getClientName(q.client_id);
    const msg = buildWhatsAppMessage(q, clientName, cfg.companyName || 'Higienizadora', cfg.whatsapp || '');
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(msg).then(() => {
        toast('Mensagem copiada! Cole no WhatsApp.', 'success');
      }).catch(() => toast('Erro ao copiar.', 'error'));
    } else {
      // Fallback para ambientes sem HTTPS (HTTP IP)
      const textArea = document.createElement("textarea");
      textArea.value = msg;
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        toast('Mensagem copiada! Cole no WhatsApp.', 'success');
      } catch {
        toast('Erro ao copiar.', 'error');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.client_id) return;
    setSaving(true);
    try {
      const total = formTotal;
      if (editingId) {
        await updateQuote(editingId, { ...form, total, lines: JSON.stringify(form.lines) });
        toast('Orçamento atualizado com sucesso!', 'success');
      } else {
        await addQuote({ ...form, total, lines: JSON.stringify(form.lines) });
        toast('Orçamento criado com sucesso!', 'success');
      }
      setForm({ client_id: '', notes: '', lines: [EmptyLine()] });
      setShowModal(false);
      setEditingId(null);
      load();
    } catch {
      toast('Erro ao salvar orçamento. Verifique se o servidor está rodando.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (q) => {
    const lines = parseLines(q.lines || q.services);
    setForm({
      client_id: q.client_id,
      notes: q.notes || '',
      lines: lines.length > 0 ? lines : [EmptyLine()]
    });
    setEditingId(q.id);
    setShowModal(true);
  };

  const handleStatus = async (id, status) => {
    await updateQuoteStatus(id, status);
    load();
  };

  const convertToOS = async (q) => {
    const lines = parseLines(q.lines || q.services);
    const description = lines.length
      ? lines.map(l => `${l.qty > 1 ? l.qty + 'x ' : ''}${l.name}`).join(', ')
      : q.client_name || 'Serviço';
    try {
      await addOrder({
        client_id: q.client_id,
        description,
        price: q.total,
        scheduled_for: '',
        status: 'Agendado',
        quote_id: q.id,   // ← link OS → proposta
      });
      toast('Ordem de Serviço criada! Acesse a Agenda para definir a data.', 'success');
    } catch { toast('Erro ao criar OS.', 'error'); }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Excluir Orçamento',
      message: 'Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita.',
      confirmText: 'Sim, Excluir',
      cancelText: 'Cancelar',
      type: 'danger',
    });
    if (ok) {
      try { await deleteQuote(id); toast('Orçamento excluído.', 'warning'); load(); }
      catch { toast('Erro ao excluir.', 'error'); }
    }
  };

  const parseLines = (linesStr) => {
    try { return JSON.parse(linesStr); } catch { return []; }
  };

  const statusBadge = (s) => ({
    'Pendente': 'badge-warning',
    'Aprovado': 'badge-success',
    'Recusado': 'badge-danger',
  }[s] ?? 'badge-neutral');

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-header" style={{ marginBottom: 0 }}>
          <div>
            <div className="section-title">Orçamentos</div>
            <div className="section-sub">{quotes.length} criado{quotes.length !== 1 ? 's' : ''}</div>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditingId(null); setForm({ client_id: '', notes: '', lines: [EmptyLine()] }); setShowModal(true); }}>
            <Plus size={15} /> Novo Orçamento
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Carregando...</p></div>
        ) : quotes.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum orçamento criado</p>
            <p>Clique em "Novo Orçamento" para gerar o primeiro</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, padding: '12px 0' }}>
            {quotes.map(q => {
              const lines = parseLines(q.lines);
              const expanded = expandedId === q.id;
              const statusColors = { 'Pendente': 'var(--amber-500)', 'Aprovado': 'var(--green-500)', 'Recusado': 'var(--red-500)' };
              const cardColor = statusColors[q.status] || 'var(--blue-500)';
              return (
                <div key={q.id} className="premium-card" style={{ '--card-color': cardColor }}>
                  <div style={{ cursor: 'pointer' }} onClick={() => setExpandedId(expanded ? null : q.id)}>
                    {/* Top row: Name, date, badge, price */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--gray-900)', fontSize: 15 }}>{getClientName(q.client_id)}</div>
                          <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>{FMT_DATE(q.created_at)} · {lines.length} item{lines.length !== 1 ? 's' : ''}</div>
                        </div>
                        <span className={`badge ${statusBadge(q.status)}`}>{q.status}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <strong style={{ fontSize: 16 }}>{FMT_BRL.format(Number(q.total || 0))}</strong>
                        {expanded ? <ChevronUp size={16} color="var(--gray-400)" /> : <ChevronDown size={16} color="var(--gray-400)" />}
                      </div>
                    </div>
                    {/* Bottom row: Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingTop: 12, marginTop: 12, borderTop: '1px solid var(--gray-100)' }}>
                      {/* Left: Primary Actions */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        {q.status === 'Pendente' && (
                          <>
                            <button className="btn btn-sm" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 20 }} onClick={e => { e.stopPropagation(); handleStatus(q.id, 'Aprovado'); }}>
                              <Check size={14} strokeWidth={2.5} /> Aprovar
                            </button>
                            <button className="btn btn-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 20 }} onClick={e => { e.stopPropagation(); handleStatus(q.id, 'Recusado'); }}>
                              <XCircle size={14} strokeWidth={2.5} /> Recusar
                            </button>
                          </>
                        )}
                        {q.status === 'Aprovado' && (
                          <button className="btn btn-sm" style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 20 }} onClick={e => { e.stopPropagation(); convertToOS(q); }}>
                            <ArrowRight size={14} strokeWidth={2.5} /> Criar OS
                          </button>
                        )}
                      </div>

                      {/* Right: Secondary/Utility Actions */}
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost" style={{ padding: '6px', color: '#10b981' }} onClick={e => { e.stopPropagation(); handleWhatsApp(q); }} title="Enviar orçamento no WhatsApp">
                          <MessageCircle size={17} strokeWidth={2} />
                        </button>
                        <button className="btn btn-ghost" style={{ padding: '6px', color: 'var(--gray-500)' }} onClick={e => { e.stopPropagation(); handlePDF(q); }} title="Baixar PDF para enviar">
                          <FileDown size={17} strokeWidth={2} />
                        </button>
                        <button className="btn btn-ghost" style={{ padding: '6px', color: 'var(--gray-500)' }} onClick={e => { e.stopPropagation(); copyMessage(q); }} title="Copiar mensagem de texto">
                          <Copy size={17} strokeWidth={2} />
                        </button>
                        <button className="btn btn-ghost" style={{ padding: '6px', color: 'var(--blue-500)' }} onClick={e => { e.stopPropagation(); handleEdit(q); }} title="Editar Orçamento">
                          <Pencil size={17} strokeWidth={2} />
                        </button>
                        <button className="btn btn-ghost" style={{ padding: '6px', color: 'var(--red-400)' }} onClick={e => { e.stopPropagation(); handleDelete(q.id); }} title="Excluir">
                          <Trash2 size={17} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {expanded && (
                    <div style={{ background: 'var(--gray-50)', borderRadius: 8, margin: '0 0 16px', padding: '16px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '0 0 8px' }}>Serviço</th>
                            <th style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '0 0 8px' }}>Qtd</th>
                            <th style={{ textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '0 0 8px' }}>Unitário</th>
                            <th style={{ textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '0 0 8px' }}>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lines.map((l, i) => (
                            <tr key={i} style={{ borderTop: '1px solid var(--gray-200)' }}>
                              <td style={{ padding: '8px 0', fontSize: 13.5 }}>{l.name}</td>
                              <td style={{ textAlign: 'center', color: 'var(--gray-500)', fontSize: 13 }}>{l.qty}x</td>
                              <td style={{ textAlign: 'right', color: 'var(--gray-500)', fontSize: 13 }}>{FMT_BRL.format(Number(l.price || 0))}</td>
                              <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5 }}>{FMT_BRL.format(Number(l.qty || 1) * Number(l.price || 0))}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: '2px solid var(--gray-200)' }}>
                            <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700, padding: '10px 0 0', fontSize: 14 }}>Total</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 16, color: 'var(--blue-600)', paddingTop: 10 }}>{FMT_BRL.format(Number(q.total || 0))}</td>
                          </tr>
                        </tfoot>
                      </table>
                      {q.notes && <p style={{ marginTop: 12, fontSize: 13, color: 'var(--gray-500)' }}><strong>Obs.:</strong> {q.notes}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{editingId ? 'Editar Orçamento' : 'Novo Orçamento'}</div>
                <div className="modal-sub">Selecione o cliente e os serviços</div>
              </div>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-grid" style={{ marginBottom: 20 }}>
                <div className="field">
                  <label className="field-label">Cliente *</label>
                  {clients.length === 0 ? (
                    <p style={{ color: 'var(--red-500)', fontSize: 13 }}>Cadastre ao menos um cliente primeiro.</p>
                  ) : (
                    <select className="field-input" value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} required>
                      <option value="">Selecione...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                </div>
                <div className="field">
                  <label className="field-label">Observações</label>
                  <input className="field-input" placeholder="Condições, validade, etc." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>

              {/* Itens do orçamento */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label className="field-label" style={{ marginBottom: 0 }}>Itens do Orçamento</label>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addLine}><Plus size={13} /> Adicionar linha</button>
                </div>

                {/* Atalhos rápidos */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {SERVICOS_BASE.slice(0, 6).map(s => (
                    <button key={s.name} type="button" onClick={() => {
                      const emptyLine = form.lines.find(l => !l.name);
                      if (emptyLine) applyPreset(emptyLine.id, s);
                      else setForm({ ...form, lines: [...form.lines, { ...EmptyLine(), name: s.name, price: s.price }] });
                    }} style={{ fontSize: 11.5, padding: '3px 10px', background: 'var(--gray-100)', border: '1px solid var(--gray-200)', borderRadius: 20, cursor: 'pointer', color: 'var(--gray-600)', fontWeight: 500 }}>
                      {s.name} — {FMT_BRL.format(s.price)}
                    </button>
                  ))}
                </div>

                {form.lines.map((line, i) => (
                  <div key={line.id} className="orcamento-line-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 60px 120px 32px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <input className="field-input" placeholder="Descrição do serviço" value={line.name} onChange={e => updateLine(line.id, 'name', e.target.value)} />
                    <input type="number" min="1" className="field-input" style={{ textAlign: 'center' }} value={line.qty} onChange={e => updateLine(line.id, 'qty', e.target.value)} />
                    <input type="number" step="0.01" min="0" className="field-input" placeholder="R$ 0,00" value={line.price} onChange={e => updateLine(line.id, 'price', e.target.value)} />
                    <button type="button" className="btn btn-ghost" style={{ color: 'var(--red-500)', padding: '6px' }} onClick={() => removeLine(line.id)} disabled={form.lines.length === 1}>
                      <X size={14} />
                    </button>
                  </div>
                ))}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--gray-200)' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 2 }}>Total estimado</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue-600)' }}>{FMT_BRL.format(formTotal)}</div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving || clients.length === 0}>{saving ? 'Salvando...' : (editingId ? 'Salvar Orçamento' : 'Gerar Orçamento')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
