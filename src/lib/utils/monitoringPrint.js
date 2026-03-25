function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const PRINT_STYLES = `
  :root {
    color-scheme: light;
    font-family: "Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    background: #eef2f7;
    color: #0f172a;
  }

  .monitoring-print {
    padding: 24px;
  }

  .monitoring-print__header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 18px;
  }

  .monitoring-print__title {
    margin: 0;
    font-size: 24px;
    line-height: 1.1;
  }

  .monitoring-print__subtitle {
    margin: 8px 0 0;
    color: #475569;
    font-size: 13px;
  }

  .monitoring-print__content {
    border-radius: 20px;
    overflow: hidden;
    background: #ffffff;
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
  }

  @media print {
    body {
      background: #ffffff;
    }

    .monitoring-print {
      padding: 0;
    }

    .monitoring-print__content {
      box-shadow: none;
      border-radius: 0;
    }
  }
`;

export function printMonitoringDocument({
  title = "监护波形打印",
  subtitle = "",
  html = "",
} = {}) {
  if (typeof window === "undefined" || !html) {
    return false;
  }

  const printWindow = window.open("", "_blank", "width=1366,height=900");

  if (!printWindow) {
    return false;
  }

  const documentTitle = escapeHtml(title);
  const documentSubtitle = escapeHtml(subtitle);

  printWindow.document.write(`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>${documentTitle}</title>
    <style>${PRINT_STYLES}</style>
  </head>
  <body>
    <main class="monitoring-print">
      <header class="monitoring-print__header">
        <div>
          <h1 class="monitoring-print__title">${documentTitle}</h1>
          <p class="monitoring-print__subtitle">${documentSubtitle}</p>
        </div>
      </header>
      <section class="monitoring-print__content">${html}</section>
    </main>
  </body>
</html>`);
  printWindow.document.close();

  const finalizePrint = () => {
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 120);
  };

  printWindow.addEventListener("load", finalizePrint, { once: true });

  return true;
}

export default printMonitoringDocument;
