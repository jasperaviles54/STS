import { requireAuth } from "./auth.js";
import { renderNav } from "./nav.js";
import { localDateISO, monthRange, sumTotals } from "./calc.js";
import { fetchSales, renderBucketCards, renderTotalsStrip, renderPie, renderTopList } from "./report.js";
import { toast } from "./toast.js";

await requireAuth();
renderNav("monthly");

const picker = document.getElementById("monthPicker");
const bucketContainer = document.getElementById("bucketContainer");
const totalsStrip = document.getElementById("totalsStrip");
const pieCanvas = document.getElementById("pie");
const topList = document.getElementById("topList");

const now = new Date();
picker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
picker.addEventListener("change", load);

async function load() {
  const [yStr, mStr] = picker.value.split("-");
  const year = Number(yStr), month = Number(mStr);
  const { start, end } = monthRange(year, month);

  let rows;
  try { rows = await fetchSales(start, end); }
  catch (e) { toast(e.message, "danger"); return; }

  // Bucket by ISO week-of-month: weeks start on Monday.
  const startDate = new Date(year, month - 1, 1);
  const endDate   = new Date(year, month, 0);
  const buckets = [];
  let cursor = new Date(startDate);
  // Move cursor back to the Monday of week 1 (but only show dates that are in this month).
  let weekIdx = 1;
  while (cursor <= endDate) {
    // End of current week = Sunday
    const weekStart = new Date(cursor);
    const dayOfWeek = (weekStart.getDay() + 6) % 7; // 0 = Mon
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + (6 - dayOfWeek));
    if (weekEnd > endDate) weekEnd.setTime(endDate.getTime());

    const wsIso = localDateISO(weekStart);
    const weIso = localDateISO(weekEnd);
    const bucketRows = rows.filter(r => r.sold_at >= wsIso && r.sold_at <= weIso);
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
  renderTotalsStrip(totalsStrip, sumTotals(rows));
  const top = renderPie(pieCanvas, rows);
  renderTopList(topList, top);
}

await load();
