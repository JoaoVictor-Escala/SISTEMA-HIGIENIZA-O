import React, { useEffect, useState } from 'react';
import { getInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } from '../api';
import { Plus, Trash2, Package, AlertTriangle, X, Minus, Edit2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

const UNITS = ['unidade', 'litro', 'ml', 'kg', 'g', 'frasco', 'galão', 'par', 'caixa'];
const FMT_BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Estoque() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [adjusting, setAdjusting] = useState({});
  const [form, setForm] = useState({ name: '', unit: 'unidade', quantity: '', min_quantity: '', cost: '' });

  const load = async () => {
    setLoading(true);
    setItems(await getInventory().catch(() => []));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const lowStock = items.filter(i => Number(i.min_quantity) > 0 && Number(i.quantity) <= Number(i.min_quantity));

  const openEdit = (item) => {
    setForm({
      name: item.name,
      unit: item.unit || 'unidade',
      quantity: item.quantity,
      min_quantity: item.min_quantity || '',
      cost: item.cost || ''
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await updateInventoryItem(editingId, form);
        toast(`"${form.name}" atualizado!`, 'success');
      } else {
        await addInventoryItem(form);
        toast(`"${form.name}" adicionado ao estoque!`, 'success');
      }
      setForm({ name: '', unit: 'unidade', quantity: '', min_quantity: '', cost: '' });
      setEditingId(null);
      setShowModal(false);
    } catch { toast('Erro ao salvar produto.', 'error'); }
    setSaving(false);
    load();
  };

  const handleDelete = async (id, name) => {
    const ok = await confirm({
      title: 'Excluir Produto',
      message: `Tem certeza que deseja excluir "${name}" do estoque? Esta ação não pode ser desfeita.`,
      confirmText: 'Sim, Excluir',
      cancelText: 'Cancelar',
      type: 'danger',
    });
    if (ok) {
      try { await deleteInventoryItem(id); toast(`"${name}" removido.`, 'warning'); load(); }
      catch { toast('Erro ao excluir.', 'error'); }
    }
  };

  const quickAdjust = async (id, name, currentQty, delta) => {
    if (adjusting[id]) return;
    setAdjusting(a => ({ ...a, [id]: true }));
    const newQty = Math.max(0, Number(currentQty) + delta);
    try {
      await updateInventoryItem(id, { quantity: newQty });
      if (delta > 0) toast(`Entrada de 1 unidade em "${name}"`, 'info');
      else toast(`Saída de 1 unidade de "${name}"`, 'info');
    } catch { toast('Erro ao ajustar estoque.', 'error'); }
    setAdjusting(a => ({ ...a, [id]: false }));
    load();
  };

  return (
    <div>
      {lowStock.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={16} color="#d97706" />
          <span style={{ fontSize: 13.5, color: '#92400e', fontWeight: 500 }}>
            Estoque baixo: <strong>{lowStock.map(i => i.name).join(', ')}</strong>
          </span>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-header" style={{ marginBottom: 0 }}>
          <div>
            <div className="section-title">Controle de Estoque</div>
            <div className="section-sub">{items.length} produto{items.length !== 1 ? 's' : ''}</div>
          </div>
          <button className="btn btn-primary" onClick={() => {
            setForm({ name: '', unit: 'unidade', quantity: '', min_quantity: '', cost: '' });
            setEditingId(null);
            setShowModal(true);
          }}>
            <Plus size={15} /> Novo Produto
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Carregando...</p></div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum produto cadastrado</p>
            <p>Clique em "Novo Produto" para controlar seu estoque</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="mobile-card-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Unidade</th>
                  <th style={{ textAlign: 'center' }}>Quantidade</th>
                  <th>Mínimo</th>
                  <th>Preço Unit.</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const isLow = Number(item.min_quantity) > 0 && Number(item.quantity) <= Number(item.min_quantity);
                  const busy = adjusting[item.id];
                  return (
                    <tr key={item.id}>
                      <td data-label="Produto">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Package size={14} color="var(--gray-400)" />
                          <span className="td-strong">{item.name}</span>
                        </div>
                      </td>
                      <td data-label="Unidade" className="td-muted">{item.unit}</td>
                      <td data-label="Quantidade">
                        {/* Stepper +/- */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          <button
                            onClick={() => quickAdjust(item.id, item.name, item.quantity, -1)}
                            disabled={busy || Number(item.quantity) <= 0}
                            title="Dar saída de 1 unidade"
                            style={{ width: 26, height: 26, border: '1px solid #fecaca', borderRadius: 6, background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: busy ? 0.5 : 1 }}>
                            <Minus size={12} />
                          </button>
                          <span style={{ width: 36, textAlign: 'center', fontWeight: 700, fontSize: 15, color: isLow ? '#d97706' : 'var(--gray-900)' }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => quickAdjust(item.id, item.name, item.quantity, +1)}
                            disabled={busy}
                            title="Dar entrada de 1 unidade"
                            style={{ width: 26, height: 26, border: '1px solid #bbf7d0', borderRadius: 6, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: busy ? 0.5 : 1 }}>
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>
                      <td data-label="Mínimo" className="td-muted">{item.min_quantity || '—'}</td>
                      <td data-label="Preço Unit.">{item.cost ? FMT_BRL.format(Number(item.cost)) : '—'}</td>
                      <td data-label="Status">
                        {isLow
                          ? <span className="badge badge-warning">Estoque Baixo</span>
                          : <span className="badge badge-success">Normal</span>}
                      </td>
                      <td data-label="Ação">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button className="btn btn-ghost" style={{ color: 'var(--blue-500)', padding: 6 }} onClick={() => openEdit(item)} title="Editar Produto">
                            <Edit2 size={14} />
                          </button>
                          <button className="btn btn-ghost" style={{ color: 'var(--red-500)', padding: 6 }} onClick={() => handleDelete(item.id, item.name)} title="Excluir Produto">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <div className="modal-title">{editingId ? 'Editar Produto' : 'Novo Produto'}</div>
                <div className="modal-sub">{editingId ? 'Atualizar os dados do item' : 'Adicionar item ao controle de estoque'}</div>
              </div>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-grid form-grid-2">
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label className="field-label">Nome do Produto *</label>
                  <input className="field-input" placeholder="Ex: Shampoo para estofados" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="field">
                  <label className="field-label">Unidade</label>
                  <select className="field-input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Custo Unitário (R$)</label>
                  <input type="number" step="0.01" min="0" className="field-input" placeholder="0,00" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field-label">Quantidade Atual *</label>
                  <input type="number" min="0" className="field-input" placeholder="0" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required />
                </div>
                <div className="field">
                  <label className="field-label">Quantidade Mínima</label>
                  <input type="number" min="0" className="field-input" placeholder="Alerta abaixo de..." value={form.min_quantity} onChange={e => setForm({ ...form, min_quantity: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Produto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
