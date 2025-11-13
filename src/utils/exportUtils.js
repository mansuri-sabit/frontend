import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Export messages to Excel format
 * @param {Array} messages - Array of message objects
 * @param {string} filename - Optional filename (default: chat_history_YYYY-MM-DD.xlsx)
 */
export const exportToExcel = (messages, filename = null) => {
  if (!messages || messages.length === 0) {
    throw new Error('No messages to export');
  }

  // Prepare data for Excel
  const excelData = messages.map((msg, index) => ({
    'No.': index + 1,
    'Timestamp': msg.timestamp ? new Date(msg.timestamp).toLocaleString() : '-',
    'User Name': msg.is_embed_user ? (msg.user_name || 'Embed User') : (msg.from_name || 'User'),
    'User Message': msg.message || '-',
    'AI Reply': msg.reply || '-',
    'Tokens Used': msg.token_cost || 0,
    'IP Address': msg.user_ip || '-',
    'Country': msg.country || '-',
    'City': msg.city || '-',
    'Referrer': msg.referrer || '-',
    'User Agent': msg.user_agent || '-',
    'Session ID': msg.session_id || '-',
    'Conversation ID': msg.conversation_id || '-',
    'Is Embed User': msg.is_embed_user ? 'Yes' : 'No',
  }));

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);

  // Set column widths
  const colWidths = [
    { wch: 5 },   // No.
    { wch: 20 },  // Timestamp
    { wch: 20 },  // User Name
    { wch: 40 },  // User Message
    { wch: 40 },  // AI Reply
    { wch: 12 },  // Tokens Used
    { wch: 15 },  // IP Address
    { wch: 15 },  // Country
    { wch: 20 },  // City
    { wch: 30 },  // Referrer
    { wch: 40 },  // User Agent
    { wch: 20 },  // Session ID
    { wch: 20 },  // Conversation ID
    { wch: 12 },  // Is Embed User
  ];
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Chat History');

  // Generate filename
  const date = new Date().toISOString().split('T')[0];
  const finalFilename = filename || `chat_history_${date}.xlsx`;

  // Write file
  XLSX.writeFile(wb, finalFilename);
};

/**
 * Export messages to PDF format
 * @param {Array} messages - Array of message objects
 * @param {string} filename - Optional filename (default: chat_history_YYYY-MM-DD.pdf)
 */
export const exportToPDF = (messages, filename = null) => {
  if (!messages || messages.length === 0) {
    throw new Error('No messages to export');
  }

  // Create new PDF document
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Add title
  doc.setFontSize(16);
  doc.text('Chat History Export', 14, 15);

  // Add export date
  doc.setFontSize(10);
  const exportDate = new Date().toLocaleString();
  doc.text(`Exported on: ${exportDate}`, 14, 22);

  // Prepare table data
  const tableData = messages.map((msg, index) => [
    index + 1,
    msg.timestamp ? new Date(msg.timestamp).toLocaleString() : '-',
    msg.is_embed_user ? (msg.user_name || 'Embed User') : (msg.from_name || 'User'),
    (msg.message || '-').substring(0, 50) + (msg.message && msg.message.length > 50 ? '...' : ''),
    (msg.reply || '-').substring(0, 50) + (msg.reply && msg.reply.length > 50 ? '...' : ''),
    msg.token_cost || 0,
    msg.user_ip || '-',
    msg.country || '-',
  ]);

  // Add table
  doc.autoTable({
    startY: 28,
    head: [['No.', 'Timestamp', 'User', 'Message', 'AI Reply', 'Tokens', 'IP', 'Country']],
    body: tableData,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 30 },
      2: { cellWidth: 25 },
      3: { cellWidth: 40 },
      4: { cellWidth: 40 },
      5: { cellWidth: 15 },
      6: { cellWidth: 20 },
      7: { cellWidth: 20 },
    },
    margin: { top: 28 },
  });

  // Add detailed messages on separate pages
  messages.forEach((msg, index) => {
    if (index > 0) {
      doc.addPage();
    }

    let yPos = 15;

    // Message header
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Message ${index + 1}`, 14, yPos);
    yPos += 8;

    // Timestamp
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Timestamp: ${msg.timestamp ? new Date(msg.timestamp).toLocaleString() : '-'}`, 14, yPos);
    yPos += 6;

    // User info
    doc.setFont(undefined, 'bold');
    doc.text('User:', 14, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(msg.is_embed_user ? (msg.user_name || 'Embed User') : (msg.from_name || 'User'), 30, yPos);
    yPos += 6;

    // User message
    doc.setFont(undefined, 'bold');
    doc.text('User Message:', 14, yPos);
    yPos += 6;
    doc.setFont(undefined, 'normal');
    const userMsgLines = doc.splitTextToSize(msg.message || '-', 180);
    doc.text(userMsgLines, 14, yPos);
    yPos += userMsgLines.length * 5 + 4;

    // AI reply
    doc.setFont(undefined, 'bold');
    doc.text('AI Reply:', 14, yPos);
    yPos += 6;
    doc.setFont(undefined, 'normal');
    const aiReplyLines = doc.splitTextToSize(msg.reply || '-', 180);
    doc.text(aiReplyLines, 14, yPos);
    yPos += aiReplyLines.length * 5 + 4;

    // Tracking info
    doc.setFont(undefined, 'bold');
    doc.text('Tracking Information:', 14, yPos);
    yPos += 6;
    doc.setFont(undefined, 'normal');
    doc.text(`Tokens Used: ${msg.token_cost || 0}`, 14, yPos);
    yPos += 5;
    if (msg.user_ip) {
      doc.text(`IP Address: ${msg.user_ip}`, 14, yPos);
      yPos += 5;
    }
    if (msg.country) {
      doc.text(`Location: ${msg.city ? `${msg.city}, ` : ''}${msg.country}`, 14, yPos);
      yPos += 5;
    }
    if (msg.referrer) {
      doc.text(`Referrer: ${msg.referrer}`, 14, yPos);
      yPos += 5;
    }
    if (msg.user_agent) {
      const userAgentLines = doc.splitTextToSize(`Browser: ${msg.user_agent}`, 180);
      doc.text(userAgentLines, 14, yPos);
      yPos += userAgentLines.length * 5;
    }
  });

  // Generate filename
  const date = new Date().toISOString().split('T')[0];
  const finalFilename = filename || `chat_history_${date}.pdf`;

  // Save PDF
  doc.save(finalFilename);
};

