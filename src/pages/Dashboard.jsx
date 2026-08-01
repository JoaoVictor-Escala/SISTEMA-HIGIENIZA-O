import React, { useEffect, useState } from 'react';
import { getStats, getAnalytics, getOrders, getClientsOptions, getConfig, getAlerts } from '../api';
import { TrendingUp, FileCheck, Clock, Users, Phone, Calendar, PieChart as PieChartIcon, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';
import { Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import Confetti from 'react-confetti';

const FMT_BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const FMT_DT = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d) ? '—' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

function statusBadge(status) {
  const map = {
    'Finalizado': 'badge-success',
    'Agendado': 'badge-info',
    'Em Andamento': 'badge-warning',
    'Aguardando': 'badge-neutral',
  };
  return map[status] ?? 'badge-neutral';
}

export default function Dashboard() {
  const [stats, setStats] = useState({ monthlyRevenue: 0, finishedOrders: 0, pendingOrders: 0, scheduledOrders: 0 });
  const [analytics, setAnalytics] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [alerts, setAlerts] = useState({ todayOrders: [], clientsToReturn: [] });
  const [cfg, setCfg] = useState({ monthlyGoal: 10000 });
  const [showConfetti, setShowConfetti] = useState(false);

  const [revPeriod, setRevPeriod] = useState('1y');

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isTecnico = user?.role === 'tecnico';

  useEffect(() => {
    if (isTecnico) {
      // Technicians only load orders, clients, config, and alerts (already filtered by backend)
      Promise.all([getOrders(1, 6), getClientsOptions(), getConfig(), getAlerts()]).then(([o, c, config, al]) => {
        setAllOrders(o.data || o);
        setClients(c);
        setAlerts(al);
        if (config) setCfg(config);
      }).catch(() => {});
    } else {
      // Owners load everything
      Promise.all([getStats(), getAnalytics(), getOrders(1, 6), getClientsOptions(), getConfig(), getAlerts()]).then(([s, a, o, c, config, al]) => {
        setStats(s);
        setAnalytics(a);
        setAllOrders(o.data || o);
        setClients(c);
        setAlerts(al);
        if (config) setCfg(config);
        
        const goal = config?.monthlyGoal || 10000;
        if (s.monthlyRevenue >= goal && goal > 0 && s.monthlyRevenue > 0) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 8000);
        }
      }).catch(() => {});
    }
  }, [isTecnico]);

  // Refetch analytics when period changes (Only if owner)
  useEffect(() => {
    if (!isTecnico) {
      getAnalytics(revPeriod).then(a => setAnalytics(a)).catch(() => {});
    }
  }, [revPeriod, isTecnico]);

  const getClientName = (id) => clients.find(c => c.id === id)?.name ?? '—';

  // Serviços agendados pra HOJE e AMANHÃ
  const todayOrders = alerts?.todayOrders || [];
  const tomorrowOrders = alerts?.tomorrowOrders || [];

  // Clientes para contato (>6 meses sem serviço)
  const returnsNeeded = alerts?.clientsToReturn || [];

  // Ordens recentes (últimas 6)
  const recentOrders = allOrders;

  const goal = cfg?.monthlyGoal || 10000;
  const progressPercent = Math.min((stats.monthlyRevenue / goal) * 100, 100) || 0;

  // Calculate total revenue for the selected period from analytics data
  const periodTotal = analytics?.revenueByMonth?.reduce((sum, item) => sum + (item.revenue || 0), 0) || 0;

  // Calculate percent change for new metric card
  const currentMonthRev = stats.monthlyRevenue || 0;
  const revArr = analytics?.revenueByMonth || [];
  const lastMonthRev = revArr[revArr.length - 2]?.revenue || 0;
  let percentChange = 0;
  if (lastMonthRev > 0) {
    percentChange = ((currentMonthRev - lastMonthRev) / lastMonthRev) * 100;
  } else if (currentMonthRev > 0) {
    percentChange = 100;
  }
  const isPositive = percentChange >= 0;

  const periodLabels = { '7d': '7 Dias', '1m': '1 Mês', '1y': '1 Ano' };
  const periodCompareText = { '7d': 'o período anterior', '1m': 'o mês anterior', '1y': 'o ano anterior' };

  return (
    <div>
      {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={500} />}
      
      {/* KPI Cards */}
      {isTecnico ? (
        <div className="kpi-grid" style={{ marginBottom: 20 }}>
          <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="kpi-header">
              <span className="kpi-label">Serviços Hoje</span>
              <div className="kpi-icon" style={{ background: '#eff6ff' }}><Calendar size={16} color="#2563eb" /></div>
            </div>
            <div className="kpi-value">{todayOrders.length}</div>
            <div className="kpi-sub">Para executar hoje</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-label">Serviços Amanhã</span>
              <div className="kpi-icon" style={{ background: '#f5f3ff' }}><Clock size={16} color="#7c3aed" /></div>
            </div>
            <div className="kpi-value">{tomorrowOrders.length}</div>
            <div className="kpi-sub">Para executar amanhã</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-label">Minhas OS Atribuídas</span>
              <div className="kpi-icon" style={{ background: '#f0fdf4' }}><FileCheck size={16} color="#16a34a" /></div>
            </div>
            <div className="kpi-value">{recentOrders.length}</div>
            <div className="kpi-sub">Total registradas recentemente</div>
          </div>
        </div>
      ) : (
        <div className="kpi-grid" style={{ marginBottom: 20 }}>
          <div className="kpi-card kpi-main-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="kpi-header" style={{ marginBottom: '12px' }}>
              <span className="kpi-label">Receita (Finalizados) x Meta do Mês</span>
              <div className="kpi-icon" style={{ background: '#eff6ff' }}><TrendingUp size={16} color="#2563eb" /></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14 }}>
              <div className="kpi-value">{FMT_BRL.format(stats.monthlyRevenue)}</div>
              <div style={{ color: 'var(--gray-400)', fontSize: 13, fontWeight: 500 }}>/ {FMT_BRL.format(goal)}</div>
            </div>
            {/* Progress Bar */}
            <div style={{ width: '100%', height: 12, background: 'var(--gray-100)', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
              <div style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: progressPercent === 100
                  ? 'linear-gradient(90deg, #16a34a, #4ade80)'
                  : progressPercent > 60
                    ? 'linear-gradient(90deg, #2563eb, #06b6d4)'
                    : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)',
                borderRadius: 99,
                boxShadow: progressPercent > 0 ? '0 0 10px rgba(59,130,246,0.5)' : 'none',
              }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 500 }}>{progressPercent.toFixed(1)}% da meta atingida</span>
              {progressPercent === 100
                ? <span style={{ color: '#16a34a', fontWeight: 700 }}>Meta batida!</span>
                : <span style={{ color: 'var(--gray-400)' }}>Faltam {FMT_BRL.format(Math.max(goal - stats.monthlyRevenue, 0))}</span>
              }
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-label">OS Finalizadas</span>
              <div className="kpi-icon" style={{ background: '#f0fdf4' }}><FileCheck size={16} color="#16a34a" /></div>
            </div>
            <div className="kpi-value">{stats.finishedOrders}</div>
            <div className="kpi-sub">Total concluídos</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-label">Pendentes / Agendados</span>
              <div className="kpi-icon" style={{ background: '#fffbeb' }}><Clock size={16} color="#d97706" /></div>
            </div>
            <div className="kpi-value">{stats.pendingOrders + stats.scheduledOrders}</div>
            <div className="kpi-sub">Aguardando execução</div>
          </div>

          <div className="kpi-card kpi-clients-card">
            <div className="kpi-header">
              <span className="kpi-label">Clientes</span>
              <div className="kpi-icon" style={{ background: '#f5f3ff' }}><Users size={16} color="#7c3aed" /></div>
            </div>
            <div className="kpi-value">{clients.length}</div>
            <div className="kpi-sub">{returnsNeeded.length > 0 ? <span style={{ color: '#d97706' }}>{returnsNeeded.length} para contato</span> : 'Sem pendências'}</div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      {!isTecnico && analytics && (
        <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          
          {/* Faturamento Histórico */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '24px 24px 0 24px', justifyContent: 'space-between', minHeight: '280px', overflow: 'hidden' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--gray-900)' }}>Faturamento Histórico</span>
                <div style={{ display: 'flex', gap: 4, background: 'var(--gray-100)', borderRadius: 8, padding: 3 }}>
                  {['7d', '1m', '1y'].map(p => (
                    <button
                      key={p}
                      onClick={() => setRevPeriod(p)}
                      style={{
                        padding: '5px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 6,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: revPeriod === p ? '#fff' : 'transparent',
                        color: revPeriod === p ? 'var(--gray-900)' : 'var(--gray-400)',
                        boxShadow: revPeriod === p ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      }}
                    >
                      {periodLabels[p]}
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--gray-900)', letterSpacing: '-1px', marginBottom: 8 }}>
                {FMT_BRL.format(periodTotal)}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: isPositive ? '#10b981' : '#ef4444', fontWeight: 600, fontSize: 15 }}>
                  {isPositive ? <ArrowUp size={16} /> : <ArrowDown size={16} />} 
                  {Math.abs(percentChange).toFixed(0)}%
                </div>
                <div style={{ fontSize: 13, color: 'var(--gray-505)', fontWeight: 500 }}>
                  em comparação com {periodCompareText[revPeriod]}
                </div>
              </div>
            </div>
            
            <div style={{ flex: 1, width: 'calc(100% + 48px)', marginLeft: '-24px', marginRight: '-24px', marginTop: '20px', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.revenueByMonth} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSpark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <RTooltip 
                    formatter={(val) => FMT_BRL.format(val)} 
                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }}
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontWeight: 600 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke={isPositive ? '#10b981' : '#ef4444'} 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorSpark)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Serviços Mais Vendidos */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 340 }}>
            <div className="section-header" style={{ marginBottom: 12 }}>
              <div className="section-title">Serviços Mais Vendidos</div>
              <div className="section-sub">Top 5 (Finalizados)</div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              {analytics.servicesDistribution.length > 0 ? (
                <>
                  <div style={{ width: '100%', height: 160 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.servicesDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {analytics.servicesDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'][index % 5]} />
                          ))}
                        </Pie>
                        <RTooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    justifyContent: 'center', 
                    gap: '8px 12px', 
                    marginTop: 16, 
                    width: '100%',
                    padding: '0 10px'
                  }}>
                    {analytics.servicesDistribution.map((entry, index) => (
                      <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--gray-600)' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '2px', background: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'][index % 5], flexShrink: 0 }} />
                        <span style={{ whiteSpace: 'nowrap' }}>{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty-state"><p>Sem dados suficientes</p></div>
              )}
            </div>
          </div>

          {/* Inadimplência e Conversão CRM */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="kpi-header" style={{ marginBottom: 12 }}>
                <span className="kpi-label" style={{ fontSize: 14 }}>Valores a Receber</span>
                <div className="kpi-icon" style={{ background: '#fef2f2' }}><AlertTriangle size={16} color="#ef4444" /></div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#ef4444' }}>
                {FMT_BRL.format(analytics.inadimplencia)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 8 }}>
                De {FMT_BRL.format(analytics.totalFaturado)} faturados
              </div>
            </div>

            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="kpi-header" style={{ marginBottom: 12 }}>
                <span className="kpi-label" style={{ fontSize: 14 }}>Conversão de Orçamentos</span>
                <div className="kpi-icon" style={{ background: '#eff6ff' }}><PieChartIcon size={16} color="#3b82f6" /></div>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {analytics.crmConversion.map(c => (
                  <div key={c.name} style={{ background: 'var(--gray-50)', padding: '8px 12px', borderRadius: 8, flex: 1, minWidth: 80 }}>
                    <div style={{ fontSize: 12, color: 'var(--gray-505)', marginBottom: 4 }}>{c.name}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-900)' }}>{c.value}</div>
                  </div>
                ))}
                {analytics.crmConversion.length === 0 && (
                  <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>Nenhum orçamento gerado</div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Linha de Hoje + Retornos/Lembretes */}
      <div className="dashboard-grid animate-fadeIn" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        {/* Agenda de Hoje */}
        <div className="card">
          <div className="section-header" style={{ marginBottom: 16 }}>
            <div>
              <div className="section-title">Agenda de Hoje</div>
              <div className="section-sub">{todayOrders.length === 0 ? 'Nenhum serviço agendado' : `${todayOrders.length} serviço${todayOrders.length > 1 ? 's' : ''}`}</div>
            </div>
          </div>

          {todayOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--gray-400)' }}>
              <Calendar size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
              <p style={{ fontSize: 13 }}>Dia livre hoje!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {todayOrders.map(o => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--gray-200)' }}>
                  <div style={{ minWidth: 48, textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--blue-600)' }}>{FMT_DT(o.scheduled_for)}</div>
                  </div>
                  <div style={{ width: 1, height: 36, background: 'var(--gray-200)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 2 }}>{o.service || o.description}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{getClientName(o.client_id)}</div>
                  </div>
                  <span className={`badge ${statusBadge(o.status)}`}>{o.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clientes para Retorno (Dono) ou Lembretes de Amanhã (Técnico) */}
        <div className="card">
          {isTecnico ? (
            <>
              <div className="section-header" style={{ marginBottom: 16 }}>
                <div>
                  <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    Lembretes de Amanhã <span className="badge badge-info" style={{ fontSize: 11 }}>{tomorrowOrders.length}</span>
                  </div>
                  <div className="section-sub">Envie uma confirmação por WhatsApp</div>
                </div>
              </div>

              {tomorrowOrders.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>Nenhum serviço agendado para amanhã</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tomorrowOrders.map(o => {
                    const msg = `Olá${o.client_name ? ` ${o.client_name.split(' ')[0]}` : ''}! Passando para lembrar do seu agendamento de higienização amanhã. Tudo certo? 😊`;
                    const phone = o.client_phone ? o.client_phone.replace(/\D/g, '') : '';
                    return (
                      <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--gray-200)', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 120 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--gray-900)' }}>{o.service || o.description}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--gray-400)' }}>{o.client_name || getClientName(o.client_id)}</div>
                        </div>
                        
                        {phone ? (
                          <a href={`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer"
                            style={{ background: '#25d366', color: 'white', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Phone size={11} /> Lembrar
                          </a>
                        ) : (
                          <span style={{ fontSize: 10.5, color: 'var(--gray-400)' }}>Sem tel</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="section-header" style={{ marginBottom: 16 }}>
                <div>
                  <div className="section-title">Clientes para Contato</div>
                  <div className="section-sub">Sem serviço há mais de 6 meses</div>
                </div>
              </div>

              {returnsNeeded.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--gray-400)' }}>
                  <Users size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <p style={{ fontSize: 13 }}>Nenhum cliente pendente</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {returnsNeeded.slice(0, 5).map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8 }}>
                      <div style={{ width: 32, height: 32, background: '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#92400e', flexShrink: 0 }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--gray-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                        <div style={{ fontSize: 11.5, color: '#92400e' }}>Último: {c.last_service_date}</div>
                      </div>
                      {c.phone && (
                        <a href={`https://wa.me/55${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                          style={{ background: '#25d366', color: 'white', padding: '4px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Phone size={11} /> WhatsApp
                        </a>
                      )}
                    </div>
                  ))}
                  {returnsNeeded.length > 5 && <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>+{returnsNeeded.length - 5} clientes</p>}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Lembretes de Amanhã (Apenas Proprietários, pois Técnicos já possuem no grid acima) */}
      {!isTecnico && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-header" style={{ marginBottom: 16 }}>
            <div>
              <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Lembretes de Amanhã <span className="badge badge-info" style={{ fontSize: 11 }}>{tomorrowOrders.length}</span>
              </div>
              <div className="section-sub">Envie uma confirmação por WhatsApp</div>
            </div>
          </div>

          {tomorrowOrders.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p>Nenhum serviço agendado para amanhã</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tomorrowOrders.map(o => {
                const msg = `Olá${o.client_name ? ` ${o.client_name.split(' ')[0]}` : ''}! Passando para lembrar do seu agendamento de higienização amanhã. Tudo certo? 😊`;
                const phone = o.client_phone ? o.client_phone.replace(/\D/g, '') : '';
                return (
                  <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--gray-200)', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-900)' }}>{o.service || o.description}</div>
                      <div style={{ fontSize: 13, color: 'var(--gray-505)' }}>{o.client_name || getClientName(o.client_id)}</div>
                    </div>
                    
                    {phone ? (
                      <a href={`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer"
                        className="btn btn-primary"
                        style={{ background: '#25d366', borderColor: '#25d366', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '6px 12px' }}>
                        <Phone size={14} /> Enviar Lembrete
                      </a>
                    ) : (
                      <span className="badge" style={{ background: 'var(--gray-200)', color: 'var(--gray-505)' }}>Sem telefone</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Ordens Recentes */}
      <div className="card">
        <div className="section-header" style={{ marginBottom: 16 }}>
          <div>
            <div className="section-title">{isTecnico ? 'Minhas OS Atribuídas Recentes' : 'Ordens de Serviço Recentes'}</div>
            <div className="section-sub">Últimas 6 registradas</div>
          </div>
        </div>

        {recentOrders.length === 0 ? (
          <div className="empty-state">
            <p>Nenhuma ordem cadastrada</p>
            {!isTecnico && <p>Acesse a agenda para criar a primeira OS</p>}
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Cliente</th>
                  <th>Data</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(o => {
                  const d = new Date(o.scheduled_for);
                  const dateStr = isNaN(d) ? '—' : d.toLocaleDateString('pt-BR');
                  return (
                    <tr key={o.id}>
                      <td><span className="td-strong">{o.service || o.description}</span></td>
                      <td>{getClientName(o.client_id)}</td>
                      <td className="td-muted">{dateStr}</td>
                      <td><strong>{FMT_BRL.format(Number(o.price) || 0)}</strong></td>
                      <td><span className={`badge ${statusBadge(o.status)}`}>{o.status || 'Pendente'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
