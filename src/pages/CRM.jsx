import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getClients, addClient, updateClient, deleteClient, getClientOrders } from '../api';
import { UserPlus, Trash2, Phone, MapPin, Calendar, Search, X, Pencil, History, Star, CheckCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

const FMT_DATE = (str) => {
  if (!str) return null;
  const d = new Date(str.includes('T') ? str : str + 'T00:00:00');
  return isNaN(d) ? null : d.toLocaleDateString('pt-BR');
};
const FMT_BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const BLANK = { name: '', phone: '', address: '', last_service_date: '', tipo: 'cliente' };

// Componente do formulário isolado
function ClientFormModal({ title, sub, form, setForm, saving, onSubmit, onClose }) {
  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 999999 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ zIndex: 9999 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{title}</div>
            <div className="modal-sub">{sub}</div>
          </div>
          <button className="btn btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={onSubmit}>
          {/* Tipo: Lead ou Cliente */}
          <div className="field" style={{ marginBottom: 16 }}>
            <label className="field-label">Tipo de Contato</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                {
                  value: 'lead', label: 'Lead', sub: 'Nunca fez serviço',
                  color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd',
                  icon: <Star size={14} />
                },
                {
                  value: 'cliente', label: 'Cliente', sub: 'Já fez serviço',
                  color: '#16a34a', bg: '#f0fdf4', border: '#86efac',
                  icon: <CheckCircle size={14} />
                },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, tipo: opt.value })}
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                    border: `2px solid ${form.tipo === opt.value ? opt.border : 'var(--gray-200)'}`,
                    background: form.tipo === opt.value ? opt.bg : 'white',
                    color: form.tipo === opt.value ? opt.color : 'var(--gray-500)',
                    transition: 'all 0.15s',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13.5 }}>{opt.icon}{opt.label}</div>
                  <div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 2 }}>{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="form-grid form-grid-2">
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label className="field-label">Nome Completo *</label>
              <input
                className="field-input"
                placeholder="Ex: João da Silva"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="field">
              <label className="field-label">Telefone / WhatsApp *</label>
              <input
                className="field-input"
                placeholder="(11) 99999-9999"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>
            {form.tipo === 'cliente' && (
              <div className="field">
                <label className="field-label">Data do Último Serviço</label>
                <input
                  type="date"
                  className="field-input"
                  value={form.last_service_date}
                  onChange={e => setForm({ ...form, last_service_date: e.target.value })}
                />
              </div>
            )}
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label className="field-label">Endereço</label>
              <input
                className="field-input"
                placeholder="Rua, número, bairro, cidade"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// Componente de histórico
function HistoryModal({ client, orders, onClose }) {
  const statusMap = { 'Finalizado': 'badge-success', 'Agendado': 'badge-info', 'Em Andamento': 'badge-warning' };
  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 999999 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Histórico: {client.name}</div>
            <div className="modal-sub">{orders.length} serviço{orders.length !== 1 ? 's' : ''} registrado{orders.length !== 1 ? 's' : ''}</div>
          </div>
          <button className="btn btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        {orders.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 0' }}>
            <p>Nenhuma OS registrada para este cliente</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="mobile-card-table">
              <thead>
                <tr><th>Serviço</th><th>Data</th><th>Valor</th><th>Status</th></tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const d = new Date(o.scheduled_for);
                  const dateStr = isNaN(d) ? FMT_DATE(o.created_at) : d.toLocaleDateString('pt-BR');
                  return (
                    <tr key={o.id}>
                      <td data-label="Serviço"><span className="td-strong">{o.description || o.service || '—'}</span></td>
                      <td data-label="Data" className="td-muted">{dateStr || '—'}</td>
                      <td data-label="Valor"><strong>{FMT_BRL.format(Number(o.price) || 0)}</strong></td>
                      <td data-label="Status"><span className={`badge ${statusMap[o.status] ?? 'badge-neutral'}`}>{o.status || '—'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Componente principal do CRM
export default function CRM() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('todos');
  const [loading, setLoading] = useState(true);

  // Paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [showAdd, setShowAdd] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [historyClient, setHistoryClient] = useState(null);
  const [historyOrders, setHistoryOrders] = useState([]);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(BLANK);

  const load = async (currentPage = page, currentSearch = search, currentTipo = filterTipo) => {
    setLoading(true);
    try {
      const res = await getClients(currentPage, 50, currentSearch, currentTipo);
      if (res && res.data) {
        setClients(res.data);
        setTotalPages(res.totalPages);
        setTotalItems(res.total);
      } else {
        // Fallback for legacy format
        setClients(res || []);
        setTotalPages(1);
        setTotalItems((res || []).length);
      }
    } catch {
      setClients([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1);
      load(1, search, filterTipo);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, filterTipo]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addClient(form);
      setForm(BLANK);
      setShowAdd(false);
      toast(`${form.tipo === 'lead' ? 'Lead' : 'Cliente'} "${form.name}" cadastrado com sucesso!`, 'success');
      load();
    } catch { toast('Erro ao cadastrar.', 'error'); }
    setSaving(false);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateClient(editClient.id, form);
      setEditClient(null);
      toast('Cliente atualizado!', 'success');
      load();
    } catch { toast('Erro ao salvar alterações.', 'error'); }
    setSaving(false);
  };

  const openEdit = (client) => {
    setForm({ name: client.name, phone: client.phone || '', address: client.address || '', last_service_date: client.last_service_date || '', tipo: client.tipo || 'cliente' });
    setEditClient(client);
  };

  const openHistory = async (client) => {
    setHistoryClient(client);
    const orders = await getClientOrders(client.id).catch(() => []);
    setHistoryOrders([...orders].reverse());
  };

  const handleDelete = async (id, name) => {
    const ok = await confirm({
      title: 'Excluir Contato',
      message: `Tem certeza que deseja excluir "${name}"? Esta ação não pode ser desfeita.`,
      confirmText: 'Sim, Excluir',
      cancelText: 'Cancelar',
      type: 'danger',
    });
    if (ok) {
      try { await deleteClient(id); toast(`"${name}" removido.`, 'warning'); load(); }
      catch { toast('Erro ao excluir.', 'error'); }
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-header" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Filtros de tipo */}
            {[
              { value: 'todos', label: 'Todos' },
              { value: 'cliente', label: 'Clientes' },
              { value: 'lead', label: 'Leads' },
            ].map(f => (
              <button key={f.value} onClick={() => setFilterTipo(f.value)} style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12.5, fontWeight: 500,
                background: filterTipo === f.value ? 'var(--blue-600)' : 'var(--gray-100)',
                color: filterTipo === f.value ? 'white' : 'var(--gray-600)',
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {f.label}
              </button>
            ))}
          </div>

          <div className="action-bar">
            <div className="search-input-wrapper" style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input className="field-input search-input" style={{ paddingLeft: 32, width: 220 }} placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={() => { setForm(BLANK); setShowAdd(true); }}>
              <UserPlus size={15} /> <span className="hide-text-mobile">Novo Contato</span>
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Carregando...</p></div>
        ) : clients.length === 0 ? (
          <div className="empty-state">
            <p>{search || filterTipo !== 'todos' ? 'Nenhum resultado encontrado' : 'Nenhum contato cadastrado'}</p>
            {!search && filterTipo === 'todos' && <p>Clique em "Novo Contato" para começar</p>}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="mobile-card-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Telefone</th>
                  <th>Endereço</th>
                  <th>Último Serviço</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clients.map(client => {
                  const tipo = client.tipo || 'cliente';
                  return (
                    <tr key={client.id}>
                      <td data-label="Nome">
                        <button onClick={() => openHistory(client)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                          <span className="td-strong" style={{ color: 'var(--blue-600)', textDecoration: 'underline', textUnderlineOffset: 3 }}>{client.name}</span>
                        </button>
                      </td>
                      <td data-label="Tipo">
                        {tipo === 'lead'
                          ? <span className="badge" style={{ background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: 4 }}><Star size={11} /> Lead</span>
                          : <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={11} /> Cliente</span>}
                      </td>
                      <td data-label="Telefone">
                        {client.phone
                          ? <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Phone size={13} color="var(--gray-400)" />{client.phone}</span>
                          : <span className="td-muted">—</span>}
                      </td>
                      <td data-label="Endereço">
                        {client.address
                          ? <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><MapPin size={13} color="var(--gray-400)" />{client.address}</span>
                          : <span className="td-muted">—</span>}
                      </td>
                      <td data-label="Último Serviço">
                        {tipo === 'lead'
                          ? <span className="badge" style={{ background: '#f5f3ff', color: '#7c3aed' }}>Aguardando 1º serviço</span>
                          : client.last_service_date
                            ? <span className="badge badge-warning"><Calendar size={11} />{FMT_DATE(client.last_service_date)}</span>
                            : <span className="td-muted">Sem registro</span>}
                      </td>
                      <td data-label="Ações">
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost" title="Ver histórico" onClick={() => openHistory(client)} style={{ color: 'var(--blue-600)' }}><History size={14} /></button>
                          <button className="btn btn-ghost" title="Editar" onClick={() => openEdit(client)} style={{ color: 'var(--gray-600)' }}><Pencil size={14} /></button>
                          <button className="btn btn-ghost" title="Excluir" style={{ color: 'var(--red-500)' }} onClick={() => handleDelete(client.id, client.name)}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '10px 0', borderTop: '1px solid var(--gray-200)' }}>
                <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>Exibindo {(page - 1) * 50 + 1} a {Math.min(page * 50, totalItems)} de {totalItems} contatos</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button 
                    className="btn btn-secondary" 
                    disabled={page === 1} 
                    onClick={() => { setPage(p => p - 1); load(page - 1, search, filterTipo); }}
                  >Anterior</button>
                  <button 
                    className="btn btn-secondary" 
                    disabled={page >= totalPages} 
                    onClick={() => { setPage(p => p + 1); load(page + 1, search, filterTipo); }}
                  >Próxima</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showAdd && (
        <ClientFormModal
          title="Novo Contato"
          sub="Cadastre um lead ou cliente existente"
          form={form}
          setForm={setForm}
          saving={saving}
          onSubmit={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}

      {editClient && (
        <ClientFormModal
          title={`Editar: ${editClient.name}`}
          sub="Atualize os dados do contato"
          form={form}
          setForm={setForm}
          saving={saving}
          onSubmit={handleEdit}
          onClose={() => setEditClient(null)}
        />
      )}

      {historyClient && (
        <HistoryModal
          client={historyClient}
          orders={historyOrders}
          onClose={() => setHistoryClient(null)}
        />
      )}
    </div>
  );
}
