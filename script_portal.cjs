const fs = require('fs');
let code = fs.readFileSync('src/pages/PortalCliente.jsx', 'utf8');

const importStatement = "import { jsPDF } from 'jspdf';\nimport html2canvas from 'html2canvas';\n";
code = code.replace("import { useParams } from 'react-router-dom';", "import { useParams } from 'react-router-dom';\n" + importStatement);

const startIdx = code.indexOf('const printComprovante = (quote, company) => {');
const endIdx = code.indexOf('// Linha do tempo') - 3;

if (startIdx !== -1 && endIdx !== -1) {
    const replacement = `const printComprovante = async (quote, company) => {
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
  
  div.innerHTML = \`
    <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:20px;border-bottom:3px solid #2563eb;margin-bottom:32px">
      <div style="font-size:22px;font-weight:800;color:#2563eb">\${company.name}</div>
      <div style="background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:700">✓ Aprovado</div>
    </div>
    <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;display:flex;justify-content:space-between">
      <div><div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Para</div><div style="font-weight:600;font-size:14px">\${quote.client_name || '—'}</div></div>
      <div><div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Proposta</div><div style="font-weight:600;font-size:14px">#\${quote.id?.slice(-6).toUpperCase()}</div></div>
      <div><div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Data</div><div style="font-weight:600;font-size:14px">\${new Date(quote.created_at).toLocaleDateString('pt-BR')}</div></div>
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
        \${services.map(l => \`<tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6">\${l.name || '—'}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right">\${l.qty || 1}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right">\${numFmt(l.price)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right">\${numFmt((l.qty || 1) * (l.price || 0))}</td>
        </tr>\`).join('')}
      </tbody>
    </table>
    <div style="background:#eff6ff;border-radius:8px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
      <div style="font-weight:700">TOTAL</div>
      <div style="font-size:22px;font-weight:800;color:#2563eb">\${numFmt(quote.total)}</div>
    </div>
    \${quote.notes ? \`<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;margin-bottom:24px;font-size:13px;color:#92400e"><strong>Obs.:</strong> \${quote.notes}</div>\` : ''}
    <div style="border-top:1px solid #e5e7eb;padding-top:16px;text-align:center;color:#9ca3af;font-size:11px">\${company.name} · Gerado em \${new Date().toLocaleDateString('pt-BR')}</div>
  \`;

  document.body.appendChild(div);
  
  try {
    const canvas = await html2canvas(div, { scale: 2, useCORS: true, logging: false });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('Comprovante_' + (quote.client_name || 'Cliente').replace(/\\s+/g, '_') + '.pdf');
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
    fs.writeFileSync('src/pages/PortalCliente.jsx', code);
    console.log('Done!');
}
