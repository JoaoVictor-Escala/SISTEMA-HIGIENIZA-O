import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

import { getPortalData, approvePortalQuote } from '../api';
import { CheckCircle, AlertCircle, Clock, Wrench, Star, Phone, FileText, Download, ChevronRight } from 'lucide-react';

const FMT_BRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
const FMT_DATE = (s) => {
  if (!s) return '—';
  const d = new Date(s.replace(' ', 'T'));
  return isNaN(d.valueOf()) ? '—' : d.toLocaleDateString('pt-BR');
};

// Auxiliares de status

const quoteStep = (status) => ({ Pendente: 0, Aprovado: 1, Recusado: -1 }[status] ?? 0);
const orderStep = (status) => ({ Agendado: 1, 'Em Andamento': 2, Finalizado: 3, Aguardando: 1 }[status] ?? 1);

// Geração de Comprovante em PDF
const printComprovante = async (quote, company) => {
  const services = (() => { try { return JSON.parse(quote.services); } catch { return []; } })();
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
    <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:20px;border-bottom:3px solid #2563eb;margin-bottom:32px">
      <div style="font-size:22px;font-weight:800;color:#2563eb">${company.name}</div>
      <div style="background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:700">✓ Aprovado</div>
    </div>
    <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;display:flex;justify-content:space-between">
      <div><div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Para</div><div style="font-weight:600;font-size:14px">${quote.client_name || '—'}</div></div>
      <div><div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Proposta</div><div style="font-weight:600;font-size:14px">#${quote.id?.slice(-6).toUpperCase()}</div></div>
      <div><div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Data</div><div style="font-weight:600;font-size:14px">${new Date(quote.created_at).toLocaleDateString('pt-BR')}</div></div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead>
        <tr>
          <th style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;padding:8px 12px;background:#f3f4f6;text-align:left">Serviço</th>
          <th style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;padding:8px 12px;background:#f3f4f6;text-align:right">Qtd.</th>
          <th style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;padding:8px 12px;background:#f3f4f6;text-align:right">Unit.</th>
          <th style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;padding:8px 12px;background:#f3f4f6;text-align:right">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${services.map(l => `<tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6">${l.name || '—'}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right">${l.qty || 1}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right">${numFmt(l.price)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right">${numFmt((l.qty || 1) * (l.price || 0))}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div style="background:#eff6ff;border-radius:8px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
      <div style="font-weight:700">TOTAL</div>
      <div style="font-size:22px;font-weight:800;color:#2563eb">${numFmt(quote.total)}</div>
    </div>
    ${quote.notes ? `<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;margin-bottom:24px;font-size:13px;color:#92400e"><strong>Obs.:</strong> ${quote.notes}</div>` : ''}
    <div style="border-top:1px solid #e5e7eb;padding-top:16px;text-align:center;color:#9ca3af;font-size:11px">${company.name} · Gerado em ${new Date().toLocaleDateString('pt-BR')}</div>
  `;

  document.body.appendChild(div);
  
  try {
    const canvas = await html2canvas(div, { scale: 2, useCORS: true, logging: false });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('Comprovante_' + (quote.client_name || 'Cliente').replace(/\s+/g, '_') + '.pdf');
  } catch (err) {
    console.error('Erro ao gerar PDF', err);
    alert('Erro ao gerar PDF');
  } finally {
    document.body.removeChild(div);
  }
};
;

// Linha do tempo
function Timeline({ currentStep }) {
  const steps = [
    { label: 'Proposta\nEnviada', icon: FileText },
    { label: 'Aprovada\npelo Cliente', icon: CheckCircle },
    { label: 'Serviço\nAgendado', icon: Clock },
    { label: 'Trabalho\nConcluído', icon: Star },
  ];
  return (
    <div style={{ padding: '24px 20px', background: 'white', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* Progress bar */}
        <div style={{ position: 'absolute', top: 18, left: '12.5%', right: '12.5%', height: 3, background: '#e2e8f0', borderRadius: 2, zIndex: 0 }}>
          <div style={{ height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, #2563eb, #7c3aed)', transition: 'width 0.6s ease', width: `${Math.min(1, currentStep / (steps.length - 1)) * 100}%` }} />
        </div>
        {steps.map((s, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          const Icon = s.icon;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative', zIndex: 1 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? '#2563eb' : active ? 'white' : '#f1f5f9',
                border: active ? '3px solid #2563eb' : done ? 'none' : '2px solid #e2e8f0',
                boxShadow: active ? '0 0 0 4px rgba(37,99,235,0.12)' : 'none',
                transition: 'all 0.4s',
              }}>
                <Icon size={16} color={done ? 'white' : active ? '#2563eb' : '#94a3b8'} />
              </div>
              <div style={{ marginTop: 8, textAlign: 'center', whiteSpace: 'pre-line', fontSize: 10.5, color: done || active ? '#1e293b' : '#94a3b8', fontWeight: active ? 700 : 500, lineHeight: 1.4 }}>
                {s.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Portal Principal
export default function PortalCliente() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadData = () => {
      getPortalData(id)
        .then(d => {
          if (!mounted) return;
          if (d?.error || !d?.quote) { setError(d?.error || true); }
          else { setData(d); }
          setLoading(false);
        })
        .catch(() => { 
          if (!mounted) return;
          setError(true); 
          setLoading(false); 
        });
    };

    loadData(); // Primeira carga
    const interval = setInterval(loadData, 3000); // Atualiza a cada 3 segundos (ao vivo)

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [id]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await approvePortalQuote(id);
      if (res.error) throw new Error(res.error);
      setData(prev => ({ ...prev, quote: { ...prev.quote, status: 'Aprovado' } }));
      setApproved(true);
    } catch (err) {
      alert(err.message || 'Erro ao aprovar. Tente novamente.');
    } finally {
      setApproving(false);
    }
  };

  // Carregamento
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{ color: '#64748b', fontSize: 14 }}>Carregando sua proposta...</p>
    </div>
  );

  // Erro
  if (error || !data) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc', padding: '20px', textAlign: 'center' }}>
      <div style={{ background: '#fef2f2', borderRadius: '50%', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <AlertCircle size={36} color="#dc2626" />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Proposta não encontrada</h2>
      <p style={{ color: '#6b7280', fontSize: 14, maxWidth: 320 }}>Verifique o link enviado por WhatsApp. Se o problema persistir, entre em contato com a empresa.</p>
    </div>
  );

  const { quote, company, order } = data;
  const services = (() => { try { return JSON.parse(quote.services); } catch { return []; } })();
  const isApproved = quote.status === 'Aprovado';
  const isPending  = quote.status === 'Pendente';
  const isRefused  = quote.status === 'Recusado';

  // Calculate timeline step
  let step = quoteStep(quote.status);
  if (isApproved && order) step = orderStep(order.status) + 1;

  const waPhone = company.whatsapp ? `https://wa.me/55${company.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Tenho uma dúvida sobre a proposta #${quote.id?.slice(-6).toUpperCase()}.`)}` : null;

  return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pop { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        .portal-card { animation: slideUp 0.4s ease; }
      `}</style>

      <div style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 40 }}>

        {/* CABEÇALHO */}
        <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #7c3aed 100%)', padding: '36px 24px 28px', textAlign: 'center' }}>
          {/* System Logo instead of initials */}
          <div style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.15)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ position: 'relative', width: '38px', height: '38px' }}>
              <div style={{ position: 'absolute', width: '20px', height: '20px', background: 'linear-gradient(135deg, #c4b5fd, #8b5cf6)', borderRadius: '6px', transform: 'rotate(45deg)', left: '15px', top: '5px' }}></div>
              <div style={{ position: 'absolute', width: '20px', height: '20px', background: 'linear-gradient(135deg, #93c5fd, #3b82f6)', borderRadius: '6px', transform: 'rotate(45deg)', left: '3px', top: '13px', boxShadow: '0 2px 8px rgba(59,130,246,0.4)' }}></div>
            </div>
          </div>
          <h1 style={{ color: 'white', fontSize: 20, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.3px' }}>{company.name}</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>Proposta de Serviços · #{quote.id?.slice(-6).toUpperCase()}</p>

          {/* Status pill */}
          <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700,
            background: isApproved ? 'rgba(74,222,128,0.2)' : isPending ? 'rgba(251,191,36,0.2)' : 'rgba(248,113,113,0.2)',
            color: isApproved ? '#4ade80' : isPending ? '#fbbf24' : '#f87171',
            border: `1px solid ${isApproved ? 'rgba(74,222,128,0.3)' : isPending ? 'rgba(251,191,36,0.3)' : 'rgba(248,113,113,0.3)'}`,
          }}>
            {isApproved ? <CheckCircle size={14} /> : isPending ? <Clock size={14} /> : <AlertCircle size={14} />}
            {quote.status}
          </div>
        </div>

        {/* LINHA DO TEMPO */}
        {!isRefused && <Timeline currentStep={step} />}

        {/* APROVADO */}
        {(isApproved || approved) && (
          <div className="portal-card" style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderLeft: '4px solid #16a34a', margin: '0 0 0', padding: '20px 24px' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ background: '#16a34a', borderRadius: '50%', width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pop 0.5s ease' }}>
                <CheckCircle size={20} color="white" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#14532d', marginBottom: 4 }}>
                  {approved ? 'Proposta aprovada com sucesso!' : 'Proposta aprovada!'}
                </div>
                <div style={{ fontSize: 13, color: '#166534' }}>
                  {order
                    ? `Seu serviço está ${order.status === 'Finalizado' ? 'concluído' : order.status === 'Em Andamento' ? 'em andamento' : 'agendado'}! ${order.scheduled_for ? 'Data: ' + new Date(order.scheduled_for).toLocaleDateString('pt-BR') : 'Aguarde o contato para agendamento.'}`
                    : 'Recebemos sua confirmação! Entraremos em contato em breve para agendar o melhor horário.'
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RECUSADO */}
        {isRefused && (
          <div style={{ background: '#fef2f2', borderLeft: '4px solid #dc2626', padding: '20px 24px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <AlertCircle size={22} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#7f1d1d', marginBottom: 4 }}>Proposta não aceita</div>
              <div style={{ fontSize: 13, color: '#991b1b' }}>Esta proposta foi recusada. Fale conosco para entender como podemos ajudá-lo melhor.</div>
            </div>
          </div>
        )}

        {/* STATUS DO SERVIÇO */}
        {order && isApproved && (
          <div className="portal-card" style={{ background: 'white', margin: '12px 0 0', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: order.status === 'Finalizado' ? '#f0fdf4' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {order.status === 'Finalizado' ? <CheckCircle size={22} color="#16a34a" /> : <Wrench size={22} color="#2563eb" />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Status do Serviço</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>{order.status}</div>
              {order.scheduled_for && (
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                  {new Date(order.scheduled_for).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}><ChevronRight size={16} /></div>
          </div>
        )}

        {/* AVALIAÇÃO DO GOOGLE */}
        {order?.status === 'Finalizado' && company.googleReviewLink && (
          <div className="portal-card" style={{ background: '#fffbeb', border: '1px solid #fde68a', margin: '12px 0 0', padding: '20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
            <div style={{ display: 'flex', gap: 4 }}>{[1,2,3,4,5].map(i => <Star key={i} size={24} color="#f59e0b" fill="#f59e0b" />)}</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#92400e', marginBottom: 4 }}>Como foi nossa higienização?</div>
              <div style={{ fontSize: 13, color: '#b45309' }}>Sua avaliação no Google é muito importante para nós! Leva menos de 1 minuto.</div>
            </div>
            <a href={company.googleReviewLink} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 4,
              padding: '12px 20px', background: '#f59e0b', color: 'white', borderRadius: 12,
              fontSize: 14, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
            }}>
              Avaliar no Google
            </a>
          </div>
        )}

        {/* DETALHES DA PROPOSTA */}
        <div className="portal-card" style={{ background: 'white', margin: '12px 0 0', overflow: 'hidden' }}>
          {/* Meta row */}
          <div className="portal-meta-grid">
            <div style={{ padding: '16px 20px', borderRight: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Para</div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{quote.client_name || '—'}</div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Emitido em</div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{FMT_DATE(quote.created_at)}</div>
            </div>
          </div>

          {/* Services table */}
          <div style={{ padding: '20px 20px 0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Serviços</div>
            {services.length === 0 ? (
              <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '16px 0' }}>Nenhum item detalhado</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {services.map((l, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14, color: '#111827' }}>{l.name || '—'}</div>
                      {Number(l.qty) > 1 && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{l.qty}x · {FMT_BRL(l.price)} cada</div>}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{FMT_BRL((l.qty || 1) * (l.price || 0))}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
            <div style={{ background: 'linear-gradient(135deg, #eff6ff, #f5f3ff)', borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 -20px', marginLeft: '-0px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1e3a8a' }}>TOTAL</div>
              <div style={{ fontWeight: 800, fontSize: 24, color: '#2563eb' }}>{FMT_BRL(quote.total)}</div>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div style={{ margin: '0', padding: '14px 20px', background: '#fffbeb', borderTop: '1px solid #fef3c7' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Observações</div>
              <div style={{ fontSize: 13, color: '#78350f' }}>{quote.notes}</div>
            </div>
          )}
        </div>

        {/* AÇÕES */}
        <div className="portal-card" style={{ padding: '24px 0 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Approve button */}
          {isPending && !approved && (
            <button onClick={handleApprove} disabled={approving} style={{
              width: '100%', padding: '18px 24px', background: 'linear-gradient(135deg, #16a34a, #15803d)',
              color: 'white', border: 'none', borderRadius: 14, fontSize: 17, fontWeight: 800,
              cursor: approving ? 'not-allowed' : 'pointer', opacity: approving ? 0.7 : 1,
              boxShadow: '0 4px 20px rgba(22,163,74,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'all 0.2s', fontFamily: 'inherit',
            }}>
              {approving ? (
                <>
                  <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Aprovando...
                </>
              ) : (
                <><CheckCircle size={20} /> Aprovar Proposta</>
              )}
            </button>
          )}

          {/* PDF Comprovante */}
          {isApproved && (
            <button onClick={() => printComprovante(quote, company)} style={{
              width: '100%', padding: '14px 24px', background: 'white',
              color: '#2563eb', border: '2px solid #2563eb', borderRadius: 12, fontSize: 15, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.15s', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(37,99,235,0.1)',
            }}>
              <Download size={17} /> Baixar Comprovante (PDF)
            </button>
          )}

          {/* WhatsApp contact */}
          {waPhone && (
            <a href={waPhone} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px 24px', background: '#25d366', color: 'white', borderRadius: 12,
              fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 2px 8px rgba(37,211,102,0.3)',
            }}>
              <Phone size={17} /> Falar com {company.name}
            </a>
          )}
        </div>

        {/* RODAPÉ */}
        <div style={{ textAlign: 'center', padding: '28px 24px 0', fontSize: 11.5, color: '#94a3b8' }}>
          Proposta emitida por <strong>{company.name}</strong> · Higienização Profissional
        </div>
      </div>
    </div>
  );
}
