/**
 * METAM4 Export Parser
 * =====================
 * Turnier Protokoll System (TPS) / METAMORPHOZ 4 statik HTML export'ini
 * okur ve platformun veri modeline çevirir.
 *
 * Kaynak yapı (METAM4.rar içinde):
 *   METAM4/<discipline>/index.htm          -> yarışma listesi
 *   METAM4/<discipline>/<NNNN>/compreport.htm  -> yarışma raporu (meta + jüri)
 *   METAM4/<discipline>/<NNNN>/totalresults.htm -> sıralama tablosu
 *   METAM4/<discipline>/<NNNN>/final.htm        -> skating detayı (kural 9/10/11)
 *   METAM4/<discipline>/<NNNN>/marking.htm      -> elemeye kalanlar
 *
 * Encoding: ISO-8859-1 (latin1)
 */

import { createExtractorFromData } from 'node-unrar-js';

// ---------------------------------------------------------------------------
// HTML yardımcıları
// ---------------------------------------------------------------------------

const ENTITIES = {
  '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
  '&#39;': "'", '&aacute;': 'á', '&egrave;': 'è', '&uuml;': 'ü', '&ouml;': 'ö',
  '&ccedil;': 'ç', '&sdot;': '·', '&hellip;': '…', '&ndash;': '–',
};

export function decodeEntities(s) {
  return s
    .replace(/&[a-zA-Z#0-9]+;/g, (m) => ENTITIES[m.toLowerCase()] ?? m)
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

export function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]*>/g, '')).replace(/ /g, ' ');
}

/** Tek değeri diziye çevirir (undefined -> []). */
export function toArray(v) {
  if (v == null || v === '') return [];
  return Array.isArray(v) ? v : [v];
}

/** Hücre içeriğini satırlara böler (<br> ve <p> ayırıcı). */
export function cellLines(html) {
  return stripTags(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?p[^>]*>/gi, '\n'))
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 0);
}

/** HTML'deki <tr> satırlarını, colspan genişletilmiş hücre dizilerine çevirir. */
export function parseRows(html) {
  const out = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = trRe.exec(html)) !== null) {
    const rowHtml = m[1];
    const cells = [];
    const cellRe = /<(t[dh])([^>]*)>([\s\S]*?)<\/\1>/gi;
    let c;
    while ((c = cellRe.exec(rowHtml)) !== null) {
      const attrs = c[2] || '';
      const spanM = /colspan\s*=\s*"?(\d+)/i.exec(attrs);
      const span = spanM ? Number(spanM[1]) : 1;
      const inner = c[3] || '';
      const lines = cellLines(inner);
      const cell = {
        html: inner,
        text: lines.join(' '),
        lines,
        isHeader: c[1].toLowerCase() === 'th',
        width: (/\swidth\s*=\s*"?(\d+)%?/i.exec(attrs) || [])[1] || null,
      };
      cells.push(cell);
      for (let i = 1; i < span; i++) cells.push({ ...cell, text: '', lines: [], isHeader: cell.isHeader, colspan: true });
    }
    if (cells.length) out.push(cells);
  }
  return out;
}

/** İki hücreli (etiket|değer) satırları nesneye çevirir. Sadece ilk tekrarı alır. */
export function parseKeyValueTable(rowsOrHtml) {
  const rows = typeof rowsOrHtml === 'string' ? parseRows(rowsOrHtml) : rowsOrHtml;
  const out = {};
  for (const row of rows) {
    if (row.length < 2) continue;
    const key = row[0].text.trim();
    const val = row[1].lines.join(' ').trim();
    if (!key || !val) continue;
    if (key in out) continue;              // ilk kayıt kazanır
    out[key] = val;
  }
  return out;
}

/** "A: TUGBA UTE" gibi satırları [{label, full_name}] listesine çevirir. */
export function parseAdjudicators(rows) {
  const judges = [];
  for (const row of rows) {
    for (const cell of row) {
      const t = cell.text.trim();
      const m = /^([A-H]):\s*(.+)$/.exec(t);
      if (m) judges.push({ label: m[1], full_name: m[2].trim() });
    }
  }
  return judges;
}

/** "No. | Name / Club | Round | ... | Place" başlığından kolon haritası çıkarır. */
export function buildColumnMap(headerRows) {
  // En çok dolu hücreye sahip başlık satırını seç
  let header = null;
  for (const r of headerRows) {
    const labels = r.map((c) => c.text.trim());
    if (labels.some((l) => /^(No\.?|Name \/ Club|Round|Place|Sum|ABCDE Su|ABC Su)$/i.test(l))) {
      if (!header || labels.filter(Boolean).length > header.filter(Boolean).length) header = labels;
    }
  }
  return header || [];
}

