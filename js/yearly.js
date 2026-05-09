import { requireAuth } from "./auth.js";
import { renderNav } from "./nav.js";
import { yearRange, sumTotals } from "./calc.js";
import { fetchSales, renderBucketCards, renderTotalsStrip, renderPie, renderTopList } from "./report.js";
import { toast } from "./toast.js";

await requireAuth();
await renderNav("yearly");

const picker = document.getElementById("yearPicker");
const bucketContainer = document.getElementById("bucketContainer");
const totalsStrip = document.getElementById("totalsStrip");
const pieCanvas = document.getElementById("pie");
const topList = document.getElementById("topList");

picker.value = new Date().getFullYear();
picker.addEventListener("change", load);

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

async function load() {
  const year = Number(picker.value);
  if (!year) return;
  const { start, end } = yearRange(year);

  let rows;
  try { rows = await fetchSales(start, end); }
  catch (e) { toast(e.message, "danger"); return; }

  const buckets = MONTH_NAMES.map((label, i) => {
    const monthStart = `${year}-${String(i + 1).padStart(2, "0")}-01`;
    const last = new Date(year, i + 1, 0).getDate();
    const monthEnd = `${year}-${String(i + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
    return { label, rows: rows.filter(r => r.sold_at >= monthStart && r.sold_at <= monthEnd) };
  });

  renderBucketCards(bucketContainer, buckets);
  renderTotalsStrip(totalsStrip, sumTotals(rows));
  const top = renderPie(pieCanvas, rows);
  renderTopList(topList, top);
}

await load();
