import { requireAuth } from "./auth.js";
import { renderNav } from "./nav.js";
import { localDateISO, monthRange, sumTotals } from "./calc.js";
import {
  fetchSales, renderBucketCards, renderTotalsStrip,
  renderPie, renderTopList, renderSliceDetail,
  aggregateBy, filterRowsBy,
} from "./report.js";
import { toast } from "./toast.js";

await requireAuth();
await renderNav("monthly");

const picker = document.getElementById("monthPicker");
const bucketContainer = document.getElementById("bucketContainer");
const totalsStrip = document.getElementById("totalsStrip");
const pieCanvas = document.getElementById("pie");
const topListEl = document.getElementById("topList");
const groupByEl = document.getElementById("groupBy");
const slicePanelEl = document.getElementById("slicePanel");

const now = new Date();
picker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
picker.addEventListener("change", load);
groupByEl.addEventListener("change", refreshAnalytics);

const HEADERS = { products: "Product", categories: "Category", types: "Type" };

let currentRows = [];

async function load() {
  const [yStr, mStr] = picker.value.split("-");
  const year = Number(yStr), month = Number(mStr);
  const { start, end } = monthRange(year, month);

  try { currentRows = await fetchSales(start, end); }
  catch (e) { toast(e.message, "danger"); return; }

  // Bucket by ISO week-of-month: weeks start on Monday.
  const startDate = new Date(year, month - 1, 1);
  const endDate   = new Date(year, month, 0);
  const buckets = [];
  let cursor = new Date(startDate);
  let weekIdx = 1;
  while (cursor <= endDate) {
    const weekStart = new Date(cursor);
    const dayOfWeek = (weekStart.getDay() + 6) % 7; // 0 = Mon
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + (6 - dayOfWeek));
    if (weekEnd > endDate) weekEnd.setTime(endDate.getTime());

    const wsIso = localDateISO(weekStart);
    const weIso = localDateISO(weekEnd);
    const bucketRows = currentRows.filter(r => r.sold_at >= wsIso && r.sold_at <= weIso);
    const fmt = d => d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    buckets.push({
      label: `Week ${weekIdx} · ${fmt(weekStart)} – ${fmt(weekEnd)}`,
      rows: bucketRows,
    });

    cursor = new Date(weekEnd);
    cursor.setDate(cursor.getDate() + 1);
    weekIdx++;
  }

  renderBucketCards(bucketContainer, buckets);
  renderTotalsStrip(totalsStrip, sumTotals(currentRows));
  refreshAnalytics();
}

function refreshAnalytics() {
  slicePanelEl.innerHTML = "";
  const mode = groupByEl.value;
  const limit = mode === "products" ? 5 : null;
  const items = aggregateBy(currentRows, mode, limit);
  renderPie(pieCanvas, items, (label) => {
    const matched = filterRowsBy(currentRows, mode, label);
    renderSliceDetail(slicePanelEl, label, matched);
  });
  renderTopList(topListEl, items, HEADERS[mode]);
}

await load();