// ---------------------------------------------------------------------------
// Dosya bazlı parser'lar
// ---------------------------------------------------------------------------

/** compreport.htm -> yarışma meta verisi + jüri listesi */
export function parseCompetitionReport(html) {
  const rows = parseRows(html);

  // Sonuç tablosunun başlık satırını bul: [Place][Name][Club / Nation]
  let resultsStart = -1;
  for (let i = 0; i < rows.length; i++) {
    const c = rows[i].map((x) => x.text.trim());
    if (c[0] === 'Place' && /^Name/i.test(c[1] || '') && c.length >= 3) { resultsStart = i; break; }
  }

  // Meta verisi SADECE sonuç tablosundan ÖNCEki satırlardan alınır
  const metaRows = resultsStart === -1 ? rows : rows.slice(0, resultsStart);
  const kv = parseKeyValueTable(metaRows);

  const meta = {
    date: kv['Date'] || null,
    place: kv['Place'] || null,
    organizer: kv['Organizer'] || null,
    executor: kv['Executor'] || null,
    competition: kv['Competition'] || null,
    title: kv['Title'] || null,
    chairman: kv['Chairman'] || null,
    scrutineers: toArray(kv['Scrutineer(s)'] || kv['Scrutineer']),
  };

  // Jüri listesi: "Adjudicator(s)" bölümünden A:/B:/C: hücreleri
  const judges = [];
  let inAdjudicators = false;
  for (const row of metaRows) {
    const first = row[0]?.text.trim() || '';
    if (/^Adjudicator/i.test(first)) { inAdjudicators = true; continue; }
    if (!inAdjudicators) continue;
    for (const cell of row) {
      const m = /^([A-H]):\s*(.+)$/.exec(cell.text.trim());
      if (m) judges.push({ label: m[1], full_name: m[2].trim() });
    }
  }

  // Sonuç tablosu: Place | Name | Club / Nation
  const placements = [];
  const rounds = [];
  for (const row of (resultsStart === -1 ? [] : rows.slice(resultsStart + 1))) {
    const cells = row.filter((c) => !c.colspan);
    if (cells.length !== 3) continue;
    const c0 = cells[0].text.trim();
    const c1 = cells[1].text.trim();
    const c2 = cells[2].text.trim();

    // Sıralama satırı: ilk hücre sayısal
    if (/^\d+$/.test(c0)) {
      if (c1) placements.push({ place: Number(c0), name: c1, club: c2 });
      continue;
    }
    // Tur istatistiği satırı: "Final | 2 | -"  (ikinci hücre sayısal veya '-')
    if (/^(Final|\d+)$/.test(c0) && (/^\d+$/.test(c1) || c1 === '-')) {
      rounds.push({ round: c0, couples_danced: c1, couples_set: c2 });
    }
  }

  return { meta, judges, placements, rounds };
}

/**
 * totalresults.htm -> her performans için sıralama, jüri puanları, kulüp
 * "Name / Club" hücresi iki satır içerir: satır1 = dansçı adı, satır2 = kulüp
 */
export function parseTotalResults(html) {
  const rows = parseRows(html);

  // Başlık satırını bul → kolon indeksleri
  let header = [];
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 12); i++) {
    const labels = rows[i].map((c) => c.text.trim());
    if (labels.some((l) => /^No\.?$/i.test(l)) && labels.some((l) => /Place/i.test(l))) {
      header = labels; headerIdx = i; break;
    }
  }
  if (headerIdx === -1) return { performances: [], judges: [] };

  const col = {};
  header.forEach((label, i) => {
    if (/^No\.?$/i.test(label)) col.no = i;
    else if (/Name \/ Club/i.test(label)) col.name = i;
    else if (/^Round$/i.test(label)) col.round = i;
    else if (/Place/i.test(label)) col.place = i;
    else if (/^Sum$/i.test(label)) col.sum = i;
    else if (/Su$|ABC/i.test(label)) col.marks = i;
  });

  // Jüri listesi sayfanın üstünde
  const judges = [];
  for (const row of rows.slice(0, headerIdx)) {
    for (const cell of row) {
      const m = /^([A-H]):\s*(.+)$/.exec(cell.text.trim());
      if (m) judges.push({ label: m[1], full_name: m[2].trim() });
    }
  }

  const performances = [];
  for (const row of rows.slice(headerIdx + 1)) {
    const get = (key) => (col[key] != null ? row[col[key]] : null);
    const noCell = get('no');
    if (!noCell) continue;
    const no = noCell.text.trim();
    if (!/^\d+$/.test(no)) continue;

    const nameCell = get('name');
    const lines = nameCell ? nameCell.lines : [];
    const displayName = lines[0] || '';
    const club = lines.length > 1 ? lines.slice(1).join(' ') : '';

    const marksStr = (get('marks')?.text || '').trim();
    const placeStr = (get('place')?.text || '').trim();
    const sumStr = (get('sum')?.text || '').trim();
    const round = (get('round')?.text || 'Final').trim();

    // "11111" -> [1,1,1,1,1] ; "311" -> [3,1,1]
    const judgeMarks = marksStr
      ? marksStr.split('').map((c) => (/\d/.test(c) ? Number(c) : null)).filter((v) => v !== null)
      : [];

    performances.push({
      bib_number: Number(no),
      name: displayName,
      club,
      round,
      marks: marksStr || null,
      judge_marks: judgeMarks,
      sum: sumStr
        ? Number(sumStr.replace(',', '.'))
        : (judgeMarks.length ? judgeMarks.reduce((a, b) => a + b, 0) : null),
      place: placeStr ? Number(placeStr) : null,
    });
  }

  return { performances, judges, header };
}

