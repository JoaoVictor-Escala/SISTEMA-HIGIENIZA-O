import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, DollarSign, Clock, CheckCircle, LogOut, Copy, Check, Key, Tag, Award } from 'lucide-react';
import { AreaChart, Area, PieChart, Pie, Cell, Tooltip, ResponsiveContainer, XAxis, YAxis } from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_LABEL = { pro: 'Ativo', pending: 'Pendente', beta: 'Teste', inactive: 'Inativo' };
const STATUS_COLOR = { 
  pro: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400', 
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400', 
  beta: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400', 
  inactive: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400' 
};

function StatCard({ icon: Icon, label, value, colorClass = 'text-blue-600 dark:text-blue-400', bgClass = 'bg-blue-50 dark:bg-blue-500/10', sub }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm flex flex-col h-full transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgClass}`}>
          <Icon size={20} className={colorClass} />
        </div>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">{value}</div>
      {sub && <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">{sub}</div>}
    </div>
  );
}

function ChartsSection({ commissionsByMonth = [], referralDistribution = [], stats = {} }) {
  const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const PAYOUT_THRESHOLD = 100; // min for payout
  const progress = Math.min((stats.pendingBalance / PAYOUT_THRESHOLD) * 100, 100);

  return (
    <div className="mb-8">
      {/* Motivational Progress Bar */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 mb-6 text-white relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Award size={20} />
            </div>
            <div>
              <div className="text-white/70 text-xs font-semibold uppercase tracking-widest">Próximo Saque</div>
              <div className="text-white font-bold text-lg leading-tight">
                {progress >= 100
                  ? '🎉 Saldo disponível para saque!'
                  : `Faltam ${fmt(Math.max(0, PAYOUT_THRESHOLD - stats.pendingBalance))} para atingir o mínimo`}
              </div>
            </div>
          </div>
          <div className="bg-white/20 rounded-full h-3 overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #a7f3d0, #34d399)',
                boxShadow: '0 0 12px rgba(52,211,153,0.5)',
              }}
            />
          </div>
          <div className="flex justify-between text-white/60 text-xs font-medium">
            <span>{fmt(stats.pendingBalance)} acumulado</span>
            <span>Mínimo: {fmt(PAYOUT_THRESHOLD)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução de Comissões */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-blue-50 dark:bg-blue-500/10 rounded-lg flex items-center justify-center">
              <TrendingUp size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base leading-tight">Comissões por Mês</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Últimos 6 meses</p>
            </div>
          </div>
          {commissionsByMonth.every(m => m.value === 0) ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-600">
              <TrendingUp size={32} className="mb-3 opacity-30" />
              <p className="text-sm font-medium">Sem comissões ainda</p>
              <p className="text-xs mt-1">Elas aparecerão aqui quando seus indicados assinarem</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={commissionsByMonth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                <Tooltip
                  formatter={(v) => [`R$ ${Number(v).toFixed(2).replace('.', ',')}`, 'Comissão']}
                  contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} fill="url(#commGrad)" dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Conversão de Indicados */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <Users size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base leading-tight">Conversão de Indicados</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Distribuição de status</p>
            </div>
          </div>
          {referralDistribution.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-600">
              <Users size={32} className="mb-3 opacity-30" />
              <p className="text-sm font-medium">Sem indicados ainda</p>
              <p className="text-xs mt-1">Compartilhe seu código para começar</p>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={referralDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                    {referralDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} indicado(s)`, n]} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-3 min-w-[110px]">
                {referralDistribution.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{d.name}</div>
                      <div className="text-sm font-bold text-slate-800 dark:text-white">{d.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoginView({ onLogin }) {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/parceiro/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toUpperCase().trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao fazer login');
      localStorage.setItem('parceiro_token', data.token);
      localStorage.setItem('parceiro_info', JSON.stringify(data.affiliate));
      onLogin(data.affiliate);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 relative" style={{ width: '64px', height: '64px' }}>
            <div className="absolute rounded-xl" style={{ width: '34px', height: '34px', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', transform: 'rotate(45deg)', left: '22px', top: '10px' }}></div>
            <div className="absolute rounded-xl shadow-lg" style={{ width: '34px', height: '34px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', transform: 'rotate(45deg)', left: '8px', top: '20px', boxShadow: '0 4px 10px rgba(59,130,246,0.4)' }}></div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Portal do Parceiro</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">Impacto Clean · Área exclusiva de parceiros</p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl p-3 text-sm font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">Código do Cupom</label>
              <div className="relative">
                <Tag size={18} className="absolute left-3 top-3 text-slate-400" />
                <input
                  required value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="Ex: SEUCODIGO20"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-mono font-bold tracking-wider placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">Senha de Acesso</label>
              <div className="relative">
                <Key size={18} className="absolute left-3 top-3 text-slate-400" />
                <input
                  required type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="mt-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold tracking-wide transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-blue-600/20"
            >
              {loading ? 'Acessando...' : 'Entrar no Portal'}
            </button>
          </form>
        </div>
        
      </div>
    </div>
  );
}

function DashboardView({ affiliate, onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('parceiro_token');
    fetch(`${API_BASE}/parceiro/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(affiliate.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
      <div className="text-slate-500 dark:text-slate-400 font-medium">Carregando painel...</div>
    </div>
  );

  const stats = data?.stats || {};
  const commissions = data?.commissions || [];
  const referrals = data?.referrals || [];
  const commissionsByMonth = data?.commissionsByMonth || [];
  const referralDistribution = data?.referralDistribution || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans pb-12">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative bg-transparent" style={{ width: '34px', height: '34px' }}>
              <div className="absolute rounded-md" style={{ width: '18px', height: '18px', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', transform: 'rotate(45deg)', left: '12px', top: '5px' }}></div>
              <div className="absolute rounded-md" style={{ width: '18px', height: '18px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', transform: 'rotate(45deg)', left: '4px', top: '10px', boxShadow: '0 2px 4px rgba(59,130,246,0.3)' }}></div>
            </div>
            <div>
              <div className="font-bold text-slate-800 dark:text-white text-sm tracking-tight leading-tight">Impacto Clean</div>
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 leading-tight">Portal Parceiros</div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 hidden sm:inline-block">
              Olá, <strong className="text-slate-900 dark:text-white">{affiliate.name}</strong>
            </span>
            <button 
              onClick={onLogout} 
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        
        {/* Hero Section / Coupon & Link */}
        <div className="bg-blue-600 rounded-3xl p-8 sm:p-10 flex flex-col items-start justify-between gap-6 mb-8 shadow-lg shadow-blue-600/20 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10 w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="text-blue-100 font-semibold text-sm tracking-wide uppercase mb-2">Seu Código de Indicação</div>
              <div className="text-4xl sm:text-5xl font-extrabold text-white font-mono tracking-widest mb-3">{affiliate.code}</div>
              <div className="text-blue-100 text-sm max-w-md leading-relaxed">
                Clientes ganham desconto e você recebe automaticamente <strong className="text-white">{affiliate.commission_percentage}% de comissão</strong> a cada mensalidade paga.
              </div>
            </div>
            
            <button 
              onClick={copyCode} 
              className="relative z-10 flex items-center gap-2 px-6 py-3 bg-white text-blue-700 hover:bg-blue-50 rounded-xl font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap"
            >
              {copied ? <><Check size={18} className="text-emerald-500" /> Copiado!</> : <><Copy size={18} /> Copiar Código</>}
            </button>
          </div>

          <div className="relative z-10 w-full pt-6 mt-2 border-t border-blue-500/50">
            <div className="text-blue-100 font-semibold text-xs tracking-wide uppercase mb-2">Seu Link de Cadastro Direto</div>
            <div className="flex items-center gap-3 w-full bg-blue-700/50 p-2 pl-4 rounded-xl border border-blue-500/50 backdrop-blur-sm">
              <div className="text-blue-50 font-mono text-sm truncate flex-1">
                https://sistema.impactoclean.com.br/login?ref={affiliate.code}
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`https://sistema.impactoclean.com.br/login?ref=${affiliate.code}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors shrink-0"
                title="Copiar Link"
              >
                <Copy size={16} />
              </button>
            </div>
            <p className="text-xs text-blue-200 mt-2">Envie este link para seus clientes. O código será aplicado automaticamente no cadastro.</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            icon={Users} label="Total Indicados" value={stats.totalReferrals || 0} 
            colorClass="text-indigo-600 dark:text-indigo-400" bgClass="bg-indigo-50 dark:bg-indigo-500/10" 
          />
          <StatCard 
            icon={CheckCircle} label="Assinantes Ativos" value={stats.activeReferrals || 0} sub="gerando comissão recorrente"
            colorClass="text-emerald-600 dark:text-emerald-400" bgClass="bg-emerald-50 dark:bg-emerald-500/10" 
          />
          <StatCard 
            icon={Clock} label="A Receber" value={fmt(stats.pendingBalance)} sub="aguardando seu saque"
            colorClass="text-amber-600 dark:text-amber-400" bgClass="bg-amber-50 dark:bg-amber-500/10" 
          />
          <StatCard 
            icon={DollarSign} label="Total Ganho" value={fmt(stats.totalEarned)} sub={`${fmt(stats.paidBalance)} já pagos a você`}
            colorClass="text-blue-600 dark:text-blue-400" bgClass="bg-blue-50 dark:bg-blue-500/10" 
          />
        </div>

        {/* Charts & Progress */}
        <ChartsSection
          commissionsByMonth={commissionsByMonth}
          referralDistribution={referralDistribution}
          stats={stats}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Commissions List */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[500px]">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign size={18} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Extrato de Comissões</h2>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {commissions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700">
                    <Clock size={28} className="text-slate-300 dark:text-slate-600" />
                  </div>
                  <h3 className="text-slate-700 dark:text-slate-300 font-semibold mb-1">Nenhuma comissão ainda</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">Suas comissões aparecerão aqui automaticamente quando seus indicados pagarem a mensalidade.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {commissions.map(c => (
                    <div key={c.id} className={`flex justify-between items-center p-4 rounded-xl border ${c.status === 'pago' ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700' : 'bg-amber-50 dark:bg-amber-500/5 border-amber-100 dark:border-amber-500/20'}`}>
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-1">{c.tenant_name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          Fatura: {fmt(c.invoice_amount)} • {new Date(c.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold text-base ${c.status === 'pago' ? 'text-slate-700 dark:text-slate-300' : 'text-amber-600 dark:text-amber-400'}`}>
                          {c.status === 'pago' ? '' : '+ '}{fmt(c.commission_amount)}
                        </div>
                        <div className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${c.status === 'pago' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-500'}`}>
                          {c.status === 'pago' ? 'Recebido' : 'A Receber'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Referrals List */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[500px]">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp size={18} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Seus Indicados</h2>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {referrals.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700">
                    <Users size={28} className="text-slate-300 dark:text-slate-600" />
                  </div>
                  <h3 className="text-slate-700 dark:text-slate-300 font-semibold mb-1">Sem indicações</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">Compartilhe seu código para começar a trazer clientes e ganhar comissões recorrentes.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {referrals.map((r, i) => (
                    <div key={i} className="flex justify-between items-center p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm">
                          {r.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-0.5">{r.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cadastrou em {new Date(r.created_at).toLocaleDateString('pt-BR')}</div>
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_COLOR[r.status] || STATUS_COLOR.inactive}`}>
                        {STATUS_LABEL[r.status] || r.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* PIX info Footer */}
        {affiliate.pix_key && (
          <div className="mt-8 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-center gap-3 text-sm text-slate-600 dark:text-slate-300 font-medium">
            <CheckCircle size={18} className="text-emerald-500" />
            Chave Pix para pagamentos: <strong className="text-slate-900 dark:text-white font-bold">{affiliate.pix_key}</strong>
          </div>
        )}
        
      </main>
    </div>
  );
}

export default function ParceiroPortal() {
  const [affiliate, setAffiliate] = useState(() => {
    try { return JSON.parse(localStorage.getItem('parceiro_info')); } catch { return null; }
  });
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('parceiro_token');
    const info = localStorage.getItem('parceiro_info');
    if (token && info) setTokenValid(true);
  }, []);

  const handleLogin = (aff) => { setAffiliate(aff); setTokenValid(true); };
  const handleLogout = () => {
    localStorage.removeItem('parceiro_token');
    localStorage.removeItem('parceiro_info');
    setAffiliate(null); setTokenValid(false);
  };

  if (tokenValid && affiliate) return <DashboardView affiliate={affiliate} onLogout={handleLogout} />;
  return <LoginView onLogin={handleLogin} />;
}
