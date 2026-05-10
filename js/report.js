import { supabase } from "./supabase.js";
import { totalSelling, gpPercent, gpPeso, peso, pct, sumTotals } from "./calc.js";

const SALES_SELECT = `
  id, quantity, sold_at,
  products (
    id, name, purchasing_price, selling_price, bulk_pricing,
    product_types ( id, name, categories ( id, name ) )
  )
`;

export async function fetchSales(start, end) {
  const { data, error } = await supabase
    .from("sales")
    .select(SALES_SELECT)
    .gte("sold_at", start)
    .lte("sold_at", end)
    .order("sold_at");
  if (error) throw error;
  return data ?? [];
}

export async function fetchAllSales() {
  const { data, error } = await supabase.from("sales").select(SALES_SELECT).order("sold_at");
  if (error) throw error;
  return data ?? [];
}

const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

const PIE_COLORS = [
  "#0d6efd", "#198754", "#ffc107", "#dc3545", "#6f42c1",
  "#fd7e14", "#20c997", "#6610f2", "#d63384", "#0dcaf0",
];

// ---- Aggregations -----------------------------------------------------------

const KEYS = {
  products:   r => r.products?.name ?? "Unknown",
  categories: r => r.products?.product_types?.categories?.name ?? "Uncategorized",
  types:      r => r.products?.product_types?.name ?? "Untyped",
};

function aggregate(rows, keyFn) {
  const map = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    map.set(k, (map.get(k) || 0) + r.quantity);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, qty]) => ({ label, qty }));
}

export function aggregateBy(rows, mode, limit = null) {
  const keyFn = KEYS[mode];
  if (!keyFn) return [];
  const all = aggregate(rows, keyFn);
  return limit ? all.slice(0, limit) : all;
}

export function filterRowsBy(rows, mode, label) {
  const keyFn = KEYS[mode];
  if (!keyFn) return [];
  return rows.filter(r => keyFn(r) === label);
}

// ---- Row table (shared) -----------------------------------------------------

