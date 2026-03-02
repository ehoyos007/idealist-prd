import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProjectCard } from '@/types/project';

export function generatePdf(project: ProjectCard): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // Helper to add section
  const addSection = (title: string, content: string) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text(title.toUpperCase(), margin, y);
    y += 6;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(content, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 10;
  };

  // Header bar
  doc.setFillColor(20, 20, 20);
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(project.projectName, contentWidth - 40);
  doc.text(titleLines, margin, 15);

  // Date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(project.createdAt).toLocaleDateString(), pageWidth - margin, 15, { align: 'right' });

  // Tagline & Tags
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text(project.tagline, margin, 25);
  doc.text(`Tags: ${project.tags.join(', ')}`, margin, 31);

  y = 50;

  // Scores table
  autoTable(doc, {
    startY: y,
    head: [[
      { content: String(project.scores.complexity), styles: { halign: 'center', fontSize: 16, fontStyle: 'bold' } },
      { content: String(project.scores.impact), styles: { halign: 'center', fontSize: 16, fontStyle: 'bold' } },
      { content: String(project.scores.urgency), styles: { halign: 'center', fontSize: 16, fontStyle: 'bold' } },
      { content: String(project.scores.confidence), styles: { halign: 'center', fontSize: 16, fontStyle: 'bold' } },
    ]],
    body: [[
      { content: 'COMPLEXITY', styles: { halign: 'center', fontSize: 8, textColor: [100, 100, 100] } },
      { content: 'IMPACT', styles: { halign: 'center', fontSize: 8, textColor: [100, 100, 100] } },
      { content: 'URGENCY', styles: { halign: 'center', fontSize: 8, textColor: [100, 100, 100] } },
      { content: 'CONFIDENCE', styles: { halign: 'center', fontSize: 8, textColor: [100, 100, 100] } },
    ]],
    theme: 'plain',
    styles: { cellPadding: 4 },
    margin: { left: margin, right: margin },
    tableLineColor: [30, 30, 30],
    tableLineWidth: 0.5,
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  // Main content sections
  addSection('Vision', project.vision);
  addSection('Problem Statement', project.problemStatement);
  addSection('Target User', project.targetUser);

  // User Stories table
  if (project.userStories.length > 0) {
    if (y > 230) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('USER STORIES', margin, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [['Persona', 'Goal', 'Benefit']],
      body: project.userStories.map((s) => [s.persona, s.goal, s.benefit]),
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40], fontSize: 9 },
      bodyStyles: { fontSize: 10 },
      margin: { left: margin, right: margin },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  }

  addSection('Core Features', project.coreFeatures);
  addSection('Tech Stack', project.techStack);
  addSection('Architecture', project.architecture);
  addSection('Success Metrics', project.successMetrics);
  addSection('Risks & Open Questions', project.risksAndOpenQuestions);
  addSection('First Sprint Plan', project.firstSprintPlan);

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Generated with Idealist', margin, doc.internal.pageSize.getHeight() - 10);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
  }

  // Download
  const filename = `${project.projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.pdf`;
  doc.save(filename);
}
