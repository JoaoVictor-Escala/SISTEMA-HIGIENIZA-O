import React, { useEffect, useState, useCallback, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import PricingModal from './components/PricingModal';
import OnboardingWizard from './components/OnboardingWizard';
import {
  LayoutDashboard, Users, Calendar, Package,
  DollarSign, FileText, Settings, Menu, Bell,
  AlertTriangle, Clock, FileCheck, Phone, LogOut,
  Zap, Sparkles, ArrowRight, Shield, MessageSquare, Download, Sun, Moon, Lock, Rocket, CheckCircle2
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { getAlerts, getConfig, getOrders, getNotifications, markNotificationRead, getTrialStatus, getPlanPrice } from './api';

const TODAY = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

const PAGE_LABELS = {
  '/': 'Dashboard', '/clientes': 'Clientes', '/agenda': 'Agenda',
  '/orcamentos': 'Orçamentos', '/financeiro': 'Controle Financeiro',
  '/estoque': 'Estoque', '/configuracoes': 'Configurações',
  '/followup': 'Follow-Up Automático', '/consultor-ia': 'Consultor IA',
};

function Badge({ count }) {
  if (!count) return null;
  return (
    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-[1px] rounded-full min-w-[18px] text-center leading-4">
      {count}
    </span>
  );
}

// ===== NOTIFICATION BELL DROPDOWN =====
function NotifItem({ id, icon: Icon, iconBg, iconColor, title, sub, isRead, onRead }) {
  const handleClick = () => {
    if (id && !isRead) onRead(id);
  };

  return (
    <div 
      onClick={handleClick}
      style={{ 
        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', 
        borderBottom: '1px solid var(--gray-100)', transition: 'background 0.1s',
        cursor: id ? 'pointer' : 'default',
        background: isRead === false ? 'rgba(37, 99, 235, 0.03)' : 'transparent',
        position: 'relative'
      }}
      onMouseEnter={e => e.currentTarget.style.background = isRead === false ? 'rgba(37, 99, 235, 0.06)' : 'var(--gray-50)'}
      onMouseLeave={e => e.currentTarget.style.background = isRead === false ? 'rgba(37, 99, 235, 0.03)' : 'transparent'}
    >
      {isRead === false && (
        <div style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', width: 6, height: 6, borderRadius: '50%', background: '#2563eb' }} />
      )}
      <div style={{ width: 32, height: 32, background: iconBg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={15} color={iconColor} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-900)', marginBottom: 1, lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: 11.5, color: 'var(--gray-400)', lineHeight: 1.3 }}>{sub}</div>
      </div>
    </div>
  );
}

function NotifBell({ alerts, todayOrders, realNotifs, onReadNotif }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  
  const unreadCount = realNotifs.filter(n => !n.is_read).length;
  const total = (alerts.total || 0) + unreadCount;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const notifItems = [];

  // 1. Notificações Reais (DB)
  realNotifs.forEach(n => {
    const isSuccess = n.type === 'success';
    notifItems.push({
      id: n.id,
      icon: isSuccess ? FileCheck : Bell,
      iconBg: isSuccess ? 'var(--green-50)' : 'var(--gray-50)',
      iconColor: isSuccess ? 'var(--green-500)' : 'var(--gray-500)',
      title: n.title,
      sub: n.message,
      isRead: !!n.is_read,
      onRead: onReadNotif
    });
  });

  // 2. Alertas do Sistema (Dinâmicos)
  if (todayOrders.length > 0) {
    const times = todayOrders.map(o => {
      const d = new Date(o.scheduled_for);
      return isNaN(d) ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }).filter(Boolean);
    notifItems.push({ icon: Clock, iconBg: 'var(--blue-50)', iconColor: 'var(--blue-600)', title: `${todayOrders.length} serviço${todayOrders.length > 1 ? 's' : ''} hoje`, sub: times.length ? `Próximo às ${times[0]}` : 'Verifique a Agenda' });
  }

  if (alerts.lowStock > 0) {
    notifItems.push({ icon: AlertTriangle, iconBg: 'var(--amber-50)', iconColor: 'var(--amber-500)', title: `${alerts.lowStock} produto${alerts.lowStock > 1 ? 's' : ''} com estoque baixo`, sub: 'Acesse Estoque para repor' });
  }

  if (alerts.pendingQuotes > 0) {
    notifItems.push({ icon: FileCheck, iconBg: 'var(--blue-50)', iconColor: 'var(--blue-600)', title: `${alerts.pendingQuotes} orçamento${alerts.pendingQuotes > 1 ? 's' : ''} aguardando resposta`, sub: 'Acesse Orçamentos' });
  }

  const clientsToReturnCount = alerts.clientsToReturnCount || (Array.isArray(alerts.clientsToReturn) ? alerts.clientsToReturn.length : 0);
  if (clientsToReturnCount > 0) {
    notifItems.push({ icon: Phone, iconBg: 'var(--red-50)', iconColor: 'var(--red-500)', title: `${clientsToReturnCount} cliente${clientsToReturnCount > 1 ? 's' : ''} para contato`, sub: 'Sem serviço há mais de 6 meses' });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Bell size={18} className={total > 0 ? "text-blue-600 dark:text-blue-500" : "text-slate-500 dark:text-slate-400"} />
        {total > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white dark:border-slate-900">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.12)] z-50 overflow-hidden animate-toastIn">
          <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700">
            <span className="font-bold text-sm text-slate-900 dark:text-white">Notificações</span>
            {total > 0 && <span className="text-xs text-slate-400">{total} no total</span>}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bell size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Tudo certo por aqui!</p>
              </div>
            ) : (
              notifItems.map((item, i) => <NotifItem key={item.id || i} {...item} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-[34px] h-[34px]" />;

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300 flex items-center justify-center"
      title="Alternar tema"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const pageLabel = PAGE_LABELS[location.pathname] ?? 'Sistema';
  const [alerts, setAlerts] = useState({ lowStock: 0, pendingQuotes: 0, clientsToReturn: [], clientsToReturnCount: 0, total: 0 });
  const [config, setConfigState] = useState({ companyName: 'LimpeJá' });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [todayOrders, setTodayOrders] = useState([]);
  const [realNotifs, setRealNotifs] = useState([]);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const notifShown = useRef(false);

  // Subscription paywall logic
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isPending = user?.subscription_status === 'pending' || user?.subscription_status === 'beta';

  // ===== TRIAL STATE =====
  const [trialExpiredOverlay, setTrialExpiredOverlay] = useState(false);
  const [trialMinutesLeft, setTrialMinutesLeft] = useState(null);
  const [showPlans, setShowPlans] = useState(false);
  const [planPrice, setPlanPrice] = useState(47.90);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handlePaymentSuccess = () => {
    // Atualiza o user local e recarrega
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const u = JSON.parse(userStr);
      u.subscription_status = 'pro';
      localStorage.setItem('user', JSON.stringify(u));
    }
    window.location.reload();
  };

  const loadAlerts = useCallback(async () => {
    try {
      const [a, ntfs] = await Promise.all([getAlerts(), getNotifications()]);
      setAlerts(a);
      setRealNotifs(ntfs);

      const today = a.todayOrders || [];
      setTodayOrders(today);

      // Browser notification — once on load
      if (!notifShown.current && (today.length > 0 || ntfs.some(n => !n.is_read))) {
        notifShown.current = true;
        if ('Notification' in window && Notification.permission === 'granted') {
          const body = today.length > 0 
            ? `Você tem ${today.length} serviço(s) hoje.` 
            : `Você tem novas notificações pendentes.`;
          new Notification('LimpeJá Alerta', { body, icon: '/favicon.svg' });
        }
      }
    } catch { /* ignore */ }
  }, []);

  const handleReadNotif = async (id) => {
    try {
      await markNotificationRead(id);
      setRealNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    loadAlerts();
    getConfig().then(c => {
      setConfigState(c);
      // Show onboarding wizard if not completed yet
      if (!c.onboarding_completed) setShowOnboarding(true);
    }).catch(() => {});
    getPlanPrice().then(p => setPlanPrice(p.price)).catch(() => {});
    
    // PWA Install Logic
    const handlePrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);

    // Trial countdown + expired listener
    const handleTrialExpired = () => {
      setTrialExpiredOverlay(true);
    };
    window.addEventListener('trial-expired', handleTrialExpired);

    // Poll trial status every 60s
    const pollTrial = async () => {
      try {
        const status = await getTrialStatus();
        if (status.trialExpired) {
          setTrialExpiredOverlay(true);
          setTrialMinutesLeft(0);
        } else if (!status.isPro) {
          setTrialMinutesLeft(status.minutesLeft);
        } else {
          setTrialMinutesLeft(null);
        }
      } catch { /* ignore */ }
    };
    pollTrial();
    const trialInterval = setInterval(pollTrial, 60000);

    const interval = setInterval(loadAlerts, 60000);
    return () => {
      clearInterval(interval);
      clearInterval(trialInterval);
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('trial-expired', handleTrialExpired);
    };
  }, [loadAlerts]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const badgeCounts = {
    '/orcamentos': alerts.pendingQuotes,
    '/estoque': alerts.lowStock,
    '/clientes': alerts.clientsToReturnCount || (Array.isArray(alerts.clientsToReturn) ? alerts.clientsToReturn.length : 0),
    '/followup': alerts.pendingFollowups,
  };

  const NAV = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/clientes', label: 'Clientes', icon: Users },
    { to: '/agenda', label: 'Agenda', icon: Calendar },
    { to: '/orcamentos', label: 'Orçamentos', icon: FileText },
    { to: '/financeiro', label: 'Financeiro', icon: DollarSign },
    { to: '/estoque', label: 'Estoque', icon: Package },
    { to: '/followup', label: 'Follow-Up', icon: MessageSquare },
    { to: '/consultor-ia', label: 'Consultor IA', icon: Sparkles },
  ].filter(item => {
    if (user?.role === 'tecnico') {
      return ['/', '/clientes', '/agenda', '/consultor-ia'].includes(item.to);
    }
    return true;
  });

  // Bottom nav tabs for mobile — 5 most used pages
  const BOTTOM_NAV = [
    { to: '/', label: 'Início', icon: LayoutDashboard, end: true },
    { to: '/clientes', label: 'Clientes', icon: Users },
    { to: '/agenda', label: 'Agenda', icon: Calendar },
    { to: '/orcamentos', label: 'Orçamentos', icon: FileText },
    { to: '/financeiro', label: 'Financeiro', icon: DollarSign },
    ...(user?.role === 'tecnico' ? [{ to: '/consultor-ia', label: 'Consultor IA', icon: Sparkles }] : [])
  ].filter(item => {
    if (user?.role === 'tecnico') {
      return ['/', '/clientes', '/agenda', '/consultor-ia'].includes(item.to);
    }
    return true;
  });

  const SidebarContent = () => (
    <>
      <div className="sidebar-brand">
        <div className="brand-logo" style={{ position: 'relative', background: 'transparent', width: '34px', height: '34px' }}>
          <div style={{ position: 'absolute', width: '18px', height: '18px', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', borderRadius: '6px', transform: 'rotate(45deg)', left: '12px', top: '5px' }}></div>
          <div style={{ position: 'absolute', width: '18px', height: '18px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', borderRadius: '6px', transform: 'rotate(45deg)', left: '4px', top: '10px', boxShadow: '0 2px 4px rgba(59,130,246,0.3)' }}></div>
        </div>
        <div>
          <div className="brand-name">{config.companyName}</div>
          <div className="brand-sub">Higienização</div>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Workspace</div>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={() => setSidebarOpen(false)}>
            <Icon size={16} />{label}<Badge count={badgeCounts[to]} />
          </NavLink>
        ))}
        {user?.role === 'admin' && (
          <>
            <NavLink to="/afiliados" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <Users size={16} /> Parcerias/Afiliados
            </NavLink>
            <NavLink to="/admin" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <Shield size={16} /> Admin Master
            </NavLink>
          </>
        )}
      </div>

      <div className="sidebar-footer">
        {isPending && user?.role !== 'tecnico' && (
          <button
            className="nav-link"
            onClick={() => setShowPlans(true)}
            style={{
              width: '100%', background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              border: 'none', textAlign: 'left', marginBottom: '6px',
              color: 'white', fontWeight: 700, borderRadius: 8, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
              boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
            }}
          >
            <Sparkles size={16} /> Assinar Plano
          </button>
        )}
        <NavLink to="/configuracoes" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={() => setSidebarOpen(false)}>
          <Settings size={16} /> Configurações
        </NavLink>
        {deferredPrompt && (
          <button className="nav-link" style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', marginTop: '2px', color: 'var(--blue-600)' }} onClick={handleInstallClick}>
            <Download size={16} color="var(--blue-600)" /> Instalar App
          </button>
        )}
        <button className="nav-link" style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', marginTop: '2px', color: 'var(--red-500)' }} onClick={() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }}>
          <LogOut size={16} color="var(--red-500)" /> Sair do Sistema
        </button>
        <div className="sidebar-user" style={{ marginTop: 8 }}>
          <div className="user-avatar">{(user?.name || config.ownerName)?.charAt(0)?.toUpperCase() || 'A'}</div>
          <div>
            <div className="user-name">{user?.name || config.ownerName || 'Administrador'}</div>
            <div className="user-role">{user?.role === 'tecnico' ? 'Técnico' : user?.role === 'admin' ? 'Administrador' : 'Proprietário'}</div>
          </div>
        </div>
        <div style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid var(--gray-100)',
          textAlign: 'center',
          fontSize: '10px',
          color: 'var(--gray-400)',
          letterSpacing: '0.5px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}>
          <Shield size={10} /> Engineered in Boston, MA
        </div>
      </div>
    </>
  );



  return (
    <>
      {/* ONBOARDING WIZARD */}
      {showOnboarding && (
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      )}

      {/* TRIAL EXPIRED OVERLAY */}
      {trialExpiredOverlay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(3,7,18,0.97)', backdropFilter: 'blur(20px)', zIndex: 9999999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, background: 'rgba(239,68,68,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '2px solid rgba(239,68,68,0.3)' }}>
              <Lock size={36} color="#ef4444" />
            </div>
            <h1 style={{ color: 'white', fontSize: 26, fontWeight: 800, marginBottom: 10 }}>Período de teste encerrado</h1>
            <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>
              {user?.role === 'tecnico' 
                ? "O período de teste do LimpeJá expirou. Entre em contato com o proprietário da conta para ativar o plano completo."
                : <>Suas <strong style={{ color: 'white' }}>4 horas gratuitas</strong> chegaram ao fim.<br />Assine para continuar usando o sistema completo.</>}
            </p>
            {user?.role !== 'tecnico' && (
              <>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px 20px', marginBottom: 28, textAlign: 'left' }}>
                  {["Clientes e OS ilimitados", "Orçamentos com portal do cliente", "Consultor IA com fotos", "Follow-up automático", "Controle financeiro (DRE)"].map(b => (
                    <div key={b} style={{ color: '#e2e8f0', fontSize: 13.5, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={16} color="#10b981" />
                      {b}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { setTrialExpiredOverlay(false); setShowPlans(true); }}
                  style={{ width: '100%', padding: '16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 12, fontSize: 17, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 32px rgba(59,130,246,0.4)', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                >
                  <Rocket size={20} /> Assinar Agora — R$ {planPrice.toFixed(2).replace('.', ',')}/mês
                </button>
                <p style={{ color: '#475569', fontSize: 12 }}>Tem um cupom? Ele aparece na próxima tela. • Cancele quando quiser.</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* TRIAL COUNTDOWN BAR */}
      {!trialExpiredOverlay && trialMinutesLeft !== null && !showPlans && user?.role !== 'tecnico' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999, background: 'linear-gradient(90deg, #1e3a5f, #1e40af)', color: 'white', padding: '5px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={13} fill="currentColor" style={{ flexShrink: 0 }} />
            <strong>Teste gratuito:</strong>
            <span className="hidden sm:inline">&nbsp;
              {trialMinutesLeft >= 24 * 60 
                ? `${Math.floor(trialMinutesLeft / (24 * 60))} dias restantes` 
                : trialMinutesLeft >= 60 
                  ? `${Math.floor(trialMinutesLeft / 60)}h ${trialMinutesLeft % 60}min restantes` 
                  : `${trialMinutesLeft} minutos restantes`}
            </span>
          </span>
          <button onClick={() => setShowPlans(true)} style={{ background: 'white', color: '#1e40af', border: 'none', borderRadius: 4, padding: '3px 10px', fontWeight: 700, cursor: 'pointer', fontSize: 11, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            Assinar <ArrowRight size={11} />
          </button>
        </div>
      )}

      {/* BETA BANNER (apenas se não há trial ativo) */}
      {isPending && trialMinutesLeft === null && !trialExpiredOverlay && user?.role !== 'tecnico' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999, background: 'linear-gradient(90deg, #92400e, #b45309)', color: 'white', padding: '6px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: 10 }}>
             <Zap size={12} fill="currentColor" style={{ flexShrink: 0 }} /> 
             <strong style={{ flexShrink: 0 }}>Modo Beta</strong> 
             <span className="hidden sm:inline" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>— Você está vendo dados fictícios. Assine para usar dados reais.</span>
          </span>
          <button onClick={() => setShowPlans(true)} style={{ background: 'white', color: '#92400e', border: 'none', borderRadius: 4, padding: '4px 10px', fontWeight: 700, cursor: 'pointer', fontSize: 11, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            Ver Planos <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* PRICING MODAL — Plano único */}
      {showPlans && (
        <PricingModal 
          onClose={() => setShowPlans(false)} 
          onSuccess={handlePaymentSuccess} 
          planPrice={planPrice} 
        />
      )}


    <div className="layout" style={{ paddingTop: isPending ? '28px' : '0' }}>
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40, backdropFilter: 'blur(2px)' }}
          onClick={() => setSidebarOpen(false)} />
      )}
      <aside className="sidebar sidebar-desktop">{SidebarContent()}</aside>
      <aside className={`sidebar sidebar-mobile${sidebarOpen ? ' open' : ''}`}>{SidebarContent()}</aside>

      <div className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-ghost hamburger-btn" onClick={() => setSidebarOpen(o => !o)}>
              <Menu size={20} />
            </button>
            <div className="topbar-left">
              <h1>{pageLabel}</h1>
              <p>{TODAY}</p>
            </div>
          </div>

          <div className="topbar-right">
            <span className="topbar-badge hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Zap size={12} /> {config.companyName || 'Sistema'}
            </span>
            <ThemeSwitcher />
            <NotifBell 
              alerts={alerts} 
              todayOrders={todayOrders} 
              realNotifs={realNotifs} 
              onReadNotif={handleReadNotif}
            />
          </div>
        </header>

        <div className="page-body">
          <Outlet context={{ reloadAlerts: loadAlerts }} />
        </div>
      </div>

      {/* ===== MOBILE BOTTOM NAV BAR ===== */}
      <nav className="mobile-bottom-nav">
        {BOTTOM_NAV.map(({ to, label, icon: Icon, end }) => {
          const isActive = end ? location.pathname === to : location.pathname.startsWith(to);
          const badge = badgeCounts[to];
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={`mobile-bottom-nav-item${isActive ? ' active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <div className="mobile-bottom-nav-icon-wrap">
                <Icon size={20} />
                {badge > 0 && <span className="mobile-bottom-nav-badge">{badge > 9 ? '9+' : badge}</span>}
              </div>
              <span className="mobile-bottom-nav-label">{label}</span>
              {isActive && <div className="mobile-bottom-nav-indicator" />}
            </NavLink>
          );
        })}
        {/* Mais (abre sidebar com as outras opções) */}
        <button
          className={`mobile-bottom-nav-item${sidebarOpen ? ' active' : ''}`}
          onClick={() => setSidebarOpen(o => !o)}
          style={{ background: 'none', border: 'none', fontFamily: 'inherit' }}
        >
          <div className="mobile-bottom-nav-icon-wrap">
            <Menu size={20} />
          </div>
          <span className="mobile-bottom-nav-label">Mais</span>
        </button>
      </nav>
    </div>
    </>
  );
}
