import React, { useEffect, useState } from 'react';
import { getTransactions, addTransaction, deleteTransaction } from '../api';
import { Plus, Trash2, X, TrendingUp, TrendingDown, DollarSign, BarChart2, FileText, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';
import { generateFinanceiroPDF } from '../utils/generatePDF';

const FMT_BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const FMT_DATE = (s) => {
  if (!s) return '—';
  const d = new Date(s.includes('T') ? s : s + 'T00:00:00');
  return isNaN(d) ? '—' : d.toLocaleDateString('pt-BR');
};
const pct = (val, base) => base === 0 ? '—' : (val / base * 100).toFixed(1) + '%';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const CATEGORIAS_RECEITA = ['Serviço de Higienização', 'Impermeabilização', 'Orçamento Aprovado', 'Outro'];
const CATEGORIAS_DESPESA = ['Materiais/Insumos', 'Combustível', 'Equipamentos', 'Funcionário', 'Aluguel', 'Outro'];

// DRE category groups
const CUSTOS_VARIAVEIS = ['Materiais/Insumos', 'Combustível', 'Equipamentos'];
const DESPESAS_FIXAS   = ['Funcionário', 'Aluguel', 'Outro'];

// Componente de Linha do DRE
function DRERow({ label, value, base, indent = 0, bold = false, color, separator, result, negative, expandable, children, defaultExpanded = false }) {
  const [open, setOpen] = useState(defaultExpanded);
  const margin = base != null && base !== 0 ? Math.abs(value / base * 100).toFixed(1) : null;

  if (separator) return (
    <div style={{ borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />
  );

  return (
    <div>
      <div
        onClick={expandable ? () => setOpen(o => !o) : undefined}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: `${bold || result ? 12 : 8}px ${16 + indent * 20}px`,
          borderRadius: 8,
          background: result ? (value >= 0 ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)') : 'transparent',
          cursor: expandable ? 'pointer' : 'default',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          {expandable && (
            <span style={{ color: '#94a3b8', flexShrink: 0 }}>
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          )}
          <span style={{
            fontSize: bold || result ? 14 : 13,
            fontWeight: bold || result ? 700 : 400,
            color: color || (indent > 0 ? '#64748b' : '#1e293b'),
          }}>
            {label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          {margin !== null && !result && (
            <span style={{ fontSize: 11.5, color: '#94a3b8', minWidth: 40, textAlign: 'right' }}>
              {negative ? '-' : ''}{margin}%
            </span>
          )}
          <span style={{
            fontSize: bold || result ? 15 : 13.5,
            fontWeight: bold || result ? 700 : 500,
            color: color || (value < 0 || negative ? '#dc2626' : (result ? (value >= 0 ? '#16a34a' : '#dc2626') : '#1e293b')),
            minWidth: 110,
            textAlign: 'right',
          }}>
            {negative ? `(${FMT_BRL.format(Math.abs(value))})` : FMT_BRL.format(value)}
          </span>
        </div>
      </div>
      {expandable && open && children && (
        <div style={{ borderLeft: '2px solid #e2e8f0', marginLeft: 32, paddingLeft: 4 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// Componente de Visualização do DRE
function DREView({ txs, filterMonth, filterYear, allTime, isExporting, setIsExporting }) {
  const filtered = txs.filter(t => {
    if (allTime) return true;
    const dateStr = t.date || t.created_at?.slice(0, 10);
    if (!dateStr) return false;
    const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
    return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
  });

  const receitas     = filtered.filter(t => t.type === 'receita');
  const despesas     = filtered.filter(t => t.type === 'despesa');

  const receitaBruta = receitas.reduce((a, t) => a + Number(t.amount || 0), 0);

  // Agrupa receitas por categoria
  const receitasByCategory = CATEGORIAS_RECEITA.reduce((acc, cat) => {
    acc[cat] = receitas.filter(t => t.category === cat).reduce((a, t) => a + Number(t.amount || 0), 0);
    return acc;
  }, {});
  // Outras receitas
  receitasByCategory['Outros'] = receitas
    .filter(t => !CATEGORIAS_RECEITA.includes(t.category))
    .reduce((a, t) => a + Number(t.amount || 0), 0);

  // Custos variáveis
  const custosVarByCategory = CUSTOS_VARIAVEIS.reduce((acc, cat) => {
    acc[cat] = despesas.filter(t => t.category === cat).reduce((a, t) => a + Number(t.amount || 0), 0);
    return acc;
  }, {});
  const totalCustosVar = Object.values(custosVarByCategory).reduce((a, v) => a + v, 0);
  const lucroBruto = receitaBruta - totalCustosVar;

  // Despesas fixas
  const despesasFixByCategory = DESPESAS_FIXAS.reduce((acc, cat) => {
    acc[cat] = despesas.filter(t => t.category === cat).reduce((a, t) => a + Number(t.amount || 0), 0);
    return acc;
  }, {});
  // Outras despesas
  const allKnownDespCats = [...CUSTOS_VARIAVEIS, ...DESPESAS_FIXAS];
  despesasFixByCategory['Outros'] = despesas
    .filter(t => !allKnownDespCats.includes(t.category))
    .reduce((a, t) => a + Number(t.amount || 0), 0);
  const totalDespesasFix = Object.values(despesasFixByCategory).reduce((a, v) => a + v, 0);
  const lucroOperacional = lucroBruto - totalDespesasFix;
  const lucroLiquido = lucroOperacional;

  const periodo = allTime ? 'Todos os períodos' : `${MESES[filterMonth]} ${filterYear}`;

  return (
    <div>
      {/* Header DRE */}
      <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
              Demonstrativo do Resultado do Exercício
            </div>
            <div style={{ color: 'white', fontSize: 22, fontWeight: 800 }}>DRE — {periodo}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <button
              onClick={() => {
                setIsExporting(true);
                setTimeout(() => {
                  generateFinanceiroPDF({ txs, filterMonth, filterYear, allTime });
                  setIsExporting(false);
                }, 50);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, color: '#60a5fa', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: isExporting ? 0.7 : 1 }}
            >
              <Download size={14} /> {isExporting ? 'Gerando...' : 'Exportar PDF'}
            </button>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}>Lucro Líquido</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: lucroLiquido >= 0 ? '#4ade80' : '#f87171' }}>
                {FMT_BRL.format(lucroLiquido)}
              </div>
              {receitaBruta > 0 && (
                <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                  Margem {pct(lucroLiquido, receitaBruta)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mini summary bar */}
        {receitaBruta > 0 && (
          <div className="finance-stats-grid">
            {[
              { label: 'Receita Bruta', value: receitaBruta, color: '#3b82f6' },
              { label: 'Lucro Bruto', value: lucroBruto, color: '#8b5cf6' },
              { label: 'Margem Bruta', value: null, pctVal: pct(lucroBruto, receitaBruta), color: '#a78bfa' },
              { label: 'Lucro Líquido', value: lucroLiquido, color: lucroLiquido >= 0 ? '#4ade80' : '#f87171' },
            ].map(item => (
              <div key={item.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ color: '#64748b', fontSize: 10.5, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</div>
                <div style={{ color: item.color, fontSize: 16, fontWeight: 700 }}>
                  {item.pctVal ?? FMT_BRL.format(item.value)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DRE Body */}
      <div className="card" style={{ padding: '8px 0' }}>
        {/* RECEITA BRUTA */}
        <div style={{ padding: '8px 16px 4px', color: '#94a3b8', fontSize: 10.5, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>
          Receitas
        </div>
        <DRERow
          label="(+) Receita Bruta de Serviços"
          value={receitaBruta}
          bold
          color="#2563eb"
          expandable={Object.values(receitasByCategory).some(v => v > 0)}
          defaultExpanded
        >
          {CATEGORIAS_RECEITA.map(cat => receitasByCategory[cat] > 0 && (
            <DRERow key={cat} label={cat} value={receitasByCategory[cat]} indent={1} base={receitaBruta} />
          ))}
        </DRERow>

        <DRERow separator />

        {/* CUSTOS VARIÁVEIS */}
        <div style={{ padding: '8px 16px 4px', color: '#94a3b8', fontSize: 10.5, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>
          Custos Variáveis (CMV)
        </div>
        <DRERow
          label="(−) Custos dos Serviços Prestados"
          value={totalCustosVar}
          bold negative
          expandable={Object.values(custosVarByCategory).some(v => v > 0)}
          defaultExpanded
        >
          {CUSTOS_VARIAVEIS.map(cat => custosVarByCategory[cat] > 0 && (
            <DRERow key={cat} label={cat} value={custosVarByCategory[cat]} indent={1} base={receitaBruta} negative />
          ))}
        </DRERow>

        <DRERow separator />

        {/* LUCRO BRUTO */}
        <DRERow label="(=) Lucro Bruto" value={lucroBruto} result base={receitaBruta}
          color={lucroBruto >= 0 ? '#16a34a' : '#dc2626'}
        />
        {receitaBruta > 0 && (
          <div style={{ padding: '2px 16px 8px', textAlign: 'right', fontSize: 12, color: '#94a3b8' }}>
            Margem Bruta: <strong style={{ color: lucroBruto >= 0 ? '#16a34a' : '#dc2626' }}>{pct(lucroBruto, receitaBruta)}</strong>
          </div>
        )}

        <DRERow separator />

        {/* DESPESAS FIXAS */}
        <div style={{ padding: '8px 16px 4px', color: '#94a3b8', fontSize: 10.5, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>
          Despesas Operacionais
        </div>
        <DRERow
          label="(−) Despesas Operacionais Fixas"
          value={totalDespesasFix}
          bold negative
          expandable={Object.values(despesasFixByCategory).some(v => v > 0)}
          defaultExpanded
        >
          {DESPESAS_FIXAS.map(cat => despesasFixByCategory[cat] > 0 && (
            <DRERow key={cat} label={cat} value={despesasFixByCategory[cat]} indent={1} base={receitaBruta} negative />
          ))}
        </DRERow>

        <DRERow separator />

        {/* LUCRO OPERACIONAL = EBITDA simplificado */}
        <DRERow label="(=) Lucro Operacional (EBITDA)" value={lucroOperacional} result base={receitaBruta}
          color={lucroOperacional >= 0 ? '#16a34a' : '#dc2626'}
        />

        <DRERow separator />

        {/* LUCRO LÍQUIDO */}
        <div style={{ padding: '4px 16px' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 16px',
            background: lucroLiquido >= 0 ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
            border: `1.5px solid ${lucroLiquido >= 0 ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.25)'}`,
            borderRadius: 12,
          }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: lucroLiquido >= 0 ? '#16a34a' : '#dc2626' }}>
              (=) LUCRO LÍQUIDO DO EXERCÍCIO
            </span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, fontSize: 20, color: lucroLiquido >= 0 ? '#16a34a' : '#dc2626' }}>
                {FMT_BRL.format(lucroLiquido)}
              </div>
              {receitaBruta > 0 && (
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  Margem Líquida: {pct(lucroLiquido, receitaBruta)}
                </div>
              )}
            </div>
          </div>
        </div>

        {receitaBruta === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
            <BarChart2 size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p style={{ fontSize: 14 }}>Nenhuma transação no período selecionado.</p>
            <p style={{ fontSize: 13 }}>Adicione lançamentos na aba <strong>Lançamentos</strong>.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente Principal Financeiro
export default function Financeiro() {
  
  const { confirm } = useConfirm();
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [typeFilter, setTypeFilter] = useState('todos');
  const [activeTab, setActiveTab] = useState('lancamentos'); // 'lancamentos' | 'dre'

  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth());
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [allTime, setAllTime] = useState(false);

  const [form, setForm] = useState({ type: 'receita', description: '', amount: '', category: 'Serviço de Higienização', date: '' });

  const load = async () => {
    setLoading(true);
    setTxs(await getTransactions().catch(() => []));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = txs.filter(t => {
    const matchType = typeFilter === 'todos' ? true : t.type === typeFilter;
    if (!matchType) return false;
    if (allTime) return true;
    const dateStr = t.date || t.created_at?.slice(0, 10);
    if (!dateStr) return false;
    const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
    return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
  }).sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));

  const receitas = filtered.filter(t => t.type === 'receita').reduce((a, t) => a + Number(t.amount || 0), 0);
  const despesas = filtered.filter(t => t.type === 'despesa').reduce((a, t) => a + Number(t.amount || 0), 0);
  const saldo = receitas - despesas;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    await addTransaction(form);
    setForm({ type: 'receita', description: '', amount: '', category: 'Serviço de Higienização', date: '' });
    setShowModal(false);
    setSaving(false);
    load();
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Excluir Transação',
      message: 'Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.',
      confirmText: 'Sim, Excluir',
      cancelText: 'Cancelar',
      type: 'danger',
    });
    if (ok) { await deleteTransaction(id); load(); }
  };

  const handleTypeChange = (type) => {
    setForm({ ...form, type, category: type === 'receita' ? 'Serviço de Higienização' : 'Materiais/Insumos' });
  };

  const years = [...new Set(txs.map(t => new Date((t.date || t.created_at || '').slice(0, 10) + 'T00:00:00').getFullYear()).filter(y => !isNaN(y)))].sort((a, b) => b - a);
  if (!years.includes(now.getFullYear())) years.unshift(now.getFullYear());

  return (
    <div>
      {/* Period filter + Tab switcher */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--gray-600)' }}>Período:</label>
            <select className="field-input" style={{ width: 'auto', padding: '6px 28px 6px 10px' }} disabled={allTime} value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}>
              {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select className="field-input" style={{ width: 'auto', padding: '6px 28px 6px 10px' }} disabled={allTime} value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}>
              {years.map(y => <option key={y}>{y}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--gray-600)', cursor: 'pointer' }}>
              <input type="checkbox" checked={allTime} onChange={e => setAllTime(e.target.checked)} />
              Todos os períodos
            </label>
          </div>

          {/* Tab switcher */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3, gap: 2 }}>
            {[
              { key: 'lancamentos', label: 'Lançamentos', icon: <FileText size={14} /> },
              { key: 'dre', label: 'DRE', icon: <BarChart2 size={14} /> },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                  background: activeTab === tab.key ? 'white' : 'transparent',
                  color: activeTab === tab.key ? '#1e293b' : '#94a3b8',
                  boxShadow: activeTab === tab.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'dre' ? (
        <DREView txs={txs} filterMonth={filterMonth} filterYear={filterYear} allTime={allTime} isExporting={isExporting} setIsExporting={setIsExporting} />
      ) : (
        <>
          {/* KPI Row */}
          <div className="finance-kpi-grid">
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-label">Receitas {allTime ? '' : `— ${MESES[filterMonth]}`}</span>
                <div className="kpi-icon" style={{ background: '#f0fdf4' }}><TrendingUp size={16} color="#16a34a" /></div>
              </div>
              <div className="kpi-value" style={{ color: '#16a34a' }}>{FMT_BRL.format(receitas)}</div>
              <div className="kpi-sub">{filtered.filter(t => t.type === 'receita').length} lançamentos</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-label">Despesas {allTime ? '' : `— ${MESES[filterMonth]}`}</span>
                <div className="kpi-icon" style={{ background: '#fef2f2' }}><TrendingDown size={16} color="#dc2626" /></div>
              </div>
              <div className="kpi-value" style={{ color: '#dc2626' }}>{FMT_BRL.format(despesas)}</div>
              <div className="kpi-sub">{filtered.filter(t => t.type === 'despesa').length} lançamentos</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-label">Saldo</span>
                <div className="kpi-icon" style={{ background: saldo >= 0 ? '#eff6ff' : '#fef2f2' }}>
                  <DollarSign size={16} color={saldo >= 0 ? '#2563eb' : '#dc2626'} />
                </div>
              </div>
              <div className="kpi-value" style={{ color: saldo >= 0 ? '#2563eb' : '#dc2626' }}>{FMT_BRL.format(saldo)}</div>
              <div className="kpi-sub">{saldo >= 0 ? 'Positivo' : 'Negativo'}</div>
            </div>
          </div>

          {/* Type filter + Export button */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['todos', 'receita', 'despesa'].map(f => (
                <button key={f} onClick={() => setTypeFilter(f)}
                  style={{ padding: '5px 12px', fontSize: 12.5, fontWeight: 500, background: typeFilter === f ? 'var(--blue-600)' : 'var(--gray-100)', color: typeFilter === f ? 'white' : 'var(--gray-600)', border: 'none', borderRadius: 20, cursor: 'pointer' }}>
                  {f === 'todos' ? 'Todos' : f === 'receita' ? 'Receitas' : 'Despesas'}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setIsExporting(true);
                setTimeout(() => {
                  generateFinanceiroPDF({ txs, filterMonth, filterYear, allTime });
                  setIsExporting(false);
                }, 50);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: isExporting ? 0.7 : 1 }}
            >
              <Download size={13} /> {isExporting ? 'Gerando...' : 'Exportar PDF'}
            </button>
          </div>

          {/* Tabela lançamentos */}
          <div className="card">
            <div className="section-header">
              <div>
                <div className="section-title">Lançamentos</div>
                <div className="section-sub">{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</div>
              </div>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <Plus size={15} /> Novo Lançamento
              </button>
            </div>

            {loading ? (
              <div className="empty-state"><p>Carregando...</p></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <p>Nenhum lançamento {allTime ? '' : `em ${MESES[filterMonth]} ${filterYear}`}</p>
                <p>Clique em "Novo Lançamento" para registrar</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="mobile-card-table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th>Data</th>
                      <th>Valor</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(tx => (
                      <tr key={tx.id}>
                        <td data-label="Tipo">
                          {tx.type === 'receita'
                            ? <span className="badge badge-success"><TrendingUp size={10} />Receita</span>
                            : <span className="badge badge-danger"><TrendingDown size={10} />Despesa</span>}
                        </td>
                        <td data-label="Descrição"><span className="td-strong">{tx.description}</span></td>
                        <td data-label="Categoria"><span style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>{tx.category}</span></td>
                        <td data-label="Data" className="td-muted">{FMT_DATE(tx.date || tx.created_at?.slice(0, 10))}</td>
                        <td data-label="Valor">
                          <strong style={{ color: tx.type === 'receita' ? '#16a34a' : '#dc2626' }}>
                            {tx.type === 'receita' ? '+' : '-'}{FMT_BRL.format(Number(tx.amount || 0))}
                          </strong>
                        </td>
                        <td data-label="Ação">
                          <button className="btn btn-ghost" style={{ color: 'var(--red-500)' }} onClick={() => handleDelete(tx.id)}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal novo lançamento */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div><div className="modal-title">Novo Lançamento</div><div className="modal-sub">Registre uma receita ou despesa</div></div>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-grid">
                <div className="field">
                  <label className="field-label">Tipo *</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['receita', 'despesa'].map(t => (
                      <button key={t} type="button" onClick={() => handleTypeChange(t)}
                        style={{ flex: 1, padding: '8px', borderRadius: 6, border: `2px solid ${form.type === t ? (t === 'receita' ? '#22c55e' : '#ef4444') : 'var(--gray-200)'}`, background: form.type === t ? (t === 'receita' ? '#f0fdf4' : '#fef2f2') : 'white', color: form.type === t ? (t === 'receita' ? '#16a34a' : '#dc2626') : 'var(--gray-500)', fontWeight: 600, cursor: 'pointer', fontSize: 13.5, fontFamily: 'inherit' }}>
                        {t === 'receita' ? '+ Receita' : '− Despesa'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field">
                  <label className="field-label">Descrição *</label>
                  <input className="field-input" placeholder="Ex: Higienização Sofá Cliente João" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
                </div>

                <div className="field">
                  <label className="field-label">Categoria</label>
                  <select className="field-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {(form.type === 'receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div className="field">
                  <label className="field-label">Valor (R$) *</label>
                  <input type="number" step="0.01" min="0" className="field-input" placeholder="0,00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                </div>

                <div className="field">
                  <label className="field-label">Data</label>
                  <input type="date" className="field-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
