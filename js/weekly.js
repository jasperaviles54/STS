import { requireAuth } from "./auth.js";
import { renderNav } from "./nav.js";
import { localDateISO, weekRange, sumTotals } from "./calc.js";
import {
  fetchSales, renderBucketCards, renderTotalsStrip,
  renderPie, renderTopList, renderSliceDetail,
  aggregateBy, filterRowsBy,
} from "./report.js";
import { toast } from "./toast.js";

await requireAuth();
await renderNav("weekly");

const picker = document.getElementById("weekPicker");
const rangeLabel = document.getElementById("rangeLabel");
const bucketContainer = document.getElementById("bucketContainer");
const totalsStrip = document.getElementById("totalsStrip");
const pieCanvas = document.getElementById("pie");
const topListEl = document.getElementById("topList");
const groupByEl = document.getElementById("groupBy");
const slicePanelEl = document.getElementById("slicePanel");

picker.value = localDateISO();
picker.addEventListener("change", load);
groupByEl.addEventListener("change", refreshAnalytics);

const DAY_NAMES = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const HEADERS = { products: "Product", categories: "Category", types: "Type" };

let currentRows = [];

async function load() {
  const { start, end, monday } = weekRange(new Date(picker.value));
  const fmt = d => d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  rangeLabel.textContent = `${fmt(monday)} – ${fmt(sunday)}, ${sunday.getFullYear()}`;

  try {
    currentRows = await fetchSales(start, end);
  } catch (e) {
    toast(e.message, "danger");
    return;
  }

  const buckets = DAY_NAMES.map((label, i) => {
    const day = new Date(monday); day.setDate(monday.getDate() + i);
    const iso = localDateISO(day);
    return {
      label: `${label} · ${fmt(day)}`,
      editHref: `today.html?date=${iso}`,
      rows: currentRows.filter(r => r.sold_at === iso),
    };
  });

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
