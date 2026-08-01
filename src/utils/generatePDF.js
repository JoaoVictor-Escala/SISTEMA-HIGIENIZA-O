import jsPDF from 'jspdf';

const FMT_BRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const pct = (v, base) => base === 0 ? '—' : (v / base * 100).toFixed(1) + '%';
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
               'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const CUSTOS_VARIAVEIS = ['Materiais/Insumos', 'Combustível', 'Equipamentos'];
const DESPESAS_FIXAS   = ['Funcionário', 'Aluguel', 'Outro'];
const CATEGORIAS_RECEITA = ['Serviço de Higienização', 'Impermeabilização', 'Orçamento Aprovado', 'Outro'];

// Funções auxiliares
const hex2rgb = (hex) => {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return [r,g,b];
};

/**
 * Draws a filled rectangle + text label (table row)
 */
function drawRow(doc, y, label, valueStr, opts = {}) {
  const {
    indent = 0, bold = false, bg = null, labelColor = [30,41,59],
    valueColor = null, pageW = 210, marginX = 16, rowH = 8,
  } = opts;

  if (bg) {
    doc.setFillColor(...hex2rgb(bg));
    doc.rect(marginX, y, pageW - marginX * 2, rowH, 'F');
  }

  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(bold ? 10 : 9.5);
  doc.setTextColor(...labelColor);
  doc.text(label, marginX + 4 + indent, y + rowH / 2 + 1.2, { baseline: 'middle' });

  if (valueStr !== undefined) {
    const [vr, vg, vb] = valueColor ?? labelColor;
    doc.setTextColor(vr, vg, vb);
    doc.text(valueStr, pageW - marginX - 4, y + rowH / 2 + 1.2, { baseline: 'middle', align: 'right' });
  }

  return y + rowH;
}

