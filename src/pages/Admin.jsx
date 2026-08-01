import { useState, useEffect } from 'react';
import { Search, RefreshCw, Star, ShieldAlert, Calendar, Database, Download, Play } from 'lucide-react';
import { API, getAdminMetrics } from '../api';
import { useConfirm } from '../context/ConfirmContext';

export default function Admin() {
    const { confirm, prompt } = useConfirm();
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [backups, setBackups] = useState([]);
    const [backupRunning, setBackupRunning] = useState(false);
    const [backupMsg, setBackupMsg] = useState('');
    const [metrics, setMetrics] = useState({ mrr: 0, activePro: 0, activeTrials: 0, pendingCommissions: 0 });

    // Initial load
    useEffect(() => {
        let cancelled = false;
        API.get('/admin/tenants')
            .then((data) => { if (!cancelled) setTenants(data); })
            .catch((e) => console.error('Failed to load tenants', e))
            .finally(() => { if (!cancelled) setLoading(false); });
        API.get('/admin/backups')
            .then(data => { if (!cancelled) setBackups(data); })
            .catch(() => {});
        getAdminMetrics()
            .then(data => { if (!cancelled) setMetrics(data); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    const loadBackups = async () => {
        try { setBackups(await API.get('/admin/backups')); } catch {/* ignore */}
    };

    const handleRunBackup = async () => {
        setBackupRunning(true); setBackupMsg('');
        try {
            const r = await API.post('/admin/backups/run', {});
            setBackupMsg(`✅ Backup criado: ${r.fileName} (${r.sizeKb} KB)`);
            await loadBackups();
        } catch (e) {
            setBackupMsg('❌ Erro: ' + (e.message || 'Falha no backup'));
        } finally {
            setBackupRunning(false);
        }
    };

    // Manual refresh (event handler — not subject to the effect rule)
    const loadTenants = async () => {
        setLoading(true);
        try {
            const data = await API.get('/admin/tenants');
            setTenants(data);
        } catch (e) {
            console.error('Failed to load tenants', e);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id, status, resetTrial = false) => {
        const actionText = resetTrial ? 'zerar o tempo de teste' : 'alterar o status para ' + status;
        const ok = await confirm({
            title: resetTrial ? 'Resetar Trial' : (status === 'pro' ? 'Conceder PRO' : 'Alterar Status'),
            message: `Tem certeza que deseja ${actionText} desta conta?`,
            confirmText: 'Sim, Confirmar',
            cancelText: 'Cancelar',
            type: status === 'pro' ? 'info' : 'warning',
        });
        if (!ok) return;
        try {
            await API.put(`/admin/tenants/${id}/status`, { status, resetTrial });
            loadTenants();
        } catch (e) {
            alert('Erro ao atualizar: ' + (e.message || 'Erro desconhecido'));
        }
    };

    const handleAddDays = async (id) => {
        const daysStr = await prompt({
            title: 'Conceder Dias de Teste',
            message: 'Quantos dias de teste extras você deseja dar para essa conta?',
            placeholder: 'ex: 7',
            confirmText: 'Confirmar',
            type: 'info'
        });
        if (!daysStr) return;
        
        const days = parseInt(daysStr, 10);
        if (isNaN(days) || days <= 0) return alert('Quantidade inválida.');

        try {
            await API.put(`/admin/tenants/${id}/extend-trial`, { days });
            loadTenants();
        } catch (e) {
            console.error('Failed to update status', e);
            alert(e.message || 'Erro ao estender dias');
        }
    };

    const filtered = tenants.filter(t => 
        t.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const proCount = tenants.filter(t => t.subscription_status === 'pro').length;
    const testCount = tenants.filter(t => t.subscription_status === 'pending').length;

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header" style={{ marginBottom: 24 }}>
                <div>
                    <h1 className="page-title"><ShieldAlert size={28} className="text-purple-600" /> Painel Master Admin</h1>
                    <p className="page-subtitle">Gerencie todas as contas e assinaturas do SaaS</p>
                </div>
                <button className="btn btn-secondary" onClick={loadTenants}>
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Atualizar
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="premium-card" style={{ '--card-color': '#10b981' }}>
                    <div className="stat-label" style={{ fontSize: 13, color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>MRR (Mensal)</div>
                    <div className="stat-value text-green-600" style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.mrr)}
                    </div>
                </div>
                <div className="premium-card" style={{ '--card-color': '#a855f7' }}>
                    <div className="stat-label" style={{ fontSize: 13, color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Assinantes PRO</div>
                    <div className="stat-value text-purple-600" style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>
                        {metrics.activePro} <span style={{ fontSize: 14, color: 'var(--gray-400)', fontWeight: 500 }}>({metrics.conversionRate}%)</span>
                    </div>
                </div>
                <div className="premium-card" style={{ '--card-color': '#f97316' }}>
                    <div className="stat-label" style={{ fontSize: 13, color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Em Período de Teste</div>
                    <div className="stat-value text-orange-600" style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{metrics.activeTrials}</div>
                </div>
                <div className="premium-card" style={{ '--card-color': '#ef4444' }}>
                    <div className="stat-label" style={{ fontSize: 13, color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Comissões a Pagar</div>
                    <div className="stat-value text-red-600" style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.pendingCommissions)}
                    </div>
                </div>
            </div>

            <div className="premium-card" style={{ '--card-color': '#3b82f6', padding: 0, overflow: 'hidden' }}>
                <div className="card-header flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-100)' }}>
                    <h2 className="card-title" style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Todas as Contas</h2>
                    <div className="search-bar" style={{ margin: 0, width: '100%', maxWidth: 300, background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 8 }}>
                        <Search size={16} color="var(--gray-400)" />
                        <input 
                            type="text" 
                            placeholder="Buscar por nome ou e-mail..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 14, width: '100%', padding: '8px 0' }}
                        />
                    </div>
                </div>

                <div className="table-responsive" style={{ padding: '0 24px 24px 24px' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Contato</th>
                                <th>Status</th>
                                <th>Clientes Deles</th>
                                <th>Cadastro</th>
                                <th className="text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && tenants.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-8 text-slate-500">Carregando contas...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-8 text-slate-500">Nenhuma conta encontrada.</td></tr>
                            ) : filtered.map(t => (
                                <tr key={t.id}>
                                    <td>
                                        <div className="font-medium text-slate-800 dark:text-white">{t.name}</div>
                                        <div className="text-xs text-slate-500">{t.id.substring(0,8)}...</div>
                                    </td>
                                    <td>
                                        <div className="text-sm">{t.email}</div>
                                    </td>
                                    <td>
                                        <span className={`badge ${
                                            t.subscription_status === 'pro' ? 'bg-green-100 text-green-700' : 
                                            t.subscription_status === 'beta' ? 'bg-blue-100 text-blue-700' :
                                            'bg-orange-100 text-orange-700'
                                        }`}>
                                            {t.subscription_status === 'pro' ? '👑 PRO' : 
                                             t.subscription_status === 'beta' ? 'Beta' : '⏳ Teste'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="text-sm font-medium">{t.clientsCount || 0}</div>
                                    </td>
                                    <td>
                                        <div className="text-sm">{new Date(t.created_at).toLocaleDateString('pt-BR')}</div>
                                    </td>
                                    <td>
                                        <div className="flex items-center justify-end gap-2">
                                            {t.subscription_status !== 'pro' && (
                                                <>
                                                    <button 
                                                        onClick={() => handleUpdateStatus(t.id, 'pro')}
                                                        className="btn btn-sm bg-green-50 text-green-600 hover:bg-green-100 hover:border-green-200 border border-transparent shadow-none"
                                                        title="Aprovar PRO"
                                                    >
                                                        <Star size={14} /> Dar PRO
                                                    </button>
                                                    <button 
                                                        onClick={() => handleUpdateStatus(t.id, 'pending', true)}
                                                        className="btn btn-sm bg-blue-50 text-blue-600 hover:bg-blue-100 hover:border-blue-200 border border-transparent shadow-none"
                                                        title="Reiniciar 4 Horas"
                                                    >
                                                        <RefreshCw size={14} /> Reset Trial
                                                    </button>
                                                    <button 
                                                        onClick={() => handleAddDays(t.id)}
                                                        className="btn btn-sm bg-purple-50 text-purple-600 hover:bg-purple-100 hover:border-purple-200 border border-transparent shadow-none"
                                                        title="Dar dias de teste"
                                                    >
                                                        <Calendar size={14} /> Dar Dias
                                                    </button>
                                                </>
                                            )}
                                            {t.subscription_status === 'pro' && (
                                                <button 
                                                    onClick={() => handleUpdateStatus(t.id, 'pending')}
                                                    className="btn btn-sm bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-200 border border-transparent shadow-none"
                                                    title="Remover PRO"
                                                >
                                                    Tirar PRO
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* BACKUP PANEL */}
            <div className="premium-card" style={{ '--card-color': '#10b981', marginTop: 32, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Database size={20} color="#10b981" />
                        <div>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Backups do Banco de Dados</h2>
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-500)' }}>Automático às 2h. Guardamos os últimos 14 backups comprimidos.</p>
                        </div>
                    </div>
                    <button
                        onClick={handleRunBackup}
                        disabled={backupRunning}
                        className="btn btn-primary"
                        style={{ background: '#10b981', borderColor: '#10b981', opacity: backupRunning ? 0.7 : 1 }}
                    >
                        <Play size={15} />
                        {backupRunning ? 'Fazendo backup...' : 'Fazer Backup Agora'}
                    </button>
                </div>

                {backupMsg && (
                    <div style={{
                        margin: '16px 24px 0',
                        padding: '10px 14px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        background: backupMsg.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
                        color: backupMsg.startsWith('✅') ? '#16a34a' : '#dc2626',
                        border: `1px solid ${backupMsg.startsWith('✅') ? '#bbf7d0' : '#fecaca'}`,
                    }}>
                        {backupMsg}
                    </div>
                )}

                <div style={{ padding: '0 24px 24px', marginTop: 16 }}>
                    {backups.length === 0 ? (
                        <p style={{ color: 'var(--gray-400)', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>Nenhum backup disponível. Clique em "Fazer Backup Agora".</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {backups.map(b => (
                                <div key={b.fileName} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '10px 14px', background: 'var(--gray-50)',
                                    border: '1px solid var(--gray-100)', borderRadius: 10, flexWrap: 'wrap', gap: 8,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <Database size={16} color="#10b981" />
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)', fontFamily: 'monospace' }}>{b.fileName}</div>
                                            <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                                                {new Date(b.createdAt).toLocaleString('pt-BR')} &middot; {b.sizeKb} KB
                                            </div>
                                        </div>
                                    </div>
                                    <a
                                        href={`${import.meta.env.VITE_API_URL || '/api'}/admin/backups/download/${b.fileName}`}
                                        download={b.fileName}
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 6,
                                            padding: '6px 14px', borderRadius: 8,
                                            background: '#f0fdf4', color: '#16a34a',
                                            border: '1px solid #bbf7d0', fontSize: 12,
                                            fontWeight: 700, textDecoration: 'none',
                                        }}
                                    >
                                        <Download size={13} /> Baixar
                                    </a>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
