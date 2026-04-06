import {
  DEFAULT_DOCUMENT_PRINT_SETTINGS,
  formatDateTime,
  measurePreparedTextLines,
} from "./documentPretextLayout";
import {
  buildDocumentHeaderEntries,
  formatRecordValue,
} from "../schemas/documentTemplates";

export const ANESTHESIA_PAGE_SIZE = Object.freeze({
  widthPx: 1123,
  heightPx: 794,
  paddingTopPx: 28,
  paddingRightPx: 34,
  paddingBottomPx: 24,
  paddingLeftPx: 34,
});

const MAIN_PAGE_ROW_LIMITS = Object.freeze({
  medications: 7,
  fluids: 7,
});

const OVERFLOW_TABLE_ROW_LIMIT = 10;

const NOTE_PAGE_CONFIG = Object.freeze({
  sectionTitleHeight: 28,
  sectionGap: 14,
  footerHeight: 48,
  headerHeight: 106,
  contentPaddingTop: 16,
});

const parseClockMinutes = (value) => {
  const normalizedValue = String(value ?? "").trim();

  if (!/^\d{2}:\d{2}$/u.test(normalizedValue)) {
    return null;
  }

  const [hoursText, minutesText] = normalizedValue.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
};

const formatClockLabel = (minutesValue) => {
  const normalizedValue = ((minutesValue % 1440) + 1440) % 1440;
  const hours = Math.floor(normalizedValue / 60);
  const minutes = normalizedValue % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const resolveTimelineSlots = (record) => {
  const candidateTimes = [
    record.entryRoomTime,
    record.anesthesiaStartTime,
    record.surgeryStartTime,
    record.surgeryEndTime,
    record.anesthesiaEndTime,
    record.exitRoomTime,
    ...(record.trendPoints || []).map((point) => point.time),
    ...(record.eventMarkers || []).map((marker) => marker.time),
  ]
    .map(parseClockMinutes)
    .filter((value) => Number.isFinite(value));

  if (!candidateTimes.length) {
    return Array.from({ length: 13 }, (_value, index) =>
      formatClockLabel(8 * 60 + index * 10),
    );
  }

  let start = Math.min(...candidateTimes);
  let end = Math.max(...candidateTimes);

  start = Math.floor(start / 5) * 5;
  end = Math.ceil(end / 5) * 5;

  if (end <= start) {
    end = start + 60;
  }

  const slotCount = Math.ceil((end - start) / 5) + 1;

  return Array.from({ length: slotCount }, (_value, index) =>
    formatClockLabel(start + index * 5),
  );
};

const buildTrendSeries = (record, timelineSlots) => {
  const seriesMap = new Map(
    (record.trendPoints || []).map((point) => [String(point.time || ""), point]),
  );

  return timelineSlots.map((slotLabel) => {
    const source = seriesMap.get(slotLabel) || {};

    return {
      time: slotLabel,
      pulse: Number(source.pulse) || null,
      systolic: Number(source.systolic) || null,
      diastolic: Number(source.diastolic) || null,
      spo2: Number(source.spo2) || null,
      etco2: Number(source.etco2) || null,
      respiration: Number(source.respiration) || null,
      temperature: Number(source.temperature) || null,
    };
  });
};

const buildEventMarkers = (record, timelineSlots) => {
  const slotIndexMap = new Map(
    timelineSlots.map((slotLabel, index) => [slotLabel, index]),
  );

  return (record.eventMarkers || [])
    .filter((marker) => slotIndexMap.has(String(marker.time || "")))
    .map((marker) => ({
      ...marker,
      slotIndex: slotIndexMap.get(String(marker.time || "")),
    }));
};

const getNotePageBodyHeight = () =>
  ANESTHESIA_PAGE_SIZE.heightPx -
  ANESTHESIA_PAGE_SIZE.paddingTopPx -
  ANESTHESIA_PAGE_SIZE.paddingBottomPx -
  NOTE_PAGE_CONFIG.headerHeight -
  NOTE_PAGE_CONFIG.footerHeight -
  NOTE_PAGE_CONFIG.contentPaddingTop;

const getNotePageTextWidth = () =>
  ANESTHESIA_PAGE_SIZE.widthPx -
  ANESTHESIA_PAGE_SIZE.paddingLeftPx -
  ANESTHESIA_PAGE_SIZE.paddingRightPx;

const createOverflowTable = (title, columns, rows) => ({
  title,
  columns,
  rows,
  blankRowCount: Math.max(0, OVERFLOW_TABLE_ROW_LIMIT - rows.length),
});

const paginateContinuationNotes = async ({
  template,
  record,
  printSettings,
}) => {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // 续页允许字体回退，不能阻塞打印。
    }
  }

  const settings = {
    ...DEFAULT_DOCUMENT_PRINT_SETTINGS,
    ...(printSettings || {}),
  };
  const textWidth = getNotePageTextWidth();
  const pageBodyHeight = getNotePageBodyHeight();
  const font = `400 ${settings.bodyFontSize}px "SimSun", "Songti SC", serif`;
  const pages = [];
  let currentPage = {
    sections: [],
  };
  let remainingHeight = pageBodyHeight;

  const flushPage = () => {
    if (!currentPage.sections.length) {
      return;
    }

    pages.push(currentPage);
    currentPage = {
      sections: [],
    };
    remainingHeight = pageBodyHeight;
  };

  for (const section of template.continuationTextFields || []) {
    const lines = measurePreparedTextLines({
      text: record?.[section.key],
      font,
      maxWidth: textWidth,
    });
    let index = 0;
    let isContinued = false;

    while (index < lines.length) {
      const minHeight = NOTE_PAGE_CONFIG.sectionTitleHeight + settings.lineHeight;

      if (remainingHeight < minHeight) {
        flushPage();
      }

      const lineCapacity = Math.max(
        1,
        Math.floor(
          (remainingHeight - NOTE_PAGE_CONFIG.sectionTitleHeight) /
            settings.lineHeight,
        ),
      );
      const chunkLines = lines.slice(index, index + lineCapacity);

      currentPage.sections.push({
        key: section.key,
        title: isContinued ? `${section.label}（续）` : section.label,
        lines: chunkLines,
      });

      remainingHeight -=
        NOTE_PAGE_CONFIG.sectionTitleHeight +
        settings.lineHeight * chunkLines.length +
        NOTE_PAGE_CONFIG.sectionGap;
      index += chunkLines.length;
      isContinued = true;

      if (index < lines.length) {
        flushPage();
      }
    }
  }

  flushPage();
  return pages;
};

