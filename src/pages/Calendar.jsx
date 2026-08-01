import React, { useEffect, useState, useMemo } from 'react';
import { getOrders, addOrder, getClientsOptions, updateOrderStatus, updateOrder, deleteOrder, getConfig, getCollaborators } from '../api';
import { Plus, Trash2, X, Search, Pencil, MapPin, List, Calendar as CalendarIcon, FileText } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import ReportModal from '../components/ReportModal';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales: { 'pt-BR': ptBR },
});

const calendarFormats = {
  timeGutterFormat: (date, culture, localizer) =>
    localizer.format(date, 'HH:mm', culture),
  eventTimeRangeFormat: ({ start, end }, culture, localizer) =>
    localizer.format(start, 'HH:mm', culture) + ' – ' + localizer.format(end, 'HH:mm', culture),
  agendaTimeRangeFormat: ({ start, end }, culture, localizer) =>
    localizer.format(start, 'HH:mm', culture) + ' – ' + localizer.format(end, 'HH:mm', culture),
  dayFormat: (date, culture, localizer) =>
    localizer.format(date, 'EEEE dd/MM', culture),
  dayHeaderFormat: (date, culture, localizer) =>
    localizer.format(date, "EEEE, dd 'de' MMMM", culture),
  dayRangeHeaderFormat: ({ start, end }, culture, localizer) =>
    localizer.format(start, "dd 'de' MMM", culture) + ' – ' + localizer.format(end, "dd 'de' MMM 'de' yyyy", culture),
  monthHeaderFormat: (date, culture, localizer) =>
    localizer.format(date, "MMMM 'de' yyyy", culture),
  weekdayFormat: (date, culture, localizer) =>
    localizer.format(date, 'EEE', culture),
};


