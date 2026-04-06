import { layoutNextLine, prepareWithSegments } from "@chenglou/pretext";
import { buildDocumentHeaderEntries } from "../schemas/documentTemplates";

export const DEFAULT_DOCUMENT_PRINT_SETTINGS = Object.freeze({
  pageMarginMm: 6,
  bodyFontSize: 14,
  lineHeight: 24,
  showWatermark: true,
  watermarkText: "病历演示件",
  showPageNumber: true,
  showPrintTime: true,
});

export const DOCUMENT_PAGE_SIZE = Object.freeze({
  widthPx: 794,
  heightPx: 1123,
  paddingTopPx: 44,
  paddingRightPx: 52,
  paddingBottomPx: 36,
  paddingLeftPx: 52,
  headerHeightPx: 182,
  footerHeightPx: 56,
  sectionTitleHeightPx: 30,
  sectionGapPx: 14,
  signatureHeightPx: 96,
});

const preparedCache = new Map();

const LINE_START_CURSOR = Object.freeze({
  segmentIndex: 0,
  graphemeIndex: 0,
});

const getBodyFont = (settings) =>
  `400 ${settings.bodyFontSize}px "SimSun", "Songti SC", "PingFang SC", serif`;

const getPreparedKey = (text, font, whiteSpace) =>
  `${font}::${whiteSpace}::${text}`;

const getPreparedText = (text, font, whiteSpace = "pre-wrap") => {
  const cacheKey = getPreparedKey(text, font, whiteSpace);

  if (preparedCache.has(cacheKey)) {
    return preparedCache.get(cacheKey);
  }

  const prepared = prepareWithSegments(text, font, { whiteSpace });
  preparedCache.set(cacheKey, prepared);
  return prepared;
};

const createSectionLines = (text, font, maxWidth) => {
  const normalizedText = String(text ?? "").trimEnd();

  if (!normalizedText.trim()) {
    return ["——"];
  }

  const prepared = getPreparedText(normalizedText, font);
  const lines = [];
  let cursor = LINE_START_CURSOR;

  // 文本内容和字体不变时复用 prepare 结果，分页阶段只做轻量算术。
  while (true) {
    const nextLine = layoutNextLine(prepared, cursor, maxWidth);

    if (!nextLine) {
      break;
    }

    lines.push(nextLine.text || " ");
    cursor = nextLine.end;
  }

  return lines.length ? lines : ["——"];
};

const createPage = (pageNumber) => ({
  number: pageNumber,
  sections: [],
  signoff: null,
});

const getPageBodyHeight = () =>
  DOCUMENT_PAGE_SIZE.heightPx -
  DOCUMENT_PAGE_SIZE.paddingTopPx -
  DOCUMENT_PAGE_SIZE.paddingBottomPx -
  DOCUMENT_PAGE_SIZE.headerHeightPx -
  DOCUMENT_PAGE_SIZE.footerHeightPx;

const getContentWidth = () =>
  DOCUMENT_PAGE_SIZE.widthPx -
  DOCUMENT_PAGE_SIZE.paddingLeftPx -
  DOCUMENT_PAGE_SIZE.paddingRightPx;

const ensureNextPage = (pages, remainingHeightRef) => {
  const page = createPage(pages.length + 1);
  pages.push(page);
  remainingHeightRef.value = getPageBodyHeight();
  return page;
};

export const formatDateTime = (value) => {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    return "--";
  }

  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return normalizedValue;
  }

  return parsedDate.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

export const paginateNarrativeDocumentRecord = async ({
  template,
  record,
  printSettings,
}) => {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // 字体准备失败时回退到默认字体，保证分页流程不中断。
    }
  }

  const settings = {
    ...DEFAULT_DOCUMENT_PRINT_SETTINGS,
    ...(printSettings || {}),
  };
  const contentWidth = getContentWidth();
  const bodyFont = getBodyFont(settings);
  const remainingHeightRef = { value: getPageBodyHeight() };
  const pages = [createPage(1)];
  let currentPage = pages[0];

  for (const section of template.sectionFields) {
    const lines = createSectionLines(record?.[section.key], bodyFont, contentWidth);
    let lineIndex = 0;
    let isContinued = false;

    while (lineIndex < lines.length) {
      const minimumSectionHeight =
        DOCUMENT_PAGE_SIZE.sectionTitleHeightPx + settings.lineHeight;

      if (remainingHeightRef.value < minimumSectionHeight) {
        currentPage = ensureNextPage(pages, remainingHeightRef);
      }

      const usableLineSlots = Math.max(
        1,
        Math.floor(
          (remainingHeightRef.value - DOCUMENT_PAGE_SIZE.sectionTitleHeightPx) /
            settings.lineHeight,
        ),
      );
      const chunkLines = lines.slice(lineIndex, lineIndex + usableLineSlots);

      currentPage.sections.push({
        key: section.key,
        title: isContinued ? `${section.label}（续）` : section.label,
        lines: chunkLines,
      });

      lineIndex += chunkLines.length;
      remainingHeightRef.value -=
        DOCUMENT_PAGE_SIZE.sectionTitleHeightPx +
        chunkLines.length * settings.lineHeight +
        DOCUMENT_PAGE_SIZE.sectionGapPx;
      isContinued = true;

      if (lineIndex < lines.length) {
        currentPage = ensureNextPage(pages, remainingHeightRef);
      }
    }
  }

  if (remainingHeightRef.value < DOCUMENT_PAGE_SIZE.signatureHeightPx) {
    currentPage = ensureNextPage(pages, remainingHeightRef);
  }

  currentPage.signoff = {
    authorLabel: template.signoff.authorLabel,
    authorName: String(record?.authorName || "").trim() || "--",
    reviewerLabel: template.signoff.reviewerLabel,
    reviewerName: String(record?.reviewerName || "").trim() || "--",
    signedDate: formatDateTime(record?.signedDate),
  };

  return {
    kind: "narrative",
    pages,
    headerEntries: buildDocumentHeaderEntries(template, record),
    printedAt: formatDateTime(new Date().toISOString()),
    settings,
  };
};

export const measurePreparedTextLines = ({
  text,
  font,
  maxWidth,
}) => createSectionLines(text, font, maxWidth);