export const paginateAnesthesiaRecord = async ({
  template,
  record,
  printSettings,
}) => {
  const settings = {
    ...DEFAULT_DOCUMENT_PRINT_SETTINGS,
    ...(printSettings || {}),
  };
  const timelineSlots = resolveTimelineSlots(record);
  const mainPage = {
    kind: "anesthesia-main",
    number: 1,
    timelineSlots,
    trendSeries: buildTrendSeries(record, timelineSlots),
    eventMarkers: buildEventMarkers(record, timelineSlots),
    medications: (record.medications || []).slice(
      0,
      MAIN_PAGE_ROW_LIMITS.medications,
    ),
    fluids: (record.fluids || []).slice(0, MAIN_PAGE_ROW_LIMITS.fluids),
    medicationOverflow: (record.medications || []).slice(
      MAIN_PAGE_ROW_LIMITS.medications,
    ),
    fluidOverflow: (record.fluids || []).slice(MAIN_PAGE_ROW_LIMITS.fluids),
  };

  const continuationPages = await paginateContinuationNotes({
    template,
    record,
    printSettings: settings,
  });
  const overflowTables = [];

  if (mainPage.medicationOverflow.length) {
    overflowTables.push(
      createOverflowTable(
        "术中用药（续）",
        ["时间", "药品", "剂量", "单位", "途径", "备注"],
        mainPage.medicationOverflow.map((row) => [
          formatRecordValue(row.time),
          formatRecordValue(row.name),
          formatRecordValue(row.dose),
          formatRecordValue(row.unit),
          formatRecordValue(row.route),
          formatRecordValue(row.remark),
        ]),
      ),
    );
  }

  if (mainPage.fluidOverflow.length) {
    overflowTables.push(
      createOverflowTable(
        "液体与出入量（续）",
        ["时间", "项目", "数量", "单位", "类别", "备注"],
        mainPage.fluidOverflow.map((row) => [
          formatRecordValue(row.time),
          formatRecordValue(row.name),
          formatRecordValue(row.volume),
          formatRecordValue(row.unit),
          formatRecordValue(row.kind),
          formatRecordValue(row.remark),
        ]),
      ),
    );
  }

  const pages = [
    mainPage,
    ...continuationPages.map((page, index) => ({
      kind: "anesthesia-note",
      number: index + 2,
      sections: page.sections,
      overflowTables: index === 0 ? overflowTables : [],
      signoff:
        index === continuationPages.length - 1 ||
        (!continuationPages.length && !overflowTables.length)
          ? {
              doctor: formatRecordValue(
                record.signoffDoctor || record.anesthesiologistName,
              ),
              reviewer: formatRecordValue(record.reviewerName),
              signedDate: formatDateTime(record.signedDate),
            }
          : null,
    })),
  ];

  if (pages.length === 1 && overflowTables.length) {
    pages.push({
      kind: "anesthesia-note",
      number: 2,
      sections: [],
      overflowTables,
      signoff: {
        doctor: formatRecordValue(
          record.signoffDoctor || record.anesthesiologistName,
        ),
        reviewer: formatRecordValue(record.reviewerName),
        signedDate: formatDateTime(record.signedDate),
      },
    });
  }

  return {
    kind: "anesthesiaSheet",
    pages,
    headerEntries: buildDocumentHeaderEntries(template, record),
    printedAt: formatDateTime(new Date().toISOString()),
    settings,
  };
};
