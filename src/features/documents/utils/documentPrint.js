import {
  DEFAULT_DOCUMENT_PRINT_SETTINGS,
  DOCUMENT_PAGE_SIZE,
} from "./documentPretextLayout";
import { ANESTHESIA_PAGE_SIZE } from "./anesthesiaRecordLayout";
import { createAnesthesiaTrendChartModel } from "./anesthesiaTrendChart";
import {
  buildDocumentHeaderEntries,
  formatRecordValue,
  isAnesthesiaTemplate,
} from "../schemas/documentTemplates";

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const renderHeaderCells = (entries, className) =>
  entries
    .map(
      (entry) => `
        <div class="${className}__header-cell">
          <span class="${className}__header-label">${escapeHtml(entry.label)}</span>
          <span class="${className}__header-value">${escapeHtml(entry.value)}</span>
        </div>
      `,
    )
    .join("");

const renderNarrativeHtml = ({ template, record, pages, printedAt, printSettings }) => {
  const settings = {
    ...DEFAULT_DOCUMENT_PRINT_SETTINGS,
    ...(printSettings || {}),
  };
  const headerEntries = buildDocumentHeaderEntries(template, record);

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(template.title)}</title>
    <style>
      @page { size: A4 portrait; margin: ${Math.max(4, Number(settings.pageMarginMm) || 6)}mm; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body { margin: 0; padding: 0; background: #eef2f8; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; color: rgba(0,0,0,.88); }
      .print { padding: 18px 0; }
      .page { position: relative; width: ${DOCUMENT_PAGE_SIZE.widthPx}px; min-height: ${DOCUMENT_PAGE_SIZE.heightPx}px; margin: 0 auto 18px; padding: ${DOCUMENT_PAGE_SIZE.paddingTopPx}px ${DOCUMENT_PAGE_SIZE.paddingRightPx}px ${DOCUMENT_PAGE_SIZE.paddingBottomPx}px ${DOCUMENT_PAGE_SIZE.paddingLeftPx}px; background: #fff; box-shadow: 0 14px 34px rgba(15,23,42,.12); page-break-after: always; break-after: page; }
      .page:last-child { page-break-after: auto; break-after: auto; }
      .watermark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: rgba(15,23,42,.05); font-size: 84px; font-weight: 700; transform: rotate(-24deg); pointer-events: none; }
      .header { height: ${DOCUMENT_PAGE_SIZE.headerHeightPx}px; padding-bottom: 18px; border-bottom: 1px solid rgba(15,23,42,.14); }
      .eyebrow { margin: 0 0 10px; color: rgba(15,23,42,.48); font-size: 12px; letter-spacing: .18em; text-transform: uppercase; }
      .title { margin: 0; text-align: center; font-family: "SimSun", "Songti SC", serif; font-size: 30px; }
      .subtitle { margin: 8px 0 0; text-align: center; font-size: 13px; color: rgba(15,23,42,.6); }
      .header-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px 12px; margin-top: 18px; }
      .document-print__header-cell { display: flex; gap: 8px; min-width: 0; font-family: "SimSun", "Songti SC", serif; font-size: 13px; }
      .document-print__header-label { color: rgba(0,0,0,.56); flex-shrink: 0; }
      .document-print__header-value { min-width: 0; }
      .body { padding-top: 18px; min-height: ${DOCUMENT_PAGE_SIZE.heightPx - DOCUMENT_PAGE_SIZE.paddingTopPx - DOCUMENT_PAGE_SIZE.paddingBottomPx - DOCUMENT_PAGE_SIZE.headerHeightPx - DOCUMENT_PAGE_SIZE.footerHeightPx}px; }
      .section + .section { margin-top: 14px; }
      .section-title { height: 30px; padding: 0 12px; border-left: 4px solid #2f6fed; background: linear-gradient(90deg, rgba(47,111,237,.1) 0%, rgba(47,111,237,0) 100%); font-family: "SimSun", "Songti SC", serif; font-size: 15px; font-weight: 700; line-height: 30px; }
      .line { height: ${settings.lineHeight}px; font-family: "SimSun", "Songti SC", serif; font-size: ${settings.bodyFontSize}px; line-height: ${settings.lineHeight}px; white-space: nowrap; overflow: hidden; }
      .signoff { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-top: 20px; padding: 16px; border: 1px solid rgba(15,23,42,.12); border-radius: 16px; }
      .signoff-item { display: flex; flex-direction: column; gap: 8px; }
      .signoff-label { color: rgba(15,23,42,.52); font-size: 12px; }
      .signoff-value { min-height: 24px; padding-bottom: 6px; border-bottom: 1px solid rgba(15,23,42,.18); font-family: "SimSun", "Songti SC", serif; font-size: 14px; }
      .footer { display: flex; justify-content: space-between; gap: 12px; margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(15,23,42,.14); color: rgba(15,23,42,.56); font-size: 12px; }
      @media print { html, body { background: #fff; } .print { padding: 0; } .page { width: auto; min-height: 0; margin: 0 auto; box-shadow: none; } }
    </style>
  </head>
  <body>
    <main class="print">
      ${pages
        .map(
          (page) => `
            <section class="page">
              ${
                settings.showWatermark
                  ? `<div class="watermark">${escapeHtml(settings.watermarkText || "病历演示件")}</div>`
                  : ""
              }
              <header class="header">
                <p class="eyebrow">${escapeHtml(formatRecordValue(record.hospitalName))}</p>
                <h1 class="title">${escapeHtml(template.title)}</h1>
                <p class="subtitle">${escapeHtml(template.summary)}</p>
                <div class="header-grid">${renderHeaderCells(headerEntries, "document-print")}</div>
              </header>
              <div class="body">
                ${(page.sections || [])
                  .map(
                    (section) => `
                      <section class="section">
                        <div class="section-title">${escapeHtml(section.title)}</div>
                        ${(section.lines || [])
                          .map((line) => `<div class="line">${escapeHtml(line)}</div>`)
                          .join("")}
                      </section>
                    `,
                  )
                  .join("")}
                ${
                  page.signoff
                    ? `
                      <section class="signoff">
                        <div class="signoff-item"><span class="signoff-label">${escapeHtml(page.signoff.authorLabel)}</span><strong class="signoff-value">${escapeHtml(page.signoff.authorName)}</strong></div>
                        <div class="signoff-item"><span class="signoff-label">${escapeHtml(page.signoff.reviewerLabel)}</span><strong class="signoff-value">${escapeHtml(page.signoff.reviewerName)}</strong></div>
                        <div class="signoff-item"><span class="signoff-label">确认时间</span><strong class="signoff-value">${escapeHtml(page.signoff.signedDate)}</strong></div>
                      </section>
                    `
                    : ""
                }
              </div>
              <footer class="footer">
                <span>编码：${escapeHtml(template.documentCode)}</span>
                <span>${settings.showPrintTime ? `打印时间：${escapeHtml(printedAt)}` : "病历打印预览"}</span>
                <span>${settings.showPageNumber ? `第 ${page.number} 页` : ""}</span>
              </footer>
            </section>
          `,
        )
        .join("")}
    </main>
    <script>window.addEventListener("load",()=>window.setTimeout(()=>window.print(),220));</script>
  </body>
</html>`;
};

const renderAnesthesiaChartSvg = (page) => {
  const model = createAnesthesiaTrendChartModel({
    timelineSlots: page.timelineSlots,
    trendSeries: page.trendSeries,
    width: 1000,
    height: 320,
  });

  return `
    <svg viewBox="0 0 ${model.width} ${model.height}" class="anes__chart-svg" aria-hidden="true">
      ${model.bpHorizontalLines
        .map(
          (line) => `<line x1="${model.chartPadding.left}" y1="${line.y}" x2="${model.width - model.chartPadding.right}" y2="${line.y}" stroke="rgba(15,23,42,.14)" stroke-width="1" /><text x="8" y="${line.y + 4}" font-size="12" fill="rgba(15,23,42,.54)">${line.value}</text>`,
        )
        .join("")}
      ${model.pulseHorizontalLines
        .map(
          (line) => `<line x1="${model.chartPadding.left}" y1="${line.y}" x2="${model.width - model.chartPadding.right}" y2="${line.y}" stroke="rgba(15,23,42,.08)" stroke-width="1" stroke-dasharray="4 4" />`,
        )
        .join("")}
      ${model.verticalLines
        .map(
          (line) => `<line x1="${line.x}" y1="${line.y1}" x2="${line.x}" y2="${line.y2}" stroke="rgba(15,23,42,.12)" stroke-width="1" />`,
        )
        .join("")}
      ${model.pulsePath ? `<path d="${model.pulsePath}" fill="none" stroke="#2ba471" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />` : ""}
      ${model.pulsePoints.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3.4" fill="#2ba471" />`).join("")}
      ${model.bpSegments
        .map(
          (segment) => `<line x1="${segment.x}" y1="${segment.systolicY}" x2="${segment.x}" y2="${segment.diastolicY}" stroke="#2563eb" stroke-width="2" /><circle cx="${segment.x}" cy="${segment.systolicY}" r="3.6" fill="#2563eb" /><circle cx="${segment.x}" cy="${segment.diastolicY}" r="3.6" fill="#60a5fa" />`,
        )
        .join("")}
      ${model.slotPositions.map((slot) => `<text x="${slot.x}" y="${model.height - 16}" text-anchor="middle" font-size="12" fill="rgba(15,23,42,.58)">${slot.label}</text>`).join("")}
      <text x="8" y="${model.bpZone.top - 6}" font-size="12" fill="rgba(15,23,42,.54)">血压</text>
      <text x="8" y="${model.pulseZone.top - 6}" font-size="12" fill="rgba(15,23,42,.54)">脉搏</text>
    </svg>
  `;
};

const renderTableRows = (rows, columns, blankRows = 0) => {
  const filledRows = rows
    .map(
      (row) => `
        <tr>
          ${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}
        </tr>
      `,
    )
    .join("");
  const emptyRows = new Array(blankRows)
    .fill(null)
    .map(
      () => `
        <tr class="anes__blank-row">
          ${columns.map(() => "<td>&nbsp;</td>").join("")}
        </tr>
      `,
    )
    .join("");

  return `${filledRows}${emptyRows}`;
};

const renderAnesthesiaHtml = ({ template, record, pages, printedAt, printSettings }) => {
  const settings = {
    ...DEFAULT_DOCUMENT_PRINT_SETTINGS,
    ...(printSettings || {}),
  };
  const headerEntries = buildDocumentHeaderEntries(template, record);
  const timingItems = [
    ["入室", record.entryRoomTime],
    ["麻醉开始", record.anesthesiaStartTime],
    ["手术开始", record.surgeryStartTime],
    ["手术结束", record.surgeryEndTime],
    ["麻醉结束", record.anesthesiaEndTime],
    ["出室", record.exitRoomTime],
  ];

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(template.title)}</title>
    <style>
      @page { size: A4 landscape; margin: ${Math.max(4, Number(settings.pageMarginMm) || 6)}mm; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body { margin: 0; padding: 0; background: #eef2f8; color: rgba(0,0,0,.9); font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }
      .anes { padding: 14px 0; }
      .anes__page { position: relative; width: ${ANESTHESIA_PAGE_SIZE.widthPx}px; min-height: ${ANESTHESIA_PAGE_SIZE.heightPx}px; margin: 0 auto 18px; padding: ${ANESTHESIA_PAGE_SIZE.paddingTopPx}px ${ANESTHESIA_PAGE_SIZE.paddingRightPx}px ${ANESTHESIA_PAGE_SIZE.paddingBottomPx}px ${ANESTHESIA_PAGE_SIZE.paddingLeftPx}px; background: #fff; box-shadow: 0 14px 34px rgba(15,23,42,.12); page-break-after: always; break-after: page; }
      .anes__page:last-child { page-break-after: auto; break-after: auto; }
      .anes__watermark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: rgba(15,23,42,.04); font-size: 88px; font-weight: 700; transform: rotate(-22deg); pointer-events: none; }
      .anes__header { padding-bottom: 12px; border-bottom: 1px solid rgba(15,23,42,.14); }
      .anes__masthead { display: grid; grid-template-columns: 240px 1fr 180px; gap: 12px; align-items: center; }
      .anes__hospital { margin: 0; color: rgba(15,23,42,.66); font-family: "SimSun", "Songti SC", serif; font-size: 14px; }
      .anes__title { margin: 0; text-align: center; font-family: "SimSun", "Songti SC", serif; font-size: 24px; letter-spacing: .06em; }
      .anes__summary { margin: 4px 0 0; text-align: center; font-size: 12px; color: rgba(15,23,42,.58); }
      .anes__doc-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; color: rgba(15,23,42,.56); font-size: 12px; }
      .anes__header-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px 10px; margin-top: 10px; }
      .anes__header-cell { display: flex; gap: 6px; min-width: 0; font-family: "SimSun", "Songti SC", serif; font-size: 12px; }
      .anes__header-label { color: rgba(0,0,0,.54); flex-shrink: 0; }
      .anes__timing { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
      .anes__timing-card { padding: 7px 8px; border: 1px solid rgba(148,163,184,.16); border-radius: 12px; background: rgba(248,251,255,.96); }
      .anes__timing-label { display: block; font-size: 11px; color: rgba(15,23,42,.52); }
      .anes__timing-value { display: block; margin-top: 3px; font-size: 12px; font-weight: 600; }
      .anes__card { margin-top: 10px; padding: 10px 12px; border-radius: 18px; border: 1px solid rgba(148,163,184,.18); background: rgba(255,255,255,.96); }
      .anes__section-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 8px; }
      .anes__section-title { margin: 0; font-size: 14px; color: #0f172a; }
      .anes__section-tip { color: rgba(15,23,42,.52); font-size: 11px; }
      .anes__chart-svg { width: 100%; height: auto; display: block; }
      .anes__aux-table, .anes__table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 12px; }
      .anes__aux-table th, .anes__aux-table td, .anes__table th, .anes__table td { padding: 5px 4px; border-bottom: 1px solid rgba(148,163,184,.14); text-align: left; vertical-align: top; }
      .anes__aux-table th { width: 72px; color: rgba(15,23,42,.56); font-weight: 600; }
      .anes__event-grid, .anes__table-grid, .anes__signoff { display: grid; gap: 10px; }
      .anes__event-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 10px; }
      .anes__event-card { padding: 10px 12px; border-radius: 14px; background: rgba(248,251,255,.96); border: 1px solid rgba(148,163,184,.16); }
      .anes__event-title { margin: 0 0 6px; font-size: 12px; }
      .anes__event-item { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; line-height: 1.55; }
      .anes__table-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .anes__blank-row td { height: 26px; color: transparent; }
      .anes__note-line { min-height: ${settings.lineHeight}px; font-family: "SimSun", "Songti SC", serif; font-size: ${settings.bodyFontSize}px; line-height: ${settings.lineHeight}px; border-bottom: 1px dashed rgba(148,163,184,.14); }
      .anes__signoff { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 12px; }
      .anes__signoff-item { display: flex; flex-direction: column; gap: 8px; }
      .anes__signoff-label { color: rgba(15,23,42,.52); font-size: 12px; }
      .anes__signoff-value { min-height: 24px; padding-bottom: 6px; border-bottom: 1px solid rgba(15,23,42,.18); font-size: 14px; }
      .anes__footer { display: flex; justify-content: space-between; gap: 12px; margin-top: auto; padding-top: 10px; border-top: 1px solid rgba(15,23,42,.14); color: rgba(15,23,42,.56); font-size: 12px; }
      @media print { html, body { background: #fff; } .anes { padding: 0; } .anes__page { width: auto; min-height: 0; margin: 0 auto; box-shadow: none; } }
    </style>
  </head>
  <body>
    <main class="anes">
      ${pages
        .map((page) => {
          if (page.kind === "anesthesia-main") {
            const eventCards = ["麻醉事件", "气道管理", "手术事件"].map((laneTitle) => ({
              title: laneTitle,
              items: page.eventMarkers.filter((marker) => marker.lane === laneTitle),
            }));
            const auxRows = [
              ["时间", ...page.trendSeries.map((point) => formatRecordValue(point.time))],
              ["SpO2", ...page.trendSeries.map((point) => formatRecordValue(point.spo2))],
              ["ETCO2", ...page.trendSeries.map((point) => formatRecordValue(point.etco2))],
              ["呼吸", ...page.trendSeries.map((point) => formatRecordValue(point.respiration))],
              ["体温", ...page.trendSeries.map((point) => formatRecordValue(point.temperature))],
            ];
            const medicationRows = page.medications.map((row) => [
              formatRecordValue(row.time),
              formatRecordValue(row.name),
              formatRecordValue(row.dose),
              formatRecordValue(row.unit),
              formatRecordValue(row.route),
              formatRecordValue(row.remark),
            ]);
            const fluidRows = page.fluids.map((row) => [
              formatRecordValue(row.time),
              formatRecordValue(row.name),
              formatRecordValue(row.volume),
              formatRecordValue(row.unit),
              formatRecordValue(row.kind),
              formatRecordValue(row.remark),
            ]);

            return `
              <section class="anes__page">
                ${
                  settings.showWatermark
                    ? `<div class="anes__watermark">${escapeHtml(settings.watermarkText || "麻醉记录单")}</div>`
                    : ""
                }
                <header class="anes__header">
                  <div class="anes__masthead">
                    <p class="anes__hospital">${escapeHtml(formatRecordValue(record.hospitalName))}</p>
                    <div><h1 class="anes__title">${escapeHtml(template.title)}</h1><p class="anes__summary">${escapeHtml(template.summary)}</p></div>
                    <div class="anes__doc-meta"><span>编码：${escapeHtml(template.documentCode)}</span><span>第 ${page.number} 页</span></div>
                  </div>
                  <div class="anes__header-grid">${renderHeaderCells(headerEntries, "anes")}</div>
                  <div class="anes__timing">
                    ${timingItems
                      .map(
                        ([label, value]) => `<div class="anes__timing-card"><span class="anes__timing-label">${escapeHtml(label)}</span><strong class="anes__timing-value">${escapeHtml(formatRecordValue(value))}</strong></div>`,
                      )
                      .join("")}
                  </div>
                </header>
                <section class="anes__card">
                  <div class="anes__section-head"><h2 class="anes__section-title">术中生命体征趋势</h2><span class="anes__section-tip">脉搏曲线 + 收缩压 / 舒张压图示</span></div>
                  ${renderAnesthesiaChartSvg(page)}
                </section>
                <section class="anes__card">
                  <div class="anes__section-head"><h2 class="anes__section-title">时间轴附加参数</h2><span class="anes__section-tip">与主图时间刻度保持一致</span></div>
                  <table class="anes__aux-table"><tbody>${auxRows
                    .map(
                      (row) => `<tr>${row
                        .map((cell, index) => (index === 0 ? `<th>${escapeHtml(cell)}</th>` : `<td>${escapeHtml(cell)}</td>`))
                        .join("")}</tr>`,
                    )
                    .join("")}</tbody></table>
                </section>
                <section class="anes__event-grid">
                  ${eventCards
                    .map(
                      (lane) => `
                        <article class="anes__event-card">
                          <h3 class="anes__event-title">${escapeHtml(lane.title)}</h3>
                          ${(lane.items.length ? lane.items : [{ time: "--", label: "--" }])
                            .map(
                              (item) => `<div class="anes__event-item"><span>${escapeHtml(formatRecordValue(item.time))}</span><span>${escapeHtml(formatRecordValue(item.label))}</span></div>`,
                            )
                            .join("")}
                        </article>
                      `,
                    )
                    .join("")}
                </section>
                <section class="anes__table-grid">
                  <article class="anes__card">
                    <div class="anes__section-head"><h2 class="anes__section-title">术中用药</h2><span class="anes__section-tip">溢出内容自动转续页</span></div>
                    <table class="anes__table">
                      <thead><tr><th>时间</th><th>药品</th><th>剂量</th><th>单位</th><th>途径</th><th>备注</th></tr></thead>
                      <tbody>${renderTableRows(medicationRows, ["时间","药品","剂量","单位","途径","备注"])}</tbody>
                    </table>
                  </article>
                  <article class="anes__card">
                    <div class="anes__section-head"><h2 class="anes__section-title">液体与出入量</h2><span class="anes__section-tip">输入 / 输出合并记录</span></div>
                    <table class="anes__table">
                      <thead><tr><th>时间</th><th>项目</th><th>数量</th><th>单位</th><th>类别</th><th>备注</th></tr></thead>
                      <tbody>${renderTableRows(fluidRows, ["时间","项目","数量","单位","类别","备注"])}</tbody>
                    </table>
                  </article>
                </section>
                <footer class="anes__footer">
                  <span>编码：${escapeHtml(template.documentCode)}</span>
                  <span>${settings.showPrintTime ? `打印时间：${escapeHtml(printedAt)}` : "麻醉记录单打印预览"}</span>
                  <span>${settings.showPageNumber ? `第 ${page.number} 页` : ""}</span>
                </footer>
              </section>
            `;
          }

          const overflowTables = page.overflowTables || [];

          return `
            <section class="anes__page">
              ${
                settings.showWatermark
                  ? `<div class="anes__watermark">${escapeHtml(settings.watermarkText || "麻醉记录单")}</div>`
                  : ""
              }
              <header class="anes__header">
                <div class="anes__masthead">
                  <p class="anes__hospital">${escapeHtml(formatRecordValue(record.hospitalName))}</p>
                  <div><h1 class="anes__title">${escapeHtml(template.title)}（续页）</h1></div>
                  <div class="anes__doc-meta"><span>编码：${escapeHtml(template.documentCode)}</span><span>第 ${page.number} 页</span></div>
                </div>
                <div class="anes__header-grid">${renderHeaderCells(headerEntries.slice(0, 8), "anes")}</div>
              </header>
              ${overflowTables
                .map(
                  (table) => `
                    <section class="anes__card">
                      <div class="anes__section-head"><h2 class="anes__section-title">${escapeHtml(table.title)}</h2><span class="anes__section-tip">续页承接主单溢出行</span></div>
                      <table class="anes__table">
                        <thead><tr>${table.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>
                        <tbody>${renderTableRows(table.rows, table.columns, table.blankRowCount)}</tbody>
                      </table>
                    </section>
                  `,
                )
                .join("")}
              ${(page.sections || [])
                .map(
                  (section) => `
                    <section class="anes__card">
                      <h2 class="anes__section-title">${escapeHtml(section.title)}</h2>
                      ${(section.lines || []).map((line) => `<div class="anes__note-line">${escapeHtml(line)}</div>`).join("")}
                    </section>
                  `,
                )
                .join("")}
              ${
                page.signoff
                  ? `
                    <section class="anes__signoff">
                      <div class="anes__signoff-item"><span class="anes__signoff-label">麻醉医师</span><strong class="anes__signoff-value">${escapeHtml(page.signoff.doctor)}</strong></div>
                      <div class="anes__signoff-item"><span class="anes__signoff-label">审核医师</span><strong class="anes__signoff-value">${escapeHtml(page.signoff.reviewer)}</strong></div>
                      <div class="anes__signoff-item"><span class="anes__signoff-label">签署时间</span><strong class="anes__signoff-value">${escapeHtml(page.signoff.signedDate)}</strong></div>
                    </section>
                  `
                  : ""
              }
              <footer class="anes__footer">
                <span>编码：${escapeHtml(template.documentCode)}</span>
                <span>${settings.showPrintTime ? `打印时间：${escapeHtml(printedAt)}` : "麻醉记录单打印预览"}</span>
                <span>${settings.showPageNumber ? `第 ${page.number} 页` : ""}</span>
              </footer>
            </section>
          `;
        })
        .join("")}
    </main>
    <script>window.addEventListener("load",()=>window.setTimeout(()=>window.print(),220));</script>
  </body>
</html>`;
};

export const printDocumentRecord = ({ template, record, pages, printedAt, printSettings }) => {
  if (!template || !Array.isArray(pages) || !pages.length) {
    return false;
  }

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    return false;
  }

  const html = isAnesthesiaTemplate(template)
    ? renderAnesthesiaHtml({ template, record, pages, printedAt, printSettings })
    : renderNarrativeHtml({ template, record, pages, printedAt, printSettings });

  printWindow.document.write(html);
  printWindow.document.close();
  return true;
};
