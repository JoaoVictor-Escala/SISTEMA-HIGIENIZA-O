import React, { useState } from 'react';
import { Building2, Phone, Calendar, CheckCircle, ChevronRight } from 'lucide-react';
import { setConfig as apiSetConfig, API } from '../api';
import { useNavigate } from 'react-router-dom';

const STEPS = [
  { id: 1, icon: Building2, title: 'Sua Empresa', subtitle: 'Como vamos te chamar?' },
  { id: 2, icon: Phone, title: 'Contato & Meta', subtitle: 'Configure seu WhatsApp e meta mensal' },
  { id: 3, icon: Calendar, title: 'Pronto para decolar! 🚀', subtitle: 'Seu sistema está configurado' },
];

export default function OnboardingWizard({ onComplete }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    companyName: '',
    ownerName: '',
    whatsapp: '',
    monthlyGoal: '5000',
  });

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  const handleNext = async () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else if (step === STEPS.length - 1) {
      // Save step 2 then go to completion
      setSaving(true);
      try {
        await apiSetConfig({
          companyName: form.companyName || 'Minha Empresa',
          ownerName: form.ownerName || 'Proprietário',
          whatsapp: form.whatsapp,
          monthlyGoal: Number(form.monthlyGoal) || 5000,
        });
      } catch {/* non-blocking */}
      setSaving(false);
      setStep(STEPS.length);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // POST /api/onboarding/complete marks onboarding done AND sends welcome email
      await API.post('/onboarding/complete', {});
    } catch {/* non-blocking */}
    setSaving(false);
    onComplete();
  };

  const handleGoToAgenda = async () => {
    setSaving(true);
    try {
      await API.post('/onboarding/complete', {});
    } catch {/* non-blocking */}
    setSaving(false);
    onComplete();
    navigate('/agenda');
  };

  const currentStep = STEPS[step - 1];
  const StepIcon = currentStep?.icon;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #0f172a, #1e293b)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '520px',
        boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
        overflow: 'hidden',
        animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        {/* Progress Bar */}
        <div style={{ height: '4px', background: '#1e293b', position: 'relative' }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
            transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
            borderRadius: '0 4px 4px 0',
          }} />
        </div>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)',
          padding: '36px 40px 32px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-30px', right: '-30px',
            width: '120px', height: '120px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '50%',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: '48px', height: '48px',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}>
              {StepIcon && <StepIcon size={24} color="white" />}
            </div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>
                {step < STEPS.length ? `Passo ${step} de ${STEPS.length - 1}` : 'Configuração Completa'}
              </div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'white' }}>
                {currentStep?.title}
              </h2>
            </div>
          </div>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: 1.5 }}>
            {currentStep?.subtitle}
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '36px 40px' }}>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                  Nome da sua empresa *
                </label>
                <input
                  autoFocus
                  value={form.companyName}
                  onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                  placeholder="Ex: Higienização Pro, CleanMax..."
                  style={{
                    width: '100%', padding: '14px 16px',
                    background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px', color: '#f1f5f9', fontSize: '15px',
                    fontWeight: 500, outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                  Seu nome (proprietário)
                </label>
                <input
                  value={form.ownerName}
                  onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))}
                  placeholder="Como devemos te chamar?"
                  style={{
                    width: '100%', padding: '14px 16px',
                    background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px', color: '#f1f5f9', fontSize: '15px',
                    fontWeight: 500, outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                  WhatsApp da empresa
                </label>
                <input
                  autoFocus
                  value={form.whatsapp}
                  onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                  placeholder="(31) 99999-0000"
                  type="tel"
                  style={{
                    width: '100%', padding: '14px 16px',
                    background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px', color: '#f1f5f9', fontSize: '15px',
                    fontWeight: 500, outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = '#25d366'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Aparece nos orçamentos enviados ao cliente
                </p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                  Meta de faturamento mensal (R$)
                </label>
                <input
                  value={form.monthlyGoal}
                  onChange={e => setForm(f => ({ ...f, monthlyGoal: e.target.value.replace(/\D/g, '') }))}
                  placeholder="5000"
                  type="text"
                  inputMode="numeric"
                  style={{
                    width: '100%', padding: '14px 16px',
                    background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px', color: '#f1f5f9', fontSize: '15px',
                    fontWeight: 500, outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Usamos isso para mostrar o progresso no seu dashboard
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '80px', height: '80px', margin: '0 auto 20px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 40px rgba(16,185,129,0.3)',
              }}>
                <CheckCircle size={40} color="white" />
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 800, color: '#f1f5f9' }}>
                {form.companyName || 'Sua empresa'} está pronta! 🎉
              </h3>
              <p style={{ margin: '0 0 28px', color: '#64748b', fontSize: '14px', lineHeight: 1.6 }}>
                Tudo configurado. Agora você pode cadastrar sua primeira ordem de serviço ou explorar o sistema.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  onClick={handleGoToAgenda}
                  disabled={saving}
                  style={{
                    width: '100%', padding: '14px',
                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    border: 'none', borderRadius: '12px',
                    color: 'white', fontSize: '15px', fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: '8px',
                    boxShadow: '0 4px 20px rgba(59,130,246,0.3)',
                  }}
                >
                  <Calendar size={18} />
                  Criar minha primeira OS na Agenda
                </button>
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  style={{
                    width: '100%', padding: '13px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#94a3b8', fontSize: '14px', fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Explorar o sistema primeiro
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer — next button (only for steps 1 and 2) */}
        {step < 3 && (
          <div style={{ padding: '0 40px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Step dots */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {[1, 2].map(s => (
                <div key={s} style={{
                  width: s === step ? '20px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: s === step ? '#3b82f6' : 'rgba(255,255,255,0.15)',
                  transition: 'all 0.3s ease',
                }} />
              ))}
            </div>
            <button
              onClick={handleNext}
              disabled={saving || (step === 1 && !form.companyName.trim())}
              style={{
                padding: '12px 28px',
                background: form.companyName.trim() || step === 2
                  ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                  : 'rgba(255,255,255,0.05)',
                border: 'none', borderRadius: '12px',
                color: form.companyName.trim() || step === 2 ? 'white' : '#475569',
                fontSize: '14px', fontWeight: 700,
                cursor: form.companyName.trim() || step === 2 ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'all 0.2s',
                boxShadow: form.companyName.trim() || step === 2 ? '0 4px 16px rgba(59,130,246,0.25)' : 'none',
              }}
            >
              {saving ? 'Salvando...' : step === 2 ? 'Concluir Configuração' : 'Próximo'}
              {!saving && <ChevronRight size={16} />}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