function rowsTableHtml(rows) {
  if (!rows.length) return `<div class="text-muted small">No sales recorded.</div>`;
  const body = rows.map((r, i) => {
    const buy = Number(r.products.purchasing_price);
    const sell = Number(r.products.selling_price);
    const bulk = !!r.products.bulk_pricing;
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(r.products.name)}${bulk ? ' <span class="badge bg-info text-dark">Bulk</span>' : ""}</td>
        <td>${escapeHtml(r.sold_at)}</td>
        <td class="text-end">${r.quantity}</td>
        <td class="text-end">${peso(buy)}</td>
        <td class="text-end">${peso(sell)}</td>
        <td class="text-end">${peso(totalSelling(r.quantity, sell, bulk))}</td>
        <td class="text-end">${pct(gpPercent(buy, sell))}</td>
        <td class="text-end">${peso(gpPeso(buy, sell))}</td>
      </tr>`;
  }).join("");
  return `
    <div class="table-responsive">
      <table class="table table-sm mb-0 align-middle">
        <thead class="table-light">
          <tr>
            <th>#</th><th>Product</th><th>Date</th>
            <th class="text-end">Qty</th>
            <th class="text-end">Buy ₱</th>
            <th class="text-end">Sell ₱</th>
            <th class="text-end">Total Sell ₱</th>
            <th class="text-end">GP %</th>
            <th class="text-end">GP ₱</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
}

// Same as rowsTableHtml but without the date column (used by daily/weekly buckets where the bucket label already shows the date).
function rowsTableHtmlNoDate(rows) {
  if (!rows.length) return `<div class="card-body text-muted small">No sales recorded.</div>`;
  const body = rows.map((r, i) => {
    const buy = Number(r.products.purchasing_price);
    const sell = Number(r.products.selling_price);
    const bulk = !!r.products.bulk_pricing;
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(r.products.name)}${bulk ? ' <span class="badge bg-info text-dark">Bulk</span>' : ""}</td>
        <td class="text-end">${r.quantity}</td>
        <td class="text-end">${peso(buy)}</td>
        <td class="text-end">${peso(sell)}</td>
        <td class="text-end">${peso(totalSelling(r.quantity, sell, bulk))}</td>
        <td class="text-end">${pct(gpPercent(buy, sell))}</td>
        <td class="text-end">${peso(gpPeso(buy, sell))}</td>
      </tr>`;
  }).join("");
  return `
    <div class="table-responsive">
      <table class="table table-sm mb-0 align-middle">
        <thead class="table-light">
          <tr>
            <th>#</th><th>Product</th>
            <th class="text-end">Qty</th>
            <th class="text-end">Buy ₱</th>
            <th class="text-end">Sell ₱</th>
            <th class="text-end">Total Sell ₱</th>
            <th class="text-end">GP %</th>
            <th class="text-end">GP ₱</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
}

export function renderBucketCards(containerEl, buckets) {
  containerEl.innerHTML = buckets.map((b, idx) => {
    const t = sumTotals(b.rows);
    const collapseId = `bucket${idx}`;
    const editLink = b.editHref
      ? `<a href="${b.editHref}" class="small text-decoration-none">Edit →</a>`
      : "";
    return `
      <div class="card day-card mb-2 shadow-sm">
        <div class="card-header">
          <div class="d-flex align-items-center gap-2">
            <button class="btn btn-link text-decoration-none p-0 fw-semibold" type="button"
                    data-bs-toggle="collapse" data-bs-target="#${collapseId}">
              ${escapeHtml(b.label)}
            </button>
            ${editLink}
          </div>
          <div class="small text-muted">
            ${t.qty} items · ${peso(t.revenue)} revenue · ${peso(t.profit)} profit
          </div>
        </div>
        <div id="${collapseId}" class="collapse">
          ${rowsTableHtmlNoDate(b.rows)}
        </div>
      </div>`;
  }).join("");
}

export function renderTotalsStrip(el, totals) {
  el.innerHTML = `
    <div><span class="label d-block">Items sold</span><strong>${totals.qty}</strong></div>
    <div><span class="label d-block">Revenue</span><strong>${peso(totals.revenue)}</strong></div>
    <div><span class="label d-block">Profit</span><strong>${peso(totals.profit)}</strong></div>`;
}

// ---- Pie chart with click handler ------------------------------------------

let chartInstance = null;
export function renderPie(canvas, items, onSliceClick = null) {
  if (chartInstance) chartInstance.destroy();
  if (!items.length) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    chartInstance = null;
    return;
  }
  chartInstance = new Chart(canvas, {
    type: "pie",
    data: {
      labels: items.map(i => i.label),
      datasets: [{
        data: items.map(i => i.qty),
        backgroundColor: items.map((_, idx) => PIE_COLORS[idx % PIE_COLORS.length]),
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } },
      onClick: (_, els) => {
        if (els.length && onSliceClick) {
          onSliceClick(items[els[0].index].label);
        }
      },
    },
  });
}

export function renderTopList(el, items, headerLabel = "Item") {
  if (!items.length) {
    el.innerHTML = `<div class="text-muted small">No data.</div>`;
    return;
  }
  el.innerHTML = `
    <table class="table table-sm">
      <thead><tr><th>#</th><th>${escapeHtml(headerLabel)}</th><th class="text-end">Qty</th></tr></thead>
      <tbody>
        ${items.map((t, i) => `<tr><td>${i+1}</td><td>${escapeHtml(t.label)}</td><td class="text-end">${t.qty}</td></tr>`).join("")}
      </tbody>
    </table>`;
}

export function renderSliceDetail(panelEl, label, rows) {
  if (!rows.length) {
    panelEl.innerHTML = `
      <div class="border-top mt-3 pt-3">
        <h6 class="mb-2">Sales for ${escapeHtml(label)}</h6>
        <div class="text-muted small">No sales recorded.</div>
      </div>`;
    return;
  }
  const totals = sumTotals(rows);
  panelEl.innerHTML = `
    <div class="border-top mt-3 pt-3">
      <h6 class="mb-2">Sales for ${escapeHtml(label)}</h6>
      ${rowsTableHtml(rows)}
      <div class="totals-strip d-flex justify-content-around flex-wrap gap-2 mt-2">
        <div><span class="label d-block">Items</span><strong>${totals.qty}</strong></div>
        <div><span class="label d-block">Revenue</span><strong>${peso(totals.revenue)}</strong></div>
        <div><span class="label d-block">Profit</span><strong>${peso(totals.profit)}</strong></div>
      </div>
    </div>`;
}
