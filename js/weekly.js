import { requireAuth } from "./auth.js";
import { renderNav } from "./nav.js";
import { localDateISO, weekRange, sumTotals } from "./calc.js";
import { fetchSales, renderBucketCards, renderTotalsStrip, renderPie, renderTopList } from "./report.js";
import { toast } from "./toast.js";

await requireAuth();
await renderNav("weekly");

const picker = document.getElementById("weekPicker");
const rangeLabel = document.getElementById("rangeLabel");
const bucketContainer = document.getElementById("bucketContainer");
const totalsStrip = document.getElementById("totalsStrip");
const pieCanvas = document.getElementById("pie");
const topList = document.getElementById("topList");

picker.value = localDateISO();
picker.addEventListener("change", load);

const DAY_NAMES = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

async function load() {
  const { start, end, monday } = weekRange(new Date(picker.value));
  const fmt = d => d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  rangeLabel.textContent = `${fmt(monday)} – ${fmt(sunday)}, ${sunday.getFullYear()}`;

  let rows;
  try {
    rows = await fetchSales(start, end);
  } catch (e) {
    toast(e.message, "danger");
    return;
  }

  const buckets = DAY_NAMES.map((label, i) => {
    const day = new Date(monday); day.setDate(monday.getDate() + i);
    const iso = localDateISO(day);
    return { label: `${label} · ${fmt(day)}`, rows: rows.filter(r => r.sold_at === iso) };
  });

  renderBucketCards(bucketContainer, buckets);
  renderTotalsStrip(totalsStrip, sumTotals(rows));
  const top = renderPie(pieCanvas, rows);
  renderTopList(topList, top);
}

await load();
