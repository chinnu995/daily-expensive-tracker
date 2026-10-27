import { jsPDF } from 'jspdf';
import { MonthlySummaryReport } from '../types/index.js';

/**
 * Generates and triggers download of a high-quality, professional PDF statement
 * for the SpendWise 1-Month Financial & Spending Quality Report.
 */
export function generateMonthlyReportPdf(
  report: MonthlySummaryReport,
  currencySymbol: string,
  userDisplayName: string = 'SpendWise User'
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Formatting helpers
  const formatMoney = (val: number) => {
    // Standard currency string (avoid non-ascii currency symbol glitches in standard PDF fonts by using clean text)
    const formatted = Math.abs(val).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const prefix = val < 0 ? '-' : '';
    // If currency symbol is ₹, use Rs. in standard PDF font so it renders crisply on all PDF viewers
    const sym = currencySymbol === '₹' ? 'Rs. ' : `${currencySymbol} `;
    return `${prefix}${sym}${formatted}`;
  };

  const monthDate = new Date(`${report.month}-01T00:00:00`);
  const monthName = !isNaN(monthDate.getTime())
    ? monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : report.month;

  // --- HEADER SECTION ---
  // Top header background
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Decorative accent line
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 37, pageWidth, 1.5, 'F');

  // Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('SpendWise', margin, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('AI-Powered Financial Activity & Quality Statement', margin, 23);

  // Month & User Info (Right aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(monthName, pageWidth - margin, 16, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Account Holder: ${userDisplayName}`, pageWidth - margin, 23, { align: 'right' });
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    pageWidth - margin,
    29,
    { align: 'right' }
  );

  let curY = 46;

  // --- EXECUTIVE SUMMARY 4-BOX GRID ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('1. Executive Financial Summary', margin, curY);
  curY += 4;

  const boxW = (contentWidth - 9) / 4;
  const boxH = 20;

  // Box 1: Total Income
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(187, 247, 208); // emerald-200
  doc.roundedRect(margin, curY, boxW, boxH, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52); // emerald-800
  doc.text('TOTAL INCOME', margin + 3, curY + 6);
  doc.setFontSize(10.5);
  doc.setTextColor(5, 150, 105);
  doc.text(formatMoney(report.totalIncome), margin + 3, curY + 14);

  // Box 2: Total Expenses
  const box2X = margin + boxW + 3;
  doc.setFillColor(255, 241, 242); // rose-50
  doc.setDrawColor(254, 205, 211); // rose-200
  doc.roundedRect(box2X, curY, boxW, boxH, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(159, 18, 57); // rose-800
  doc.text('TOTAL EXPENSES', box2X + 3, curY + 6);
  doc.setFontSize(10.5);
  doc.setTextColor(225, 29, 72);
  doc.text(formatMoney(report.totalExpenses), box2X + 3, curY + 14);

  // Box 3: Net Savings
  const box3X = margin + (boxW + 3) * 2;
  const isPositiveSavings = report.netSavings >= 0;
  doc.setFillColor(isPositiveSavings ? 239 : 255, isPositiveSavings ? 246 : 241, isPositiveSavings ? 255 : 242);
  doc.setDrawColor(isPositiveSavings ? 191 : 254, isPositiveSavings ? 219 : 205, isPositiveSavings ? 254 : 211);
  doc.roundedRect(box3X, curY, boxW, boxH, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(isPositiveSavings ? 30 : 159, isPositiveSavings ? 64 : 18, isPositiveSavings ? 175 : 57);
  doc.text(isPositiveSavings ? 'NET SURPLUS' : 'NET DEFICIT', box3X + 3, curY + 6);
  doc.setFontSize(10.5);
  doc.setTextColor(isPositiveSavings ? 29 : 225, isPositiveSavings ? 78 : 29, isPositiveSavings ? 216 : 72);
  doc.text(formatMoney(report.netSavings), box3X + 3, curY + 14);

  // Box 4: MoM Growth
  const box4X = margin + (boxW + 3) * 3;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(box4X, curY, boxW, boxH, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('MOM SPEND CHANGE', box4X + 3, curY + 6);
  doc.setFontSize(10.5);
  const momColor = report.monthOverMonthChange <= 0 ? [5, 150, 105] : [225, 29, 72];
  doc.setTextColor(momColor[0], momColor[1], momColor[2]);
  const momSign = report.monthOverMonthChange > 0 ? '+' : '';
  doc.text(`${momSign}${report.monthOverMonthChange}%`, box4X + 3, curY + 14);

  curY += boxH + 8;

  // --- 2. SPENDING QUALITY & AI CLASSIFICATION BREAKDOWN ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('2. Spend Quality Intelligence (Proper vs. Waste)', margin, curY);
  curY += 4;

  const qualityCardW = contentWidth;
  const qualityCardH = 26;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, curY, qualityCardW, qualityCardH, 2, 2, 'FD');

  // Proper Spend summary
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text('PROPER SPEND (Essential & Value)', margin + 4, curY + 7);
  doc.setFontSize(11);
  doc.text(`${formatMoney(report.totalProper)} (${report.properPercentage}%)`, margin + 4, curY + 14);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Nutritional meals, commute tickets, study, bills & hygiene', margin + 4, curY + 20);

  // Waste Spend summary
  const midX = margin + qualityCardW / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(225, 29, 72);
  doc.text('WASTE SPEND (Impulse & Craving)', midX + 4, curY + 7);
  doc.setFontSize(11);
  doc.text(`${formatMoney(report.totalWaste)} (${report.wastePercentage}%)`, midX + 4, curY + 14);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Potential Recoverable Savings: ${formatMoney(report.potentialSavings)}`, midX + 4, curY + 20);

  curY += qualityCardH + 8;

  // --- 3. CATEGORY EXPENDITURE BREAKDOWN TABLE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('3. Category-Wise Expenditure Breakdown', margin, curY);
  curY += 4;

  // Table Header
  const tableHeaderH = 7;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, curY, contentWidth, tableHeaderH, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('CATEGORY', margin + 3, curY + 5);
  doc.text('TRANSACTIONS', margin + 80, curY + 5);
  doc.text('AMOUNT', margin + 125, curY + 5);
  doc.text('% SHARE', pageWidth - margin - 3, curY + 5, { align: 'right' });
  curY += tableHeaderH;

  // Table Rows (top categories)
  const maxRows = Math.min(report.categories.length, 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  if (report.categories.length === 0) {
    doc.setTextColor(148, 163, 184);
    doc.text('No expenses recorded for this month.', margin + 3, curY + 6);
    curY += 8;
  } else {
    for (let i = 0; i < maxRows; i++) {
      const cat = report.categories[i];
      const isEven = i % 2 === 0;
      if (isEven) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, curY, contentWidth, 6.5, 'F');
      }

      doc.setTextColor(30, 41, 59);
      doc.text(cat.name, margin + 3, curY + 4.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`${cat.count} txns`, margin + 80, curY + 4.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(formatMoney(cat.amount), margin + 125, curY + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`${cat.percentage}%`, pageWidth - margin - 3, curY + 4.5, { align: 'right' });

      curY += 6.5;
    }
  }

  curY += 6;

  // --- 4. DAILY SPENDING HIGHLIGHTS / TABLE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('4. Daily Financial Highlights', margin, curY);
  curY += 4;

  // Filter days that had activity
  const activeDays = report.daily.filter((d) => d.expense > 0 || d.income > 0);
  const highestSpendDay = [...report.daily].sort((a, b) => b.expense - a.expense)[0];

  const highlightsW = contentWidth;
  const highlightsH = 18;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, curY, highlightsW, highlightsH, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Total Active Days: ${activeDays.length} / ${report.daily.length} days in month`, margin + 4, curY + 6);
  if (highestSpendDay && highestSpendDay.expense > 0) {
    doc.text(
      `Highest Spending Day: ${highestSpendDay.date} with ${formatMoney(highestSpendDay.expense)} total expense`,
      margin + 4,
      curY + 12
    );
  } else {
    doc.text('Steady low daily expenditure maintained throughout the period.', margin + 4, curY + 12);
  }

  // --- FOOTER & AUDIT VERIFICATION ---
  const footerY = pageHeight - 16;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(
    'SpendWise Dual-Ledger System (Cash & Bank/UPI) • Official Monthly Financial Statement',
    margin,
    footerY
  );
  doc.text('Page 1 of 1', pageWidth - margin, footerY, { align: 'right' });

  // Trigger browser download
  const cleanFilename = `SpendWise_Monthly_Report_${report.month}.pdf`;
  doc.save(cleanFilename);
}
