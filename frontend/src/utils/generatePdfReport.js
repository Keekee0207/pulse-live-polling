import { jsPDF } from 'jspdf';

export const generatePollPdfReport = (exportData) => {
  const { poll, counts = {}, total_votes = 0, votes = [] } = exportData;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  // 1. Top Neo-Brutalist Header Banner
  doc.setFillColor(255, 229, 0); // Neo Yellow
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1);
  doc.rect(margin, y, pageWidth - 2 * margin, 22, 'FD');

  // Hard drop shadow
  doc.setFillColor(0, 0, 0);
  doc.rect(margin + 1.5, y + 22, pageWidth - 2 * margin, 1.5, 'F');

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('PULSE LIVE AUDIENCE POLL REPORT', margin + 6, y + 14);

  y += 32;

  // 2. Poll Metadata Box
  doc.setFillColor(248, 245, 238); // Neo Bg
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.rect(margin, y, pageWidth - 2 * margin, 38, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text('QUESTION / TOPIC:', margin + 5, y + 7);

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  const splitQuestion = doc.splitTextToSize(poll.question || 'Live Poll', pageWidth - 2 * margin - 10);
  doc.text(splitQuestion, margin + 5, y + 14);

  // Status & Key Metrics
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Poll ID: ${poll.id}`, margin + 5, y + 26);
  doc.text(`Status: ${poll.settings?.is_closed ? 'CLOSED' : 'ACTIVE / OPEN'}`, margin + 5, y + 32);

  doc.text(`Total Votes: ${total_votes}`, pageWidth / 2 + 10, y + 26);
  const createdDate = poll.created_at ? new Date(poll.created_at).toLocaleDateString() : 'N/A';
  doc.text(`Date Created: ${createdDate}`, pageWidth / 2 + 10, y + 32);

  y += 48;

  // 3. Results Section Title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('VOTING BREAKDOWN & RESULTS', margin, y);

  y += 5;

  // 4. Table Header
  const colRank = margin;
  const colOption = margin + 18;
  const colVotes = pageWidth - margin - 55;
  const colPercent = pageWidth - margin - 22;

  doc.setFillColor(0, 0, 0);
  doc.rect(margin, y, pageWidth - 2 * margin, 9, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('#', colRank + 5, y + 6);
  doc.text('OPTION', colOption, y + 6);
  doc.text('VOTES', colVotes, y + 6);
  doc.text('SHARE', colPercent, y + 6);

  y += 9;

  // Palette colors for bars
  const barColors = [
    [255, 229, 0],  // Yellow
    [255, 92, 141], // Pink
    [34, 229, 161], // Mint
    [56, 189, 248], // Cyan
    [192, 132, 252],// Purple
    [251, 146, 60], // Orange
  ];

  // Find leader
  let maxV = -1;
  let leaderOptId = null;
  poll.options?.forEach((opt) => {
    const v = counts[opt.id] ?? opt.votes ?? 0;
    if (v > maxV && total_votes > 0) {
      maxV = v;
      leaderOptId = opt.id;
    }
  });

  // 5. Options Rows
  poll.options?.forEach((opt, idx) => {
    const votesCount = counts[opt.id] ?? opt.votes ?? 0;
    const percentage = total_votes > 0 ? Math.round((votesCount / total_votes) * 100) : 0;
    const isLeading = opt.id === leaderOptId && total_votes > 0;

    // Row Box
    doc.setFillColor(idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 250);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.rect(margin, y, pageWidth - 2 * margin, 18, 'FD');

    // Index & Option text
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`${idx + 1}`, colRank + 5, y + 7);

    const optLabel = isLeading ? `${opt.text} ★ [WINNING]` : opt.text;
    doc.text(doc.splitTextToSize(optLabel, 90), colOption, y + 7);

    // Votes & %
    doc.text(`${votesCount}`, colVotes, y + 7);
    doc.text(`${percentage}%`, colPercent, y + 7);

    // Mini Progress Bar
    const barX = colOption;
    const barY = y + 10;
    const maxBarW = pageWidth - 2 * margin - 30;
    const barW = Math.max(1, (maxBarW * percentage) / 100);

    // Bar background
    doc.setFillColor(230, 230, 230);
    doc.rect(barX, barY, maxBarW, 4, 'F');

    // Filled bar
    const color = barColors[idx % barColors.length];
    doc.setFillColor(color[0], color[1], color[2]);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(barX, barY, barW, 4, 'FD');

    y += 20;
  });

  y += 10;

  // 6. Summary Statistics & Audit Box
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.rect(margin, y, pageWidth - 2 * margin, 28, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('AUDIT & INTEGRITY SUMMARY:', margin + 5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`• Total Vote Transactions Recorded in MongoDB: ${votes.length || total_votes}`, margin + 5, y + 12);
  doc.text(`• Anti-Spam Duplicate Verification: Active (Redis SHA-256 Fingerprint Set)`, margin + 5, y + 17);
  doc.text(`• Real-Time Pub/Sub Engine: Redis (Go Gin Cluster)`, margin + 5, y + 22);

  // 7. Footer
  const now = new Date();
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Report generated on ${now.toLocaleDateString()} at ${now.toLocaleTimeString()} via PULSE Polling Platform.`,
    margin,
    pageHeight - 10
  );

  // Download PDF
  const filename = `Poll_Report_${poll.id || 'export'}.pdf`;
  doc.save(filename);
};
