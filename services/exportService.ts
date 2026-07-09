import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  BorderStyle, SectionType, Footer, PageNumber, convertInchesToTwip,
} from 'docx';
import { ResumeData } from '../types';

// ─── UTILIDADES ────────────────────────────────────────────────────────────────

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const sanitize = (str?: string) => (str || '').replace(/[<>&"]/g, c =>
  ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] ?? c)
);

// ─── EXPORTAR HTML ──────────────────────────────────────────────────────────────

export const exportToHtml = (resume: ResumeData): void => {
  const isDark = resume.themeMode === 'dark';
  const primaryColor = getTemplateColor(resume.templateId);

  const bg = isDark ? '#0f172a' : '#f8f7f4';
  const surface = isDark ? '#1e293b' : '#ffffff';
  const text = isDark ? '#e2e8f0' : '#1e293b';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? '#334155' : '#e2e8f0';

  const skillBars = resume.skills.map(s => `
    <div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:${muted};margin-bottom:4px">
        <span>${sanitize(s.name)}</span><span style="color:${primaryColor};font-weight:700">${s.level}%</span>
      </div>
      <div style="height:4px;background:${border};border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${s.level}%;background:${primaryColor};border-radius:4px"></div>
      </div>
    </div>`).join('');

  const experiences = resume.experiences.map(e => `
    <div style="border-left:3px solid ${primaryColor};padding-left:20px;margin-bottom:24px;position:relative">
      <div style="position:absolute;left:-7px;top:4px;width:12px;height:12px;border-radius:50%;background:${primaryColor}"></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:4px">
        <strong style="color:${text};font-size:16px">${sanitize(e.role)}</strong>
        <span style="font-size:10px;background:${surface};border:1px solid ${border};padding:2px 8px;border-radius:4px;color:${muted}">${sanitize(e.period)}</span>
      </div>
      <p style="color:${primaryColor};font-size:13px;font-weight:600;margin:0 0 8px">${sanitize(e.company)}</p>
      <p style="color:${muted};font-size:13px;line-height:1.6;margin:0">${sanitize(e.description)}</p>
    </div>`).join('');

  const education = resume.education.map(e => `
    <div style="background:${surface};border:1px solid ${border};border-left:4px solid ${primaryColor};padding:16px;border-radius:8px;margin-bottom:12px">
      <strong style="display:block;color:${text};font-size:14px;margin-bottom:4px">${sanitize(e.degree)}</strong>
      <span style="color:${muted};font-size:12px">${sanitize(e.institution)}</span>
      <div style="display:flex;justify-content:space-between;margin-top:8px">
        <span style="font-size:10px;text-transform:uppercase;color:${muted}">${sanitize(e.type)}</span>
        <span style="font-size:10px;background:${bg};color:${muted};padding:2px 6px;border-radius:4px">${sanitize(e.year)}</span>
      </div>
    </div>`).join('');

  const languages = resume.languages.map(l => `
    <span style="display:inline-flex;align-items:center;gap:6px;background:${surface};border:1px solid ${border};padding:4px 12px;border-radius:8px;margin:4px">
      <span style="color:${text};font-size:12px;font-weight:600">${sanitize(l.name)}</span>
      <span style="color:${primaryColor};font-size:10px;font-weight:700;background:${primaryColor}20;padding:1px 6px;border-radius:4px">${sanitize(l.level)}</span>
    </span>`).join('');

  const hobbies = resume.hobbies.map(h =>
    `<span style="font-size:12px;border:1px solid ${border};padding:3px 10px;border-radius:6px;color:${muted}">${sanitize(h)}</span>`
  ).join(' ');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${sanitize(resume.fullName)} — CVFacil.NG</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet" />
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',sans-serif;background:${bg};color:${text};padding:40px 20px}
    @media print{body{padding:0}@page{margin:1.5cm}}
    .container{max-width:900px;margin:0 auto}
    h1{font-family:'Outfit',sans-serif}
    .print-btn{position:fixed;bottom:24px;right:24px;background:${primaryColor};color:#fff;border:none;padding:12px 24px;border-radius:12px;font-family:'Outfit',sans-serif;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 8px 24px ${primaryColor}40}
    .print-btn:hover{opacity:.9}
    @media print{.print-btn{display:none}}
  </style>
</head>
<body>
<div class="container">
  <!-- HEADER -->
  <header style="display:flex;gap:32px;align-items:flex-start;margin-bottom:40px;flex-wrap:wrap">
    <img src="${resume.avatarUrl}" alt="${sanitize(resume.fullName)}"
      style="width:120px;height:160px;object-fit:cover;object-position:top;border-radius:12px;border:3px solid ${primaryColor}40" />
    <div style="flex:1;min-width:200px">
      <h1 style="font-size:36px;font-weight:800;text-transform:uppercase;letter-spacing:0.02em;margin-bottom:6px">
        ${sanitize(resume.fullName.split(' ')[0])} <span style="color:${primaryColor}">${sanitize(resume.fullName.split(' ').slice(1).join(' '))}</span>
      </h1>
      <p style="color:${primaryColor};font-size:18px;font-weight:500;margin-bottom:16px">${sanitize(resume.role)}</p>
      <p style="color:${muted};font-size:14px;line-height:1.7">${sanitize(resume.summary)}</p>
    </div>
  </header>

  <!-- CONTACT BAR -->
  <div style="background:${surface};border:1px solid ${border};border-radius:12px;padding:20px 24px;display:flex;flex-wrap:wrap;gap:20px;margin-bottom:40px;font-size:13px">
    ${resume.email ? `<span>📧 ${sanitize(resume.email)}</span>` : ''}
    ${resume.phone ? `<span>📞 ${sanitize(resume.phone)}</span>` : ''}
    ${resume.linkedin ? `<span>🔗 ${sanitize(resume.linkedin)}</span>` : ''}
    ${resume.portfolio ? `<span>🌐 ${sanitize(resume.portfolio)}</span>` : ''}
  </div>

  <!-- BODY -->
  <div style="display:grid;grid-template-columns:2fr 1fr;gap:40px">
    <div>
      ${resume.experiences.length > 0 ? `
      <section style="margin-bottom:40px">
        <h2 style="font-family:'Outfit',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:${primaryColor};margin-bottom:24px">💼 Experiência Profissional</h2>
        ${experiences}
      </section>` : ''}

      ${resume.education.length > 0 ? `
      <section>
        <h2 style="font-family:'Outfit',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:${primaryColor};margin-bottom:16px">🎓 Formação Acadêmica</h2>
        ${education}
      </section>` : ''}
    </div>

    <div>
      ${resume.skills.length > 0 ? `
      <section style="margin-bottom:32px">
        <h2 style="font-family:'Outfit',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:${muted};margin-bottom:16px">Habilidades</h2>
        ${skillBars}
      </section>` : ''}

      ${resume.languages.length > 0 ? `
      <section style="margin-bottom:32px">
        <h2 style="font-family:'Outfit',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:${muted};margin-bottom:12px">Idiomas</h2>
        <div>${languages}</div>
      </section>` : ''}

      ${resume.hobbies.length > 0 ? `
      <section>
        <h2 style="font-family:'Outfit',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:${muted};margin-bottom:12px">Hobbies</h2>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${hobbies}</div>
      </section>` : ''}
    </div>
  </div>

  <footer style="margin-top:48px;padding-top:20px;border-top:1px solid ${border};font-size:11px;color:${muted};text-align:center">
    Gerado por <strong style="color:${primaryColor}">CVFacil.NG</strong> — ${new Date().toLocaleDateString('pt-BR')}
  </footer>
</div>

<button class="print-btn" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const name = resume.fullName.replace(/\s+/g, '_').toLowerCase();
  downloadBlob(blob, `${name}-cvfacil.html`);
};

// ─── EXPORTAR DOCX ──────────────────────────────────────────────────────────────

export const exportToDocx = async (resume: ResumeData): Promise<void> => {
  const primaryHex = getTemplateColor(resume.templateId).replace('#', '');

  const sectionTitle = (text: string) =>
    new Paragraph({
      text: text.toUpperCase(),
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 160 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: primaryHex } },
      run: { color: primaryHex, bold: true, size: 22, font: 'Calibri' },
    });

  const experienceItems = resume.experiences.flatMap(exp => [
    new Paragraph({
      spacing: { before: 200, after: 60 },
      children: [
        new TextRun({ text: exp.role, bold: true, size: 24, color: '1e293b' }),
        new TextRun({ text: `  •  ${exp.period}`, size: 18, color: '94a3b8', italics: true }),
      ],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: exp.company, bold: true, color: primaryHex, size: 20 })],
    }),
    new Paragraph({
      text: exp.description,
      spacing: { after: 240 },
      indent: { left: convertInchesToTwip(0.25) },
      run: { size: 20, color: '475569' },
    }),
  ]);

  const educationItems = resume.education.flatMap(edu => [
    new Paragraph({
      spacing: { before: 160, after: 40 },
      children: [
        new TextRun({ text: edu.degree, bold: true, size: 22, color: '1e293b' }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({ text: edu.institution, size: 20, color: '64748b' }),
        new TextRun({ text: `  |  ${edu.year}`, size: 18, color: '94a3b8', italics: true }),
        new TextRun({ text: `  [${edu.type}]`, size: 16, color: 'cbd5e1' }),
      ],
    }),
  ]);

  const skillItems = resume.skills.map(s =>
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({ text: `${s.name}: `, bold: true, size: 20, color: '334155' }),
        new TextRun({ text: `${'█'.repeat(Math.round(s.level / 10))}${'░'.repeat(10 - Math.round(s.level / 10))}  ${s.level}%`, size: 18, color: primaryHex }),
      ],
    })
  );

  const languageItems = resume.languages.map(l =>
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({ text: l.name, bold: true, size: 20, color: '334155' }),
        new TextRun({ text: ` — ${l.level}`, size: 20, color: primaryHex }),
      ],
    })
  );

  const doc = new Document({
    creator: 'CVFacil.NG',
    title: resume.fullName,
    description: `Currículo gerado pelo CVFacil.NG`,
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22, color: '1e293b' },
          paragraph: { spacing: { line: 276 } },
        },
      },
    },
    sections: [
      {
        properties: {
          type: SectionType.CONTINUOUS,
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.2),
              right: convertInchesToTwip(1.2),
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Gerado por CVFacil.NG  |  Página ', size: 16, color: '94a3b8' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '94a3b8' }),
                ],
              }),
            ],
          }),
        },
        children: [
          // ── Nome e cargo ──
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: resume.fullName,
                bold: true,
                size: 56,
                color: '0f172a',
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: resume.role, size: 28, color: primaryHex, bold: true }),
            ],
          }),

          // ── Contato ──
          new Paragraph({
            spacing: { after: 80 },
            children: [
              ...[
                resume.email && `✉ ${resume.email}`,
                resume.phone && `📞 ${resume.phone}`,
                resume.linkedin && `🔗 ${resume.linkedin}`,
                resume.portfolio && `🌐 ${resume.portfolio}`,
              ]
                .filter(Boolean)
                .flatMap((item, i, arr) => [
                  new TextRun({ text: item as string, size: 18, color: '475569' }),
                  ...(i < arr.length - 1 ? [new TextRun({ text: '  |  ', size: 18, color: 'cbd5e1' })] : []),
                ]),
            ],
          }),

          // ── Resumo ──
          new Paragraph({ text: '', spacing: { before: 120 } }),
          new Paragraph({
            text: resume.summary,
            spacing: { after: 400 },
            indent: { left: convertInchesToTwip(0.1) },
            border: { left: { style: BorderStyle.SINGLE, size: 12, color: primaryHex } },
            run: { size: 20, color: '475569', italics: true },
          }),

          // ── Experiência ──
          ...(resume.experiences.length > 0
            ? [sectionTitle('Experiência Profissional'), ...experienceItems]
            : []),

          // ── Formação ──
          ...(resume.education.length > 0
            ? [sectionTitle('Formação Acadêmica'), ...educationItems]
            : []),

          // ── Habilidades ──
          ...(resume.skills.length > 0
            ? [sectionTitle('Habilidades'), ...skillItems]
            : []),

          // ── Idiomas ──
          ...(resume.languages.length > 0
            ? [sectionTitle('Idiomas'), ...languageItems]
            : []),

          // ── Hobbies ──
          ...(resume.hobbies.length > 0
            ? [
                sectionTitle('Hobbies'),
                new Paragraph({
                  children: resume.hobbies.flatMap((h, i, arr) => [
                    new TextRun({ text: h, size: 20, color: '475569' }),
                    ...(i < arr.length - 1 ? [new TextRun({ text: '  ·  ', color: 'cbd5e1', size: 20 })] : []),
                  ]),
                }),
              ]
            : []),
        ],
      },
    ],
  });

  const buffer = await Packer.toBlob(doc);
  const name = resume.fullName.replace(/\s+/g, '_').toLowerCase();
  downloadBlob(buffer, `${name}-cvfacil.docx`);
};

// ─── HELPER: cor do template ────────────────────────────────────────────────────

const TEMPLATE_COLORS: Record<string, string> = {
  original: '#d97706',
  blue: '#2563eb',
  red: '#dc2626',
  green: '#059669',
  purple: '#7c3aed',
  black: '#171717',
  magenta: '#db2777',
  violet: '#5b21b6',
  gray: '#57534e',
  lilac: '#c084fc',
};

export const getTemplateColor = (templateId: string): string =>
  TEMPLATE_COLORS[templateId] ?? '#d97706';
