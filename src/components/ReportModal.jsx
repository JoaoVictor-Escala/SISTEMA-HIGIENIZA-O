import React, { useRef, useState } from 'react';
import { X, Upload, FileText, CheckCircle, Download, Camera } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { createPortal } from 'react-dom';

const FMT_DATE = (str) => {
  if (!str) return '';
  const d = new Date(str);
  return isNaN(d) ? '' : d.toLocaleDateString('pt-BR');
};

export default function ReportModal({ order, clientName, companyName, onClose }) {
  const [photoBefore, setPhotoBefore] = useState(null);
  const [photoAfter, setPhotoAfter] = useState(null);
  const [productsUsed, setProductsUsed] = useState('');
  const [tips, setTips] = useState('• Evite sentar ou utilizar o estofado nas próximas 12 horas.\n• Mantenha o ambiente ventilado para acelerar a secagem.\n• Aspire semanalmente para remover poeira superficial.');
  const [generating, setGenerating] = useState(false);

  const printRef = useRef(null);

  const handleImageUpload = (e, setter) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const element = printRef.current;
      // Temporarily make it visible for rendering if it was hidden
      element.style.display = 'block';

      const canvas = await html2canvas(element, {
        scale: 2, // higher resolution
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      // A4 dimensions in mm
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Laudo_Tecnico_${clientName.replace(/\s+/g, '_')}.pdf`);
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente imagens menores.');
    } finally {
      // Hide again if needed, though we can just render it off-screen
      setGenerating(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 999999 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '800px', width: '95%' }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Laudo Técnico</div>
            <div className="modal-sub">OS: {order.service || order.description} - {clientName}</div>
          </div>
          <button className="btn btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
          <div className="form-grid form-grid-2">
            {/* Foto Antes */}
            <div className="field">
              <label className="field-label">Foto do Antes *</label>
              <div style={{
                border: '2px dashed var(--gray-300)',
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center',
                background: '#f8fafc',
                cursor: 'pointer',
                position: 'relative'
              }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleImageUpload(e, setPhotoBefore)}
                  style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }}
                />
                {photoBefore ? (
                  <img src={photoBefore} alt="Antes" style={{ maxHeight: 150, borderRadius: 8, margin: '0 auto' }} />
                ) : (
                  <div style={{ color: 'var(--gray-400)' }}>
                    <Camera size={32} style={{ margin: '0 auto 8px' }} />
                    <span style={{ fontSize: 13 }}>Clique ou arraste a foto do <b>Antes</b></span>
                  </div>
                )}
              </div>
            </div>

            {/* Foto Depois */}
            <div className="field">
              <label className="field-label">Foto do Depois *</label>
              <div style={{
                border: '2px dashed var(--gray-300)',
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center',
                background: '#f8fafc',
                cursor: 'pointer',
                position: 'relative'
              }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleImageUpload(e, setPhotoAfter)}
                  style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }}
                />
                {photoAfter ? (
                  <img src={photoAfter} alt="Depois" style={{ maxHeight: 150, borderRadius: 8, margin: '0 auto' }} />
                ) : (
                  <div style={{ color: 'var(--gray-400)' }}>
                    <Camera size={32} style={{ margin: '0 auto 8px' }} />
                    <span style={{ fontSize: 13 }}>Clique ou arraste a foto do <b>Depois</b></span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="field" style={{ marginTop: 16 }}>
            <label className="field-label">Produtos e Tratamentos Utilizados</label>
            <textarea 
              className="field-input" 
              rows="3" 
              placeholder="Ex: Shampoo neutro para estofados, neutralizador de odores, impermeabilizante à base de água..."
              value={productsUsed}
              onChange={e => setProductsUsed(e.target.value)}
            />
          </div>

          <div className="field" style={{ marginTop: 16 }}>
            <label className="field-label">Dicas de Conservação e Cuidados</label>
            <textarea 
              className="field-input" 
              rows="4" 
              value={tips}
              onChange={e => setTips(e.target.value)}
            />
          </div>

        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>
            O PDF será gerado e baixado no seu dispositivo.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={generatePDF} 
              disabled={generating || !photoBefore || !photoAfter}
            >
              {generating ? 'Gerando...' : <><Download size={16} /> Baixar PDF</>}
            </button>
          </div>
        </div>

        {/* --- OFF-SCREEN PDF LAYOUT --- */}
        <div style={{ overflow: 'hidden', height: 0, width: 0, position: 'absolute' }}>
          <div ref={printRef} style={{ 
            width: '794px', // A4 width at 96 DPI
            minHeight: '1123px', // A4 height at 96 DPI
            backgroundColor: '#ffffff',
            padding: '40px 50px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#1e293b'
          }}>
            
            {/* Header */}
            <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 20, marginBottom: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ margin: 0, color: '#0f172a', fontSize: '28px', fontWeight: 800 }}>LAUDO TÉCNICO</h1>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Certificado de Higienização</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6' }}>{companyName}</div>
                <div style={{ color: '#64748b', fontSize: '13px', marginTop: 4 }}>Data: {FMT_DATE(order.scheduled_for)}</div>
              </div>
            </div>

            {/* Client Info */}
            <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '30px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Cliente</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>{clientName}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Serviço Realizado</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>{order.service || order.description}</div>
                </div>
              </div>
            </div>

            {/* Photos */}
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '18px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>Registro Fotográfico</h2>
              <div style={{ display: 'flex', gap: '24px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ backgroundColor: '#ef4444', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, display: 'inline-block', marginBottom: '10px' }}>ANTES</div>
                  <div style={{ height: '260px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
                    {photoBefore && <img src={photoBefore} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ backgroundColor: '#10b981', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, display: 'inline-block', marginBottom: '10px' }}>DEPOIS</div>
                  <div style={{ height: '260px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
                    {photoAfter && <img src={photoAfter} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                </div>
              </div>
            </div>

            {/* Products Used */}
            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ fontSize: '18px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} color="#3b82f6" />
                Produtos e Tratamentos Aplicados
              </h2>
              <div style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
                {productsUsed || 'Nenhum produto específico descrito.'}
              </div>
            </div>

            {/* Tips */}
            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ fontSize: '18px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={20} color="#10b981" />
                Dicas de Conservação
              </h2>
              <div style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap', padding: '0 10px' }}>
                {tips || 'Nenhuma dica registrada.'}
              </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 'auto', paddingTop: '40px', borderTop: '2px solid #e2e8f0', textAlign: 'center' }}>
              <p style={{ margin: 0, color: '#64748b', fontSize: '12px' }}>
                Laudo técnico gerado via sistema <strong>{companyName}</strong>. Agradecemos a preferência!
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
