import { supabase } from "./supabase.js";
import { totalSelling, gpPercent, gpPeso, peso, pct, sumTotals, topProductsByQty } from "./calc.js";

export async function fetchSales(start, end) {
  const { data, error } = await supabase
    .from("sales")
    .select("id, quantity, sold_at, products ( id, name, purchasing_price, selling_price )")
    .gte("sold_at", start)
    .lte("sold_at", end)
    .order("sold_at");
  if (error) throw error;
  return data ?? [];
}

const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function rowsTableHtml(rows) {
  if (!rows.length) {
    return `<div class="card-body text-muted small">No sales recorded.</div>`;
  }
  const body = rows.map((r, i) => {
    const buy = Number(r.products.purchasing_price);
    const sell = Number(r.products.selling_price);
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(r.products.name)}</td>
        <td class="text-end">${r.quantity}</td>
        <td class="text-end">${peso(buy)}</td>
        <td class="text-end">${peso(sell)}</td>
        <td class="text-end">${peso(totalSelling(r.quantity, sell))}</td>
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
    return `
      <div class="card day-card mb-2 shadow-sm">
        <div class="card-header">
          <button class="btn btn-link text-decoration-none p-0 fw-semibold" type="button"
                  data-bs-toggle="collapse" data-bs-target="#${collapseId}">
            ${escapeHtml(b.label)}
          </button>
          <div class="small text-muted">
            ${t.qty} items · ${peso(t.revenue)} revenue · ${peso(t.profit)} profit
          </div>
        </div>
        <div id="${collapseId}" class="collapse">
          ${rowsTableHtml(b.rows)}
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

let chartInstance = null;
export function renderPie(canvas, rows) {
  const top = topProductsByQty(rows, 5);
  if (chartInstance) chartInstance.destroy();
  if (!top.length) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return [];
  }
  chartInstance = new Chart(canvas, {
    type: "pie",
    data: {
      labels: top.map(t => t.name),
      datasets: [{
        data: top.map(t => t.qty),
        backgroundColor: ["#0d6efd", "#198754", "#ffc107", "#dc3545", "#6f42c1"],
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } },
    },
  });
  return top;
}

export function renderTopList(el, top) {
  if (!top.length) {
    el.innerHTML = `<div class="text-muted small">No data.</div>`;
    return;
  }
  el.innerHTML = `
    <table class="table table-sm">
      <thead><tr><th>#</th><th>Product</th><th class="text-end">Qty</th></tr></thead>
      <tbody>
        ${top.map((t, i) => `<tr><td>${i+1}</td><td>${escapeHtml(t.name)}</td><td class="text-end">${t.qty}</td></tr>`).join("")}
      </tbody>
    </table>`;
}
