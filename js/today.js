import { requireAuth } from "./auth.js";
import { supabase } from "./supabase.js";
import { renderNav } from "./nav.js";
import { totalSelling, gpPercent, gpPeso, peso, pct, localDateISO, sumTotals } from "./calc.js";
import { toast } from "./toast.js";

await requireAuth();
await renderNav("today");

const today = localDateISO();
document.getElementById("todayDate").textContent = new Date().toLocaleDateString("en-PH", {
  weekday: "long", year: "numeric", month: "long", day: "numeric"
});

const tbody = document.getElementById("salesBody");
const tfoot = document.getElementById("salesFoot");
const totalsStrip = document.getElementById("totalsStrip");
const productSearch = document.getElementById("productSearch");
const productListEl = document.getElementById("productList");
const form = document.getElementById("saleForm");
const titleEl = document.getElementById("saleModalTitle");
const idEl = document.getElementById("saleId");
const qtyEl = document.getElementById("quantity");
const modal = new bootstrap.Modal(document.getElementById("saleModal"));

let products = []; // [{ id, name }]

document.getElementById("addBtn").addEventListener("click", () => {
  titleEl.textContent = "Add sale";
  form.reset();
  idEl.value = "";
});

async function loadProducts() {
  const { data, error } = await supabase.from("products").select("id, name").order("name");
  if (error) { toast(error.message, "danger"); return; }
  products = data ?? [];
  productListEl.innerHTML = products.map(p => `<option value="${escapeAttr(p.name)}">`).join("");
}

function findProductByName(name) {
  const trimmed = name.trim().toLowerCase();
  return products.find(p => p.name.toLowerCase() === trimmed);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const product = findProductByName(productSearch.value);
  if (!product) {
    toast("Product not found. Pick from the list or add it on the Products page.", "danger");
    return;
  }
  const payload = {
    product_id: product.id,
    quantity: Number(qtyEl.value),
    sold_at: today,
  };
  const id = idEl.value;
  const { error } = id
    ? await supabase.from("sales").update({ product_id: payload.product_id, quantity: payload.quantity }).eq("id", id)
    : await supabase.from("sales").insert(payload);
  if (error) { toast(error.message, "danger"); return; }
  modal.hide();
  await loadSales();
});

async function loadSales() {
  const { data, error } = await supabase
    .from("sales")
    .select("id, quantity, sold_at, products ( id, name, purchasing_price, selling_price )")
    .eq("sold_at", today)
    .order("created_at");
  if (error) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-danger">${error.message}</td></tr>`;
    return;
  }
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">No sales yet today. Click "+ Add sale" to record one.</td></tr>`;
    tfoot.innerHTML = "";
    renderStrip({ qty: 0, revenue: 0, profit: 0 });
    return;
  }

  tbody.innerHTML = data.map((r, i) => {
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
        <td class="text-end">
          <button class="btn btn-sm btn-outline-secondary me-1" data-edit="${r.id}">Edit</button>
          <button class="btn btn-sm btn-outline-danger" data-del="${r.id}">Delete</button>
        </td>
      </tr>`;
  }).join("");

  const totals = sumTotals(data);
  tfoot.innerHTML = `
    <tr>
      <td colspan="2" class="text-end">Totals</td>
      <td class="text-end">${totals.qty}</td>
      <td colspan="2"></td>
      <td class="text-end">${peso(totals.revenue)}</td>
      <td></td>
      <td class="text-end">${peso(totals.profit)}</td>
      <td></td>
    </tr>`;
  renderStrip(totals);

  tbody.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const r = data.find(x => x.id === btn.dataset.edit);
      titleEl.textContent = "Edit sale";
      idEl.value = r.id;
      productSearch.value = r.products.name;
      qtyEl.value = r.quantity;
      modal.show();
    });
  });
  tbody.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this sale row?")) return;
      const { error } = await supabase.from("sales").delete().eq("id", btn.dataset.del);
      if (error) { toast(error.message, "danger"); return; }
      toast("Sale deleted.", "success");
      await loadSales();
    });
  });
}

function renderStrip(t) {
  totalsStrip.innerHTML = `
    <div><span class="label d-block">Items sold</span><strong>${t.qty}</strong></div>
    <div><span class="label d-block">Revenue</span><strong>${peso(t.revenue)}</strong></div>
    <div><span class="label d-block">Profit</span><strong>${peso(t.profit)}</strong></div>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function escapeAttr(s) {
  return String(s).replace(/"/g, "&quot;");
}

await loadProducts();
await loadSales();
