const fs = require('fs');
let code = fs.readFileSync('src/pages/Orcamentos.jsx', 'utf8');

const importStatement = "import { jsPDF } from 'jspdf';\nimport html2canvas from 'html2canvas';\n";
code = code.replace("import { useConfirm } from '../context/ConfirmContext';", "import { useConfirm } from '../context/ConfirmContext';\n" + importStatement);

const startIdx = code.indexOf('const generatePDF = (q, clientName, companyName, whatsapp) => {');
const endIdx = code.indexOf('const buildWhatsAppMessage = ') - 3;

if (startIdx !== -1 && endIdx !== -1) {
    const replacement = `const generatePDF = async (q, clientName, companyName, whatsapp) => {
  const lines = (() => { try { return JSON.parse(q.lines); } catch { return []; } })();
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
  
  div.innerHTML = \`
    <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:3px solid #2563eb;margin-bottom:32px">
      <div>
        <div style="font-size:26px;font-weight:800;color:#2563eb">\${companyName}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px">Higienização Profissional\${whatsapp ? ' · ' + whatsapp : ''}</div>
      </div>
      <div>
        <div style="font-size:22px;font-weight:700;text-align:right">ORÇAMENTO</div>
        <div style="font-size:13px;color:#6b7280;text-align:right">#\${q.id.slice(-6).toUpperCase()} · \${new Date().toLocaleDateString('pt-BR')}</div>
      </div>
    </div>
    <div style="background:#f3f4f6;border-left:4px solid #2563eb;border-radius:6px;padding:14px 18px;margin-bottom:28px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:4px">Para</div>
      <div style="font-size:20px;font-weight:700">\${clientName}</div>
    </div>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;padding:8px 14px;border-radius:6px;font-size:13px;font-weight:600;display:inline-block;margin-bottom:24px">✓ Válido por 15 dias</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead>
        <tr>
          <th style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;padding:10px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;text-align:left">Serviço / Item</th>
          <th style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;padding:10px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;text-align:right">Qtd.</th>
          <th style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;padding:10px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;text-align:right">Valor Unit.</th>
          <th style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;padding:10px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;text-align:right">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        \${lines.map(l => \`<tr>
          <td style="padding:12px 14px;border-bottom:1px solid #f3f4f6">\${l.name || '—'}</td>
          <td style="padding:12px 14px;border-bottom:1px solid #f3f4f6;text-align:right">\${l.qty || 1}</td>
          <td style="padding:12px 14px;border-bottom:1px solid #f3f4f6;text-align:right">\${numFmt(l.price)}</td>
          <td style="padding:12px 14px;border-bottom:1px solid #f3f4f6;text-align:right">\${numFmt((l.qty || 1) * (l.price || 0))}</td>
        </tr>\`).join('')}
        <tr>
          <td colspan="3" style="border-top:2px solid #e5e7eb;background:#eff6ff;padding:14px;font-weight:700;text-align:right">TOTAL</td>
          <td style="border-top:2px solid #e5e7eb;background:#eff6ff;padding:14px;font-size:20px;font-weight:800;color:#2563eb;text-align:right">\${numFmt(q.total)}</td>
        </tr>
      </tbody>
    </table>
    \${q.notes ? \`<div style="font-size:13px;color:#6b7280;background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:12px 16px;margin-bottom:24px"><strong>Obs.:</strong> \${q.notes}</div>\` : ''}
    <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;color:#9ca3af;font-size:11px">
      <span>\${companyName} — Higienização Profissional</span>
      <span>Gerado em \${new Date().toLocaleDateString('pt-BR')}</span>
    </div>
  \`;

  document.body.appendChild(div);
  
  try {
    const canvas = await html2canvas(div, { scale: 2, useCORS: true, logging: false });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('Orcamento_' + clientName.replace(/\\s+/g, '_') + '.pdf');
  } catch (err) {
    console.error('Erro ao gerar PDF', err);
    alert('Erro ao gerar PDF');
  } finally {
    document.body.removeChild(div);
  }
};
`;
    const chunkToRemove = code.substring(startIdx, endIdx);
    code = code.replace(chunkToRemove, replacement);
    fs.writeFileSync('src/pages/Orcamentos.jsx', code);
    console.log('Done!');
}
