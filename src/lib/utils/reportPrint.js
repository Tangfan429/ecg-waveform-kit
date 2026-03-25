const buildPrintWindow = (title, bodyMarkup, scriptMarkup = "") => {
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    return null;
  }

  printWindow.document.write(`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <style>
      @page {
        margin: 12mm;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: #f3f4f6;
        font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
      }

      .report-print {
        padding: 24px 0 40px;
      }

      .report-print__page {
        display: block;
        width: min(100%, 900px);
        margin: 0 auto 24px;
        background: #ffffff;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
        page-break-after: always;
        break-after: page;
      }

      .report-print__page:last-child {
        page-break-after: auto;
        break-after: auto;
      }

      .report-print__page img,
      .report-print__frame {
        display: block;
        width: 100%;
        border: 0;
      }

      .report-print__frame {
        min-height: 100vh;
      }

      @media print {
        html,
        body {
          background: #ffffff;
        }

        .report-print {
          padding: 0;
        }

        .report-print__page {
          width: 100%;
          margin: 0;
          box-shadow: none;
        }
      }
    </style>
  </head>
  <body>
    ${bodyMarkup}
    ${scriptMarkup}
  </body>
</html>`);
  printWindow.document.close();

  return printWindow;
};

// 只打印左侧报告区，因此这里单独生成一个纯报告内容的打印窗口。
export const printImageReport = (report) => {
  const pages = Array.isArray(report?.pages) ? report.pages : [];

  if (!pages.length) {
    return false;
  }

  const bodyMarkup = `
    <main class="report-print">
      ${pages
        .map(
          (page) => `
            <figure class="report-print__page">
              <img src="${page.url}" alt="${page.alt || "报告页"}" />
            </figure>
          `,
        )
        .join("")}
    </main>
  `;

  const scriptMarkup = `
    <script>
      window.addEventListener("load", () => {
        window.setTimeout(() => {
          window.print();
        }, 220);
      });
    </script>
  `;

  return Boolean(buildPrintWindow("报告打印", bodyMarkup, scriptMarkup));
};

// PDF 分支预留独立打印窗口。当前 mock 使用图片页，但后续改成真实 PDF 后可以直接复用。
export const printPdfReport = (reportUrl) => {
  if (!reportUrl) {
    return false;
  }

  const bodyMarkup = `
    <main class="report-print">
      <iframe class="report-print__frame" id="report-print-frame" src="${reportUrl}" title="报告打印"></iframe>
    </main>
  `;

  const scriptMarkup = `
    <script>
      const iframe = document.getElementById("report-print-frame");

      iframe?.addEventListener("load", () => {
        window.setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (error) {
            window.print();
          }
        }, 320);
      });
    </script>
  `;

  return Boolean(buildPrintWindow("PDF 报告打印", bodyMarkup, scriptMarkup));
};

export const printReportDocument = (report) => {
  if (!report) {
    return false;
  }

  if (report.sourceType === "pdf") {
    return printPdfReport(report.url);
  }

  return printImageReport(report);
};