// Exportação do PDF
export function generateFinanceiroPDF({ txs, filterMonth, filterYear, allTime, companyName = 'LimpeJá' }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const marginX = 16;
  const now = new Date();
  const periodo = allTime ? 'Todos os períodos' : `${MESES[filterMonth]} ${filterYear}`;

  // Filtra as transações
  const filtered = txs.filter(t => {
    if (allTime) return true;
    const dateStr = t.date || t.created_at?.slice(0, 10);
    if (!dateStr) return false;
    const d = new Date(dateStr + 'T00:00:00');
    return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
  });

  const receitas   = filtered.filter(t => t.type === 'receita');
  const despesas   = filtered.filter(t => t.type === 'despesa');

  const receitaBruta = receitas.reduce((a, t) => a + Number(t.amount || 0), 0);

  const receitasByCat = CATEGORIAS_RECEITA.reduce((acc, cat) => {
    acc[cat] = receitas.filter(t => t.category === cat).reduce((a, t) => a + Number(t.amount || 0), 0);
    return acc;
  }, {});

  const custosVar = CUSTOS_VARIAVEIS.reduce((acc, cat) => {
    acc[cat] = despesas.filter(t => t.category === cat).reduce((a, t) => a + Number(t.amount || 0), 0);
    return acc;
  }, {});
  const totalCustos = Object.values(custosVar).reduce((a, v) => a + v, 0);
  const lucroBruto = receitaBruta - totalCustos;

  const despesasFix = DESPESAS_FIXAS.reduce((acc, cat) => {
    acc[cat] = despesas.filter(t => t.category === cat).reduce((a, t) => a + Number(t.amount || 0), 0);
    return acc;
  }, {});
  const totalDespesasFix = Object.values(despesasFix).reduce((a, v) => a + v, 0);
  const lucroOperacional = lucroBruto - totalDespesasFix;
  const lucroLiquido = lucroOperacional;

  // Cabeçalho da página
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 42, 'F');

  // Accent stripe
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, 4, 42, 'F');

  // Company name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(248, 250, 252);
  doc.text(companyName, marginX + 8, 16);

  // Report title
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text('DEMONSTRATIVO DO RESULTADO DO EXERCÍCIO (DRE)', marginX + 8, 25);
  doc.text(`Período: ${periodo}`, marginX + 8, 32);
  doc.text(`Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, marginX + 8, 38);

  // Lucro Líquido highlight (top right)
  const llColor = lucroLiquido >= 0 ? [74, 222, 128] : [248, 113, 113];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text('Lucro Líquido', pageW - marginX - 2, 20, { align: 'right' });
  doc.setFontSize(18);
  doc.setTextColor(...llColor);
  doc.text(FMT_BRL(lucroLiquido), pageW - marginX - 2, 31, { align: 'right' });
  if (receitaBruta > 0) {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Margem: ${pct(lucroLiquido, receitaBruta)}`, pageW - marginX - 2, 38, { align: 'right' });
  }

  // Resumo
  const boxes = [
    { label: 'Receita Bruta', value: FMT_BRL(receitaBruta), color: '#3b82f6' },
    { label: 'Lucro Bruto',   value: FMT_BRL(lucroBruto),   color: '#8b5cf6' },
    { label: 'Margem Bruta',  value: pct(lucroBruto, receitaBruta), color: '#a78bfa' },
    { label: 'Lucro Líquido', value: FMT_BRL(lucroLiquido), color: lucroLiquido >= 0 ? '#4ade80' : '#f87171' },
  ];
  const boxW = (pageW - marginX * 2 - 12) / 4;
  const boxY = 46;
  boxes.forEach((box, i) => {
    const bx = marginX + i * (boxW + 4);
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(bx, boxY, boxW, 16, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(box.label.toUpperCase(), bx + 4, boxY + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...hex2rgb(box.color));
    doc.text(box.value, bx + 4, boxY + 12);
  });

  // Tabela do DRE
  let y = 70;

  // Section label helper
  const sectionLabel = (text, yy) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(text, marginX + 4, yy + 4);
    return yy + 7;
  };

  // Separator line
  const sep = (yy) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, yy, pageW - marginX, yy);
    return yy + 3;
  };

  // Receitas
  y = sectionLabel('RECEITAS', y);
  y = drawRow(doc, y, '(+) Receita Bruta de Serviços', FMT_BRL(receitaBruta), {
    bold: true, bg: '#eff6ff', labelColor: [37, 99, 235], valueColor: [37, 99, 235],
  });
  CATEGORIAS_RECEITA.forEach(cat => {
    if (receitasByCat[cat] > 0) {
      y = drawRow(doc, y, cat, `${FMT_BRL(receitasByCat[cat])}  ${pct(receitasByCat[cat], receitaBruta)}`, {
        indent: 6, labelColor: [100, 116, 139], valueColor: [100, 116, 139],
      });
    }
  });

  y = sep(y + 1);

  // Custos Variáveis
  y = sectionLabel('CUSTOS VARIÁVEIS (CMV)', y);
  y = drawRow(doc, y, '(−) Custos dos Serviços Prestados', `(${FMT_BRL(totalCustos)})`, {
    bold: true, bg: '#fff7ed', labelColor: [194, 65, 12], valueColor: [194, 65, 12],
  });
  CUSTOS_VARIAVEIS.forEach(cat => {
    if (custosVar[cat] > 0) {
      y = drawRow(doc, y, cat, `(${FMT_BRL(custosVar[cat])})  ${pct(custosVar[cat], receitaBruta)}`, {
        indent: 6, labelColor: [100, 116, 139], valueColor: [100, 116, 139],
      });
    }
  });

  y = sep(y + 1);

  // Lucro Bruto
  const lbColor = lucroBruto >= 0 ? '#16a34a' : '#dc2626';
  y = drawRow(doc, y, '(=) LUCRO BRUTO', `${FMT_BRL(lucroBruto)}  ${pct(lucroBruto, receitaBruta)}`, {
    bold: true, bg: lucroBruto >= 0 ? '#f0fdf4' : '#fef2f2',
    labelColor: hex2rgb(lbColor), valueColor: hex2rgb(lbColor), rowH: 10,
  });

  y = sep(y + 2);

  // Despesas Operacionais
  y = sectionLabel('DESPESAS OPERACIONAIS (OpEx)', y);
  y = drawRow(doc, y, '(−) Despesas Operacionais Fixas', `(${FMT_BRL(totalDespesasFix)})`, {
    bold: true, bg: '#fef2f2', labelColor: [185, 28, 28], valueColor: [185, 28, 28],
  });
  DESPESAS_FIXAS.forEach(cat => {
    if (despesasFix[cat] > 0) {
      y = drawRow(doc, y, cat, `(${FMT_BRL(despesasFix[cat])})  ${pct(despesasFix[cat], receitaBruta)}`, {
        indent: 6, labelColor: [100, 116, 139], valueColor: [100, 116, 139],
      });
    }
  });

  y = sep(y + 1);

  // Resultado Final
  const llC = hex2rgb(lucroLiquido >= 0 ? '#16a34a' : '#dc2626');
  y = drawRow(doc, y, '(=) Lucro Operacional (EBITDA)', `${FMT_BRL(lucroOperacional)}  ${pct(lucroOperacional, receitaBruta)}`, {
    bold: true, labelColor: llC, valueColor: llC, rowH: 9,
  });

  // Final box — LUCRO LÍQUIDO
  y += 4;
  doc.setFillColor(...hex2rgb(lucroLiquido >= 0 ? '#f0fdf4' : '#fef2f2'));
  doc.roundedRect(marginX, y, pageW - marginX * 2, 14, 3, 3, 'F');
  doc.setDrawColor(...hex2rgb(lucroLiquido >= 0 ? '#16a34a' : '#dc2626'));
  doc.setLineWidth(0.6);
  doc.roundedRect(marginX, y, pageW - marginX * 2, 14, 3, 3, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...llC);
  doc.text('(=) LUCRO LÍQUIDO DO EXERCÍCIO', marginX + 5, y + 9);
  doc.text(FMT_BRL(lucroLiquido), pageW - marginX - 5, y + 9, { align: 'right' });
  if (receitaBruta > 0) {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Margem Líquida: ${pct(lucroLiquido, receitaBruta)}`, pageW - marginX - 5, y + 13.5, { align: 'right' });
  }
  y += 20;

  // Tabela de Lançamentos
  if (filtered.length > 0) {
    // New page if not enough space
    if (y > pageH - 70) {
      doc.addPage();
      y = 20;
    }

    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('Lançamentos do Período', marginX, y);
    y += 7;

    // Table header
    doc.setFillColor(15, 23, 42);
    doc.rect(marginX, y, pageW - marginX * 2, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(248, 250, 252);
    const cols = [
      { label: 'TIPO',       x: marginX + 4 },
      { label: 'DESCRIÇÃO',  x: marginX + 28 },
      { label: 'CATEGORIA',  x: marginX + 90 },
      { label: 'DATA',       x: marginX + 130 },
      { label: 'VALOR',      x: pageW - marginX - 4, align: 'right' },
    ];
    cols.forEach(c => doc.text(c.label, c.x, y + 5.5, { align: c.align }));
    y += 9;

    // Table rows
    const sorted = [...filtered].sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
    sorted.forEach((tx, idx) => {
      if (y > pageH - 20) { doc.addPage(); y = 20; }
      const isReceita = tx.type === 'receita';
      const rowBg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
      doc.setFillColor(...hex2rgb(rowBg));
      doc.rect(marginX, y, pageW - marginX * 2, 8, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      // Type badge
      doc.setFillColor(...hex2rgb(isReceita ? '#dcfce7' : '#fee2e2'));
      doc.roundedRect(marginX + 2, y + 1.5, 22, 5, 1.5, 1.5, 'F');
      doc.setTextColor(...hex2rgb(isReceita ? '#16a34a' : '#dc2626'));
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(isReceita ? 'Receita' : 'Despesa', marginX + 13, y + 5, { align: 'center' });

      // Description
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      const desc = tx.description?.slice(0, 32) || '—';
      doc.text(desc, marginX + 28, y + 5);

      // Category
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      const cat = tx.category?.slice(0, 20) || '—';
      doc.text(cat, marginX + 90, y + 5);

      // Date
      const dateStr = tx.date || tx.created_at?.slice(0, 10) || '';
      let dateFmt = '—';
      if (dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        dateFmt = isNaN(d) ? dateStr : d.toLocaleDateString('pt-BR');
      }
      doc.setTextColor(100, 116, 139);
      doc.text(dateFmt, marginX + 130, y + 5);

      // Amount
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...hex2rgb(isReceita ? '#16a34a' : '#dc2626'));
      const sign = isReceita ? '+' : '-';
      doc.text(`${sign}${FMT_BRL(Number(tx.amount || 0))}`, pageW - marginX - 4, y + 5, { align: 'right' });

      y += 8;
    });

    // Totals row
    y += 2;
    doc.setFillColor(30, 41, 59);
    doc.rect(marginX, y, pageW - marginX * 2, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(248, 250, 252);
    const totalReceitas = receitas.reduce((a, t) => a + Number(t.amount || 0), 0);
    const totalDespesas = despesas.reduce((a, t) => a + Number(t.amount || 0), 0);
    const saldo = totalReceitas - totalDespesas;
    doc.text('SALDO DO PERÍODO', marginX + 4, y + 6.5);
    doc.setTextColor(...hex2rgb(saldo >= 0 ? '#4ade80' : '#f87171'));
    doc.text(FMT_BRL(saldo), pageW - marginX - 4, y + 6.5, { align: 'right' });
    y += 14;
  }

  // Rodapé
  const footerY = pageH - 12;
  doc.setFillColor(15, 23, 42);
  doc.rect(0, footerY, pageW, 12, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${companyName} — Sistema de Gestão`, marginX, footerY + 7.5);
  doc.text(`Relatório gerado em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, pageW - marginX, footerY + 7.5, { align: 'right' });

  // Save
  const filename = allTime
    ? `DRE_${companyName.replace(/\s/g, '_')}_Completo.pdf`
    : `DRE_${companyName.replace(/\s/g, '_')}_${MESES[filterMonth]}_${filterYear}.pdf`;
  doc.save(filename);
}