/** final.htm -> skating hesabı detayı (kural 9/10/11) */
export function parseFinal(html) {
  const rows = parseRows(html);
  const details = [];

  for (const row of rows) {
    const cells = row.filter((c) => !c.colspan);
    if (cells.length < 4) continue;
    const no = cells[0].text.trim();
    if (!/^\d+$/.test(no)) continue;

    // A B C D E | 1. | 1.-2. | Place | Sum
    const judgeCols = [];
    let i = 1;
    while (i < cells.length && /^[A-H]$/.test(cells[i].text.trim())) {
      judgeCols.push({ label: cells[i].text.trim(), mark: cells[i + 1]?.text?.trim() || null });
      i += 2;
    }
    if (!judgeCols.length) continue;

    const rest = cells.slice(i).map((c) => c.text.trim());
    details.push({
      bib_number: Number(no),
      judge_marks: Object.fromEntries(judgeCols.map((j) => [j.label, j.mark])),
      first_count: rest[0] || null,
      tie_count: rest[1] && rest[1] !== '-' ? rest[1] : null,
      place: rest[2] || null,
      sum: rest[3] || null,
    });
  }
  return { details };
}

/**
 * marking.htm -> final'a kalanlar, başlangıç/bitiş sıraları
 * Yapı:
 *   [Number of couples: N][Number]
 *   [Name of adjudicators][bib1][bib2][bib3]
 *   [Qual. for Final][X][X][X]
 *   [Addition Final][2][3][1]
 *   [Number][bib1][bib2][bib3]
 *   [Place from][2][3][1]
 */