// Error Boundary para o calendário
class CalendarErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--gray-500)' }}>
          <CalendarIcon size={40} style={{ opacity: 0.4 }} />
          <p style={{ fontWeight: 600 }}>Calendário temporariamente indisponível</p>
          <button className="btn btn-secondary" onClick={() => this.setState({ hasError: false })}>Tentar novamente</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const FMT_BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const FMT_DT = (str) => {
  if (!str) return '—';
  const d = new Date(str);
  return isNaN(d) ? '—' : d.toLocaleTimeString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Convert ISO datetime to datetime-local input value
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const STATUS_OPTS  = ['Agendado', 'Em Andamento', 'Aguardando', 'Finalizado', 'Cancelado'];
const FILTER_TABS  = ['Todos', 'Agendado', 'Em Andamento', 'Aguardando', 'Finalizado'];

function statusBadge(s) {
  return { 'Finalizado': 'badge-success', 'Agendado': 'badge-info', 'Em Andamento': 'badge-warning', 'Aguardando': 'badge-neutral', 'Cancelado': 'badge-danger' }[s] ?? 'badge-neutral';
}

const BLANK = { client_id: '', description: '', price: '', scheduled_for: '', status: 'Agendado', down_payment: '', assigned_to: '' };

// Componente do formulário de OS
function OSModal({ title, sub, form, setForm, clients, collaborators = [], isTecnico = false, saving, onSubmit, onClose, editOrder, onCopyLink }) {
  const remainder = Math.max(0, (Number(form.price) || 0) - (Number(form.down_payment) || 0));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">{title}</div>
            <div className="modal-sub">{sub}</div>
          </div>
          <button className="btn btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-grid">
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
              <label className="field-label">Status</label>
              <select className="field-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label className="field-label">Descrição do Serviço *</label>
              <input className="field-input" placeholder="Ex: Limpeza de sofá 3 lugares + impermeabilização" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
            </div>

            <div className="field">
              <label className="field-label">Valor Total (R$)</label>
              <input type="number" step="0.01" min="0" className="field-input" placeholder="0,00" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            </div>

            <div className="field">
              <label className="field-label">Data e Hora</label>
              <input type="datetime-local" className="field-input" value={form.scheduled_for} onChange={e => setForm({ ...form, scheduled_for: e.target.value })} />
            </div>

            {/* Atribuído a */}
            {!isTecnico ? (
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Responsável / Técnico</label>
                <select className="field-input" value={form.assigned_to || ''} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                  <option value="">Não atribuído (Dono)</option>
                  {collaborators.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
                </select>
              </div>
            ) : (
              form.assigned_to && (
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label className="field-label">Técnico Responsável</label>
                  <input className="field-input" value={collaborators.find(col => col.id === form.assigned_to)?.name || 'Atribuído a você'} readOnly disabled style={{ opacity: 0.8 }} />
                </div>
              )
            )}

            {/* Sinal / Saldo */}
            <div className="field" style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', marginTop: 8 }}>
              <div className="form-grid form-grid-2">
                <div>
                  <label className="field-label" style={{ color: '#0f172a' }}>Sinal Recebido (R$)</label>
                  <input type="number" step="0.01" min="0" className="field-input" placeholder="0,00" value={form.down_payment || ''} onChange={e => setForm({ ...form, down_payment: e.target.value })} />
                  <span style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 4, display: 'block' }}>Valor adiantado pelo cliente</span>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase' }}>Falta Receber na Entrega</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>{FMT_BRL.format(remainder)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            {editOrder && (
              <button type="button" className="btn btn-ghost" style={{ marginRight: 'auto', color: 'var(--blue-600)', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => onCopyLink(editOrder)}>
                <FileText size={16} /> Copiar Link do Portal
              </button>
            )}
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving || clients.length === 0}>
                {saving ? 'Salvando...' : (title.startsWith('Editar') ? 'Salvar Alterações' : 'Criar OS')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Componente principal da Agenda
export default function Agenda() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [orders, setOrders]   = useState([]);
  const [clients, setClients] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('Todos');
  const [search, setSearch]   = useState('');

  // Paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modals
  const [showAdd, setShowAdd]       = useState(false);
  const [editOrder, setEditOrder]   = useState(null); // null | order object
  const [reportOrder, setReportOrder] = useState(null); // null | order object
  const [saving, setSaving]         = useState(false);
  const [companyConfig, setCompanyConfig] = useState({ companyName: 'LimpeJá' });

  // Forms
  const [form, setForm]         = useState(BLANK);
  const [editForm, setEditForm] = useState(BLANK);

  // View Mode
  const [viewMode, setViewMode] = useState('calendario'); // 'calendario' | 'tabela'

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isTecnico = user?.role === 'tecnico';

  const load = async (currentPage = page, currentSearch = search, currentStatus = filter) => {
    setLoading(true);
    try {
      const limit = viewMode === 'calendario' ? 1000 : 50; // Busca mais no calendário
      const [o, c, cfg, colabs] = await Promise.all([
        getOrders(currentPage, limit, currentSearch, currentStatus), 
        getClientsOptions().catch(() => []),
        getConfig().catch(() => ({ companyName: 'LimpeJá' })),
        (!isTecnico ? getCollaborators() : Promise.resolve([])).catch(() => [])
      ]);
      setClients(c);
      setCollaborators(colabs || []);
      if (cfg) setCompanyConfig(cfg);
      
      if (o && o.data) {
        setOrders(o.data);
        setTotalPages(o.totalPages);
        setTotalItems(o.total);
      } else {
        setOrders([...(o || [])].reverse());
        setTotalPages(1);
        setTotalItems((o || []).length);
      }
    } catch {
      setOrders([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1);
      load(1, search, filter);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, filter, viewMode]);

  const getClientName = (id) => clients.find(c => c.id === id)?.name ?? '—';
  const getCollaboratorName = (id) => collaborators.find(col => col.id === id)?.name ?? 'Sem técnico';

  // Criação
  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addOrder(form);
      toast('OS criada com sucesso!', 'success');
      setForm(BLANK);
      setShowAdd(false);
      load();
    } catch (err) {
      toast('Erro ao criar OS: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Abrir edição
  const openEdit = (o) => {
    setEditForm({
      client_id:    o.client_id || '',
      description:  o.description || o.service || '',
      price:        o.price ?? '',
      scheduled_for: toLocalInput(o.scheduled_for),
      status:       o.status || 'Agendado',
      down_payment: o.down_payment ?? '',
      assigned_to:  o.assigned_to || '',
    });
    setEditOrder(o);
  };

  // Salvar edição
  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateOrder(editOrder.id, {
        description:   editForm.description,
        price:         editForm.price,
        scheduled_for: editForm.scheduled_for,
        status:        editForm.status,
        down_payment:  editForm.down_payment,
        client_id:     editForm.client_id,
        assigned_to:   editForm.assigned_to,
      });
      toast('OS atualizada com sucesso!', 'success');
      setEditOrder(null);
      load();
    } catch (err) {
      toast('Erro ao salvar OS: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (id, newStatus) => {
    await updateOrderStatus(id, newStatus);
    load();
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Excluir Ordem de Serviço',
      message: 'Tem certeza que deseja excluir esta OS? Esta ação não pode ser desfeita.',
      confirmText: 'Sim, Excluir',
      cancelText: 'Cancelar',
      type: 'danger',
    });
    if (ok) { await deleteOrder(id); load(); }
  };

  const handleCopyLink = (o) => {
    const linkId = o.quote_id || o.id;
    const msg = `Seu serviço está agendado! Acompanhe os detalhes no portal:\n${window.location.origin}/proposta/${linkId}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(msg).then(() => {
        toast('Link copiado! Cole no WhatsApp.', 'success');
      }).catch(() => toast('Erro ao copiar.', 'error'));
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = msg;
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        toast('Link copiado! Cole no WhatsApp.', 'success');
      } catch {
        toast('Erro ao copiar.', 'error');
      }
      document.body.removeChild(textArea);
    }
  };

  // Funções do Calendário
  const calendarEvents = useMemo(() => {
    return orders.filter(o => o.scheduled_for).map(o => {
      const start = new Date(o.scheduled_for);
      const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hora default
      const techSuffix = !isTecnico && o.assigned_to ? ` [${getCollaboratorName(o.assigned_to)}]` : '';
      return {
        id: o.id,
        title: `${o.service || o.description} (${getClientName(o.client_id)})${techSuffix}`,
        start,
        end,
        resource: o,
      };
    });
  }, [orders, clients, collaborators]);



  const onEventClick = (event) => {
    openEdit(event.resource);
  };

  const eventStyleGetter = (event) => {
    const s = event.resource.status;
    let backgroundColor = '#64748b'; // default
    if (s === 'Agendado') backgroundColor = '#3b82f6';
    if (s === 'Em Andamento') backgroundColor = '#eab308';
    if (s === 'Finalizado') backgroundColor = '#22c55e';
    if (s === 'Cancelado') backgroundColor = '#ef4444';

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '12px',
        fontWeight: 'bold',
        padding: '2px 4px'
      }
    };
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Filtros de status */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTER_TABS.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12.5, fontWeight: 500,
                background: filter === f ? 'var(--blue-600)' : 'var(--gray-100)',
                color: filter === f ? 'white' : 'var(--gray-600)',
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {f}
              </button>
            ))}
            <div style={{ width: 1, background: 'var(--gray-200)', margin: '0 8px' }}></div>
            <div style={{ display: 'flex', background: 'var(--gray-100)', borderRadius: 20, padding: 2 }}>
              <button onClick={() => setViewMode('calendario')} style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 18, border: 'none', fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                background: viewMode === 'calendario' ? 'white' : 'transparent',
                color: viewMode === 'calendario' ? 'var(--blue-600)' : 'var(--gray-500)',
                boxShadow: viewMode === 'calendario' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s'
              }}>
                <CalendarIcon size={14} /> Calendário
              </button>
              <button onClick={() => setViewMode('tabela')} style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 18, border: 'none', fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                background: viewMode === 'tabela' ? 'white' : 'transparent',
                color: viewMode === 'tabela' ? 'var(--blue-600)' : 'var(--gray-500)',
                boxShadow: viewMode === 'tabela' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s'
              }}>
                <List size={14} /> Tabela
              </button>
            </div>
          </div>

          {/* Busca + Nova OS */}
          <div className="action-bar">
            <div className="search-input-wrapper" style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input className="field-input search-input" style={{ paddingLeft: 32, width: 200 }} placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {!isTecnico && (
              <button className="btn btn-primary" onClick={() => { setForm(BLANK); setShowAdd(true); }}>
                <Plus size={15} /> <span className="hide-text-mobile">Nova OS</span>
              </button>
            )}
          </div>
        </div>
      </div>
      {/* Calendário ou Tabela */}
      {viewMode === 'calendario' ? (
        <div className="card animate-fadeIn" style={{ height: '75vh', padding: 16 }}>
          <style>{`
            .rbc-calendar { font-family: inherit; }
            .rbc-toolbar button { border-radius: 6px; padding: 6px 12px; font-weight: 500; font-size: 13px; }
            .rbc-toolbar button.rbc-active { background-color: var(--blue-50); color: var(--blue-600); box-shadow: none; border-color: var(--blue-200); }
            .rbc-event { padding: 4px; border-radius: 6px; }
            .rbc-today { background-color: var(--blue-50); }
            .rbc-header { padding: 8px 0; font-weight: 600; color: var(--gray-600); }
          `}</style>
          {loading && orders.length === 0 ? (
            <div className="empty-state"><p>Carregando agenda...</p></div>
          ) : (
            <CalendarErrorBoundary>
              <BigCalendar
                localizer={localizer}
                culture="pt-BR"
                formats={calendarFormats}
                events={calendarEvents}
                onSelectEvent={onEventClick}
                defaultView="week"
                views={['month', 'week', 'day']}
                messages={{
                  next: "Próximo",
                  previous: "Anterior",
                  today: "Hoje",
                  month: "Mês",
                  week: "Semana",
                  day: "Dia",
                  agenda: "Agenda",
                  date: "Data",
                  time: "Hora",
                  event: "Evento",
                  noEventsInRange: "Nenhum serviço agendado neste período.",
                  showMore: total => `+ ${total} mais`,
                }}
                eventPropGetter={eventStyleGetter}
              />
            </CalendarErrorBoundary>
          )}
        </div>
      ) : (
        <div className="card">
        {loading ? (
          <div className="empty-state"><p>Carregando...</p></div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <p>{search || filter !== 'Todos' ? 'Nenhum resultado' : 'Nenhuma ordem cadastrada'}</p>
            {!isTecnico && <p>Clique em "Nova OS" para registrar</p>}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="mobile-card-table">
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Cliente</th>
                  <th>Data / Hora</th>
                  <th>Valor</th>
                  {!isTecnico && <th>Responsável</th>}
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const remainder = Math.max(0, (Number(o.price) || 0) - (Number(o.down_payment) || 0));
                  return (
                    <tr key={o.id}>
                      <td data-label="Serviço">
                        <span className="td-strong">{o.description || o.service}</span>
                        {Number(o.down_payment) > 0 && (
                          <div style={{ fontSize: 11, color: '#16a34a', marginTop: 2 }}>
                            Sinal: {FMT_BRL.format(Number(o.down_payment))} · Falta: {FMT_BRL.format(remainder)}
                          </div>
                        )}
                      </td>
                      <td data-label="Cliente">{getClientName(o.client_id)}</td>
                      <td data-label="Data / Hora" className="td-muted">{FMT_DT(o.scheduled_for)}</td>
                      <td data-label="Valor"><strong>{FMT_BRL.format(Number(o.price) || 0)}</strong></td>
                      {!isTecnico && (
                        <td data-label="Responsável">
                          <span style={{ fontSize: 12.5, fontWeight: 500 }}>
                            {getCollaboratorName(o.assigned_to)}
                          </span>
                        </td>
                      )}
                      <td data-label="Status">
                        <select
                          className="field-input"
                          style={{ padding: '4px 28px 4px 8px', fontSize: 12, width: 'auto' }}
                          value={o.status || 'Agendado'}
                          onChange={e => handleStatus(o.id, e.target.value)}
                        >
                          {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                      <td data-label="Ações">
                        <div style={{ display: 'flex', gap: 4 }}>
                          {(() => {
                            const address = clients.find(c => c.id === o.client_id)?.address;
                            if (address && address.trim() !== '') {
                              return (
                                <a
                                  href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-ghost"
                                  title="Ver Rota no Maps"
                                  style={{ color: 'var(--green-600)' }}
                                >
                                  <MapPin size={14} />
                                </a>
                              );
                            }
                            return null;
                          })()}
                          {o.status === 'Finalizado' && (
                            <button
                              className="btn btn-ghost"
                              title="Gerar Laudo Técnico"
                              style={{ color: 'var(--green-600)' }}
                              onClick={() => setReportOrder(o)}
                            >
                              <FileText size={14} />
                            </button>
                          )}
                          <button
                            className="btn btn-ghost"
                            title="Editar OS"
                            style={{ color: 'var(--blue-600)' }}
                            onClick={() => openEdit(o)}
                          >
                            <Pencil size={14} />
                          </button>
                          {!isTecnico && (
                            <button
                              className="btn btn-ghost"
                              style={{ color: 'var(--red-500)' }}
                              title="Excluir OS"
                              onClick={() => handleDelete(o.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '10px 0', borderTop: '1px solid var(--gray-200)' }}>
                <span style={{ fontSize: 12, color: 'var(--gray-505)' }}>Exibindo {(page - 1) * 50 + 1} a {Math.min(page * 50, totalItems)} de {totalItems} serviços</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button 
                    className="btn btn-secondary" 
                    disabled={page === 1} 
                    onClick={() => { setPage(p => p - 1); load(page - 1, search, filter); }}
                  >Anterior</button>
                  <button 
                    className="btn btn-secondary" 
                    disabled={page >= totalPages} 
                    onClick={() => { setPage(p => p + 1); load(page + 1, search, filter); }}
                  >Próxima</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Modal — Nova OS */}
      {showAdd && (
        <OSModal
          title="Nova Ordem de Serviço"
          sub="Preencha os dados do agendamento"
          form={form}
          setForm={setForm}
          clients={clients}
          collaborators={collaborators}
          isTecnico={isTecnico}
          saving={saving}
          onSubmit={handleCreate}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Modal — Editar OS */}
      {editOrder && (
        <OSModal
          title={`Editar OS — ${editOrder.description || editOrder.service || ''}`}
          sub="Altere os dados da ordem de serviço"
          form={editForm}
          setForm={setEditForm}
          clients={clients}
          collaborators={collaborators}
          isTecnico={isTecnico}
          saving={saving}
          onSubmit={handleEdit}
          onClose={() => setEditOrder(null)}
          editOrder={editOrder}
          onCopyLink={handleCopyLink}
        />
      )}

      {/* Modal — Laudo Técnico */}
      {reportOrder && (
        <ReportModal
          order={reportOrder}
          clientName={getClientName(reportOrder.client_id)}
          companyName={companyConfig.companyName || 'LimpeJá'}
          onClose={() => setReportOrder(null)}
        />
      )}
    </div>
  );
}
