// Using Deno.serve instead of deprecated import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { cycleId, format: exportFormat } = await req.json();

    console.log('Exporting newsletter:', { cycleId, exportFormat });

    // Get cycle details
    const { data: cycle, error: cycleError } = await supabase
      .from('newsletter_cycles')
      .select('*')
      .eq('id', cycleId)
      .single();

    if (cycleError) throw cycleError;

    // Get all submissions for this cycle
    const { data: submissions, error: submissionsError } = await supabase
      .from('newsletter_submissions')
      .select('*')
      .eq('cycle_id', cycleId)
      .eq('status', 'submitted')
      .order('department');

    if (submissionsError) throw submissionsError;

    // Get department order
    const departmentOrder = [
      'Finance',
      'Commercial/Marketing',
      'Admin Managers',
      'Operations Managers',
      'Workflow Manager',
      'IT',
      'HR / People & Culture / OHS',
      'CMO',
      'Technical Partners',
    ];

    // Sort submissions by department order
    const sortedSubmissions = (submissions || []).sort((a, b) => {
      const indexA = departmentOrder.indexOf(a.department);
      const indexB = departmentOrder.indexOf(b.department);
      return indexA - indexB;
    });

    const monthYear = new Date(cycle.due_at).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
    const filename = `newsletter-${cycle.month}`;

    // Get all templates upfront
    const { data: templates } = await supabase
      .from('department_templates')
      .select('department, fields')
      .eq('is_active', true);

    const templateMap = new Map(templates?.map((t: any) => [t.department, t.fields]) || []);

    if (exportFormat === 'html') {
      const htmlContent = await generateHTML(sortedSubmissions, cycle, templateMap, monthYear);
      return new Response(
        JSON.stringify({ html: htmlContent }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (exportFormat === 'pdf') {
      const pdfContent = await generatePDF(sortedSubmissions, cycle, templateMap, monthYear);
      
      return new Response(
        JSON.stringify({ 
          content: btoa(String.fromCharCode(...new Uint8Array(pdfContent))),
          filename,
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (exportFormat === 'docx') {
      const docxContent = await generateDOCX(sortedSubmissions, cycle, templateMap, monthYear);
      
      return new Response(
        JSON.stringify({ 
          content: btoa(String.fromCharCode(...new Uint8Array(docxContent))),
          filename,
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    throw new Error('Invalid export format');
  } catch (error: any) {
    console.error('Error exporting newsletter:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function generateHTML(sortedSubmissions: any[], cycle: any, templateMap: Map<any, any>, monthYear: string): Promise<string> {
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Newsletter - ${cycle.month}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    h2 {
      color: #2980b9;
      margin-top: 30px;
      border-left: 4px solid #3498db;
      padding-left: 15px;
    }
    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    .field-label {
      font-weight: bold;
      color: #7f8c8d;
      margin-top: 15px;
      margin-bottom: 5px;
    }
    .field-content {
      margin-left: 10px;
      white-space: pre-wrap;
    }
    .submitter {
      font-style: italic;
      color: #95a5a6;
      margin-top: 10px;
    }
    .clinic-badge {
      display: inline-block;
      background: #e8f4f8;
      padding: 2px 8px;
      border-radius: 4px;
      margin: 2px;
      font-size: 0.9em;
    }
    .no-update {
      color: #95a5a6;
      font-style: italic;
    }
    @media print {
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <h1>Monthly Newsletter - ${monthYear}</h1>
`;

  // Add each department section
  for (const submission of sortedSubmissions) {
    html += `<div class="section">`;
    html += `<h2>${escapeHTML(submission.department)}</h2>`;
    
    // Add clinic badges if applicable
    if (submission.clinics && submission.clinics.length > 0) {
      html += `<div>`;
      for (const clinic of submission.clinics) {
        html += `<span class="clinic-badge">${escapeHTML(clinic)}</span>`;
      }
      html += `</div>`;
    }

    if (submission.has_no_update) {
      html += `<p class="no-update">No update this month</p>`;
    } else {
      const payload = submission.payload as Record<string, string>;
      const fields = templateMap.get(submission.department) as Array<{ key: string; label: string }> || [];

      for (const field of fields) {
        const value = payload[field.key];
        if (value && value.trim()) {
          html += `<div class="field-label">${escapeHTML(field.label)}</div>`;
          html += `<div class="field-content">${value}</div>`; // Don't escape HTML content - render it
        }
      }
    }

    html += `<p class="submitter">Submitted by: ${escapeHTML(submission.submitter_name)}</p>`;
    html += `</div>`;
  }

  html += `
</body>
</html>
`;

  return html;
}

// Helper function to strip HTML tags and convert to plain text
function htmlToPlainText(html: string): string {
  if (!html) return '';
  
  return html
    // Convert block elements to line breaks
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    // Remove all HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Clean up multiple line breaks
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function generatePDF(sortedSubmissions: any[], cycle: any, templateMap: Map<any, any>, monthYear: string): Promise<ArrayBuffer> {
  // Import jsPDF from CDN
  const jsPDFModule = await import('https://esm.sh/jspdf@2.5.1');
  const { jsPDF } = jsPDFModule;
  
  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let yPosition = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (2 * margin);
  
  // Add title
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text(`Monthly Newsletter - ${monthYear}`, margin, yPosition);
  yPosition += 15;

  // Add each department section
  for (const submission of sortedSubmissions) {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Department header
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(41, 128, 185); // Blue color
    doc.text(submission.department, margin, yPosition);
    yPosition += 10;
    
    doc.setTextColor(0, 0, 0); // Reset to black
    
    // Clinic badges
    if (submission.clinics && submission.clinics.length > 0) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const clinicsText = submission.clinics.join(', ');
      const lines = doc.splitTextToSize(clinicsText, contentWidth);
      doc.text(lines, margin, yPosition);
      yPosition += lines.length * 5 + 5;
    }
    
    // No update message
    if (submission.has_no_update) {
      doc.setFontSize(11);
      doc.setFont(undefined, 'italic');
      doc.setTextColor(149, 165, 166); // Gray color
      doc.text('No update this month', margin, yPosition);
      doc.setTextColor(0, 0, 0); // Reset to black
      yPosition += 10;
    } else {
      const payload = submission.payload as Record<string, string>;
      const fields = templateMap.get(submission.department) as Array<{ key: string; label: string }> || [];

      for (const field of fields) {
        const value = payload[field.key];
        if (value && value.trim()) {
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }
          
          // Field label
          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(127, 140, 141); // Gray color
          doc.text(field.label, margin, yPosition);
          yPosition += 7;
          
          doc.setTextColor(0, 0, 0); // Reset to black
          
          // Field content - convert HTML to plain text
          doc.setFont(undefined, 'normal');
          const plainText = htmlToPlainText(value);
          const lines = doc.splitTextToSize(plainText, contentWidth - 5);
          doc.text(lines, margin + 5, yPosition);
          yPosition += lines.length * 5 + 5;
        }
      }
    }
    
    // Submitter
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }
    doc.setFontSize(9);
    doc.setFont(undefined, 'italic');
    doc.setTextColor(149, 165, 166); // Gray color
    doc.text(`Submitted by: ${submission.submitter_name}`, margin, yPosition);
    doc.setTextColor(0, 0, 0); // Reset to black
    yPosition += 12;
  }
  
  // Convert to ArrayBuffer
  const pdfBlob = doc.output('arraybuffer');
  return pdfBlob;
}

async function generateDOCX(sortedSubmissions: any[], cycle: any, templateMap: Map<any, any>, monthYear: string): Promise<ArrayBuffer> {
  // Build a minimal, valid DOCX (Office Open XML) package using JSZip
  const JSZipLib = await import('https://esm.sh/jszip@3.10.1');
  const JSZip = JSZipLib.default;
  const zip = new JSZip();

  const xmlEscape = (text: string): string =>
    String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const runWithBreaks = (value: string, rPr: string = ''): string => {
    // Convert HTML to plain text first
    const plainText = htmlToPlainText(value);
    const lines = plainText.split('\n');
    let xml = '';
    if (lines.length === 0) {
      return `<w:r>${rPr}<w:t xml:space="preserve"></w:t></w:r>`;
    }
    // First line
    xml += `<w:r>${rPr}<w:t xml:space="preserve">${xmlEscape(lines[0])}</w:t></w:r>`;
    // Remaining lines with line breaks
    for (let i = 1; i < lines.length; i++) {
      xml += `<w:r>${rPr}<w:br/><w:t xml:space="preserve">${xmlEscape(lines[i])}</w:t></w:r>`;
    }
    return xml;
  };

  const paragraph = (inner: string, style?: string): string => {
    if (style) {
      return `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr>${inner}</w:p>`;
    }
    return `<w:p>${inner}</w:p>`;
  };

  const run = (text: string, { bold = false, italic = false } = {}): string => {
    const rPr = bold || italic
      ? `<w:rPr>${bold ? '<w:b/>' : ''}${italic ? '<w:i/>' : ''}</w:rPr>`
      : '';
    return `<w:r>${rPr}<w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`;
  };

  // Build the WordprocessingML document body
  let bodyXml = '';

  // Title
  bodyXml += paragraph(run(`Monthly Newsletter - ${monthYear}`, { bold: true }), 'Heading1');

  for (const submission of sortedSubmissions) {
    // Department header
    bodyXml += paragraph(run(String(submission.department), { bold: true }), 'Heading2');

    // Clinics line (comma separated)
    if (submission.clinics && submission.clinics.length > 0) {
      const clinicsText = submission.clinics.join(', ');
      bodyXml += paragraph(run(clinicsText));
    }

    if (submission.has_no_update) {
      bodyXml += paragraph(run('No update this month', { italic: true }));
    } else {
      const payload = submission.payload as Record<string, string>;
      const fields = (templateMap.get(submission.department) as Array<{ key: string; label: string }>) || [];

      for (const field of fields) {
        const value = payload?.[field.key];
        if (value && value.trim()) {
          // Label
          bodyXml += paragraph(run(field.label, { bold: true }));
          // Content with line breaks
          const contentRuns = runWithBreaks(value);
          bodyXml += paragraph(contentRuns);
        }
      }
    }

    // Submitter line
    if (submission.submitter_name) {
      bodyXml += paragraph(run(`Submitted by: ${String(submission.submitter_name)}`, { italic: true }));
    }

    // Spacer paragraph
    bodyXml += paragraph(run(''));
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
    xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
    xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
    xmlns:v="urn:schemas-microsoft-com:vml"
    xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
    xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
    xmlns:w10="urn:schemas-microsoft-com:office:word"
    xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
    xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
    xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
    xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
    xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
    mc:Ignorable="w14 wp14">
    <w:body>
      ${bodyXml}
      <w:sectPr>
        <w:pgSz w:w="12240" w:h="15840"/>
        <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
      </w:sectPr>
    </w:body>
  </w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
    <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  </Types>`;

  const relsRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
    <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
    <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
  </Relationships>`;

  const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;

  const nowIso = new Date().toISOString();
  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <dc:title>${xmlEscape(`Newsletter - ${cycle.month}`)}</dc:title>
    <dc:subject>Monthly Newsletter</dc:subject>
    <dc:creator>CrowdHub</dc:creator>
    <cp:lastModifiedBy>CrowdHub</cp:lastModifiedBy>
    <dcterms:created xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:created>
    <dcterms:modified xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:modified>
  </cp:coreProperties>`;

  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
    <Application>Microsoft Office Word</Application>
  </Properties>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:style w:type="paragraph" w:styleId="Heading1">
      <w:name w:val="Heading 1"/>
      <w:basedOn w:val="Normal"/>
      <w:pPr>
        <w:spacing w:before="240" w:after="120"/>
      </w:pPr>
      <w:rPr>
        <w:sz w:val="36"/>
        <w:b/>
      </w:rPr>
    </w:style>
    <w:style w:type="paragraph" w:styleId="Heading2">
      <w:name w:val="Heading 2"/>
      <w:basedOn w:val="Normal"/>
      <w:pPr>
        <w:spacing w:before="180" w:after="60"/>
      </w:pPr>
      <w:rPr>
        <w:sz w:val="28"/>
        <w:b/>
      </w:rPr>
    </w:style>
    <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
      <w:name w:val="Normal"/>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
        <w:sz w:val="22"/>
      </w:rPr>
    </w:style>
  </w:styles>`;

  const fontTableXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:font w:name="Calibri">
      <w:panose1 w:val="020F0502020204030204"/>
      <w:charset w:val="00"/>
      <w:family w:val="swiss"/>
      <w:pitch w:val="variable"/>
    </w:font>
  </w:fonts>`;

  const settingsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:zoom w:percent="100"/>
    <w:defaultTabStop w:val="720"/>
  </w:settings>`;

  // Update content types to include new parts
  const fullContentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
    <Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>
    <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
    <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
    <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  </Types>`;

  // Update document relationships
  const fullDocumentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
    <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>
    <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  </Relationships>`;

  // Assemble the DOCX zip
  zip.file('[Content_Types].xml', fullContentTypesXml);
  zip.folder('_rels')?.file('.rels', relsRels);
  const wordFolder = zip.folder('word');
  wordFolder?.file('document.xml', documentXml);
  wordFolder?.file('styles.xml', stylesXml);
  wordFolder?.file('fontTable.xml', fontTableXml);
  wordFolder?.file('settings.xml', settingsXml);
  wordFolder?.folder('_rels')?.file('document.xml.rels', fullDocumentRels);
  const docProps = zip.folder('docProps');
  docProps?.file('core.xml', coreXml);
  docProps?.file('app.xml', appXml);

  const arrayBuffer: ArrayBuffer = await zip.generateAsync({ type: 'arraybuffer' });
  return arrayBuffer;
}

function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