export function parseMarking(html) {
  const rows = parseRows(html);
  const out = {
    couples_count: null,
    numbers: [],
    qualified: [],
    addition: [],
    place_from: [],
    place_to: [],
  };

  for (const row of rows) {
    const cells = row.filter((c) => !c.colspan);
    if (!cells.length) continue;
    const label = cells[0].text.trim();

    if (/^Number of couples/i.test(label)) {
      const m = /(\d+)/.exec(label);
      out.couples_count = m ? Number(m[1]) : null;
      continue;
    }
    if (/^Number$/i.test(label)) {
      out.numbers = cells.slice(1).map((c) => c.text.trim()).filter(Boolean);
      continue;
    }
    if (/^Qual\. for Final/i.test(label)) {
      out.qualified = cells.slice(1).map((c) => c.text.trim()).filter(Boolean);
      continue;
    }
    if (/^Addition Final/i.test(label)) {
      out.addition = cells.slice(1).map((c) => c.text.trim()).filter(Boolean);
      continue;
    }
    if (/^Place from/i.test(label)) {
      out.place_from = cells.slice(1).map((c) => c.text.trim()).filter(Boolean);
      continue;
    }
    if (/^Place to/i.test(label)) {
      out.place_to = cells.slice(1).map((c) => c.text.trim()).filter(Boolean);
      continue;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Arşiv gezgini
// ---------------------------------------------------------------------------

/** RAR / ZIP içindeki dosyaları { path, data } listesi olarak döndürür. */
export async function extractArchive(buffer, filename = 'upload.rar') {
  const isRar = filename.toLowerCase().endsWith('.rar') ||
                buffer[0] === 0x52 && buffer[1] === 0x61 && buffer[2] === 0x72;

  if (isRar) {
    const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const extractor = await createExtractorFromData({ data: ab });
    const files = [];
    const extracted = extractor.extract();   // filtre yok -> hepsini açar
    for (const entry of extracted.files) {
      if (!entry.extraction) continue;
      if (entry.fileHeader?.flags?.directory) continue;
      files.push({ path: entry.fileHeader.name, data: Buffer.from(entry.extraction) });
    }
    return files;
  }

  // ZIP: minimal merkezi dizin okuyucu (deflate için zlib)
  if (filename.toLowerCase().endsWith('.zip')) {
    const zlib = await import('node:zlib');
    const files = [];
    let offset = 0;
    while (offset < buffer.length - 4) {
      const sig = buffer.readUInt32LE(offset);
      if (sig !== 0x04034b50) break;
      const method = buffer.readUInt16LE(offset + 8);
      const compSize = buffer.readUInt32LE(offset + 18);
      const nameLen = buffer.readUInt16LE(offset + 26);
      const extraLen = buffer.readUInt16LE(offset + 28);
      const name = buffer.toString('utf8', offset + 30, offset + 30 + nameLen);
      const dataStart = offset + 30 + nameLen + extraLen;
      const raw = buffer.subarray(dataStart, dataStart + compSize);
      files.push({
        path: name,
        data: method === 0 ? Buffer.from(raw) : zlib.inflateRawSync(raw),
      });
      offset = dataStart + compSize;
    }
    return files;
  }

  throw new Error(`Desteklenmeyen dosya tipi: ${filename}`);
}

/** Arşivdeki tüm .htm dosyalarını okunabilir içerikle döndürür. */
export async function readHtmlFiles(files) {
  return files
    .filter((f) => /\.html?$/i.test(f.path))
    .map((f) => ({
      path: f.path.replace(/\\/g, '/'),
      html: f.data.toString('latin1'),
    }));
}

/**
 * Tüm export'u platform veri modeline çevirir.
 * @returns {{ source, disciplines: Object, stats: Object }}
 */
export function parseExport(htmlFiles) {
  const byPath = new Map(htmlFiles.map((f) => [f.path, f.html]));
  const disciplines = {};
  const stats = { disciplines: 0, competitions: 0, performances: 0, judges: 0, warnings: [] };

  // <discipline>/<NNNN>/... yapısını bul
  const re = /^.*?([^/]+)\/(\d{4})\/([^/]+\.html?)$/;
  for (const [path, html] of byPath) {
    const m = re.exec(path);
    if (!m) continue;
    const [, discipline, num, file] = m;
    const key = `${discipline}/${num}`;

    if (!disciplines[discipline]) { disciplines[discipline] = {}; stats.disciplines++; }
    const node = disciplines[discipline][key] ||= { ref: key, discipline, number: num };

    if (file === 'compreport.htm') {
      const report = parseCompetitionReport(html);
      node.meta = report.meta;
      node.judges = report.judges;
      node.placements = report.placements;
      node.rounds = report.rounds;
      stats.competitions++;
      stats.judges += report.judges.length;
    } else if (file === 'totalresults.htm') {
      const tr = parseTotalResults(html);
      node.performances = tr.performances;
      if (tr.judges.length && !node.judges) node.judges = tr.judges;
      if (tr.judges.length && node.judges) {
        const seen = new Set(node.judges.map((j) => j.label));
        for (const j of tr.judges) if (!seen.has(j.label)) node.judges.push(j);
      }
      stats.performances += tr.performances.length;
    } else if (file === 'final.htm') {
      node.final = parseFinal(html).details;
    } else if (file === 'marking.htm') {
      node.marking = parseMarking(html);
    } else if (file === 'menu.htm') {
      const t = /<title>([^<]*)<\/title>/i.exec(html);
      if (t) node.menu_title = decodeEntities(t[1]);
    }
  }

  // category başlığı: menu title ya da meta.competition
  for (const disc of Object.values(disciplines)) {
    for (const node of Object.values(disc)) {
      node.category_name = node.meta?.competition || node.menu_title || null;
      node.category_title = node.meta?.title || null;
    }
  }

  return { source: 'metam4', disciplines, stats };
}

/** Tam akış: buffer -> JSON */
export async function parseUpload(buffer, filename) {
  const files = await extractArchive(buffer, filename);
  const htmlFiles = await readHtmlFiles(files);
  if (!htmlFiles.length) {
    throw new Error('Arşivde HTML dosyası bulunamadı. METAM4 export\'unu (.rar/.zip) yükleyin.');
  }
  return parseExport(htmlFiles);
}
