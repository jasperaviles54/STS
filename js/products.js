import { requireAuth } from "./auth.js";
import { supabase } from "./supabase.js";
import { renderNav } from "./nav.js";
import { peso } from "./calc.js";
import { toast } from "./toast.js";
import { fetchAllSales, aggregateBy, renderPie, renderTopList } from "./report.js";

await requireAuth();
await renderNav("products");

const tbody = document.getElementById("productsBody");
const topPieEl = document.getElementById("topPie");
const topListEl = document.getElementById("topList");
const form = document.getElementById("productForm");
const modalEl = document.getElementById("productModal");
const modal = new bootstrap.Modal(modalEl);
const titleEl = document.getElementById("productModalTitle");
const idEl = document.getElementById("productId");
const nameEl = document.getElementById("productName");
const buyEl = document.getElementById("purchasingPrice");
const sellEl = document.getElementById("sellingPrice");
const categoryEl = document.getElementById("categoryInput");
const typeEl = document.getElementById("typeInput");
const categoryListEl = document.getElementById("categoryList");
const typeListEl = document.getElementById("typeList");

let categories = []; // [{ id, name }]
let types = [];      // [{ id, name, category_id }]

document.getElementById("addBtn").addEventListener("click", () => {
  titleEl.textContent = "Add product";
  form.reset();
  idEl.value = "";
  refreshTypeList();
});

categoryEl.addEventListener("input", refreshTypeList);

function refreshTypeList() {
  const catName = categoryEl.value.trim().toLowerCase();
  const cat = categories.find(c => c.name.toLowerCase() === catName);
  const filtered = cat ? types.filter(t => t.category_id === cat.id) : [];
  typeListEl.innerHTML = filtered.map(t => `<option value="${escapeAttr(t.name)}">`).join("");
}

async function findOrCreateCategory(name) {
  const hit = categories.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (hit) return hit.id;
  const { data, error } = await supabase
    .from("categories").insert({ name }).select("id, name").single();
  if (error) throw error;
  categories.push({ id: data.id, name: data.name });
  return data.id;
}

async function findOrCreateType(categoryId, name) {
  const hit = types.find(t => t.category_id === categoryId && t.name.toLowerCase() === name.toLowerCase());
  if (hit) return hit.id;
  const { data, error } = await supabase
    .from("product_types").insert({ category_id: categoryId, name }).select("id, name, category_id").single();
  if (error) throw error;
  types.push({ id: data.id, name: data.name, category_id: data.category_id });
  return data.id;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const categoryName = categoryEl.value.trim();
  const typeName = typeEl.value.trim();
  if (!categoryName || !typeName) {
    toast("Category and Type are required.", "danger");
    return;
  }
  let typeId;
  try {
    const categoryId = await findOrCreateCategory(categoryName);
    typeId = await findOrCreateType(categoryId, typeName);
  } catch (err) {
    toast(err.message, "danger");
    return;
  }

  const payload = {
    name: nameEl.value.trim(),
    purchasing_price: Number(buyEl.value),
    selling_price: Number(sellEl.value),
    type_id: typeId,
  };
  const id = idEl.value;
  const { error } = id
    ? await supabase.from("products").update(payload).eq("id", id)
    : await supabase.from("products").insert(payload);
  if (error) {
    toast(error.message, "danger");
    return;
  }
  modal.hide();
  await loadCategoriesAndTypes();
  await load();
  await loadTopSellers();
});

async function loadCategoriesAndTypes() {
  const [{ data: cats, error: catErr }, { data: tps, error: tpErr }] = await Promise.all([
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("product_types").select("id, name, category_id").order("name"),
  ]);
  if (catErr) { toast(catErr.message, "danger"); return; }
  if (tpErr)  { toast(tpErr.message,  "danger"); return; }
  categories = cats ?? [];
  types = tps ?? [];
  categoryListEl.innerHTML = categories.map(c => `<option value="${escapeAttr(c.name)}">`).join("");
  refreshTypeList();
}

async function load() {
  const { data, error } = await supabase
    .from("products")
    .select(`
      id, name, purchasing_price, selling_price, type_id,
      product_types ( id, name, category_id, categories ( id, name ) )
    `)
    .order("name");
  if (error) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-danger">${error.message}</td></tr>`;
    return;
  }
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No products yet. Add one to start tracking sales.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map((p, i) => {
    const categoryName = p.product_types?.categories?.name ?? "";
    const typeName = p.product_types?.name ?? "";
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${categoryName ? escapeHtml(categoryName) : '<span class="text-muted">—</span>'}</td>
        <td>${typeName ? escapeHtml(typeName) : '<span class="text-muted">—</span>'}</td>
        <td>${escapeHtml(p.name)}</td>
        <td class="text-end">${peso(p.purchasing_price)}</td>
        <td class="text-end">${peso(p.selling_price)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-secondary me-1" data-edit="${p.id}">Edit</button>
          <button class="btn btn-sm btn-outline-danger" data-del="${p.id}">Delete</button>
        </td>
      </tr>`;
  }).join("");

  tbody.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const p = data.find(x => x.id === btn.dataset.edit);
      titleEl.textContent = "Edit product";
      idEl.value = p.id;
      nameEl.value = p.name;
      buyEl.value = p.purchasing_price;
      sellEl.value = p.selling_price;
      categoryEl.value = p.product_types?.categories?.name ?? "";
      typeEl.value = p.product_types?.name ?? "";
      refreshTypeList();
      modal.show();
    });
  });
  tbody.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const p = data.find(x => x.id === btn.dataset.del);
      if (!confirm(`Delete "${p.name}"? This will fail if sales reference it.`)) return;
      const { error } = await supabase.from("products").delete().eq("id", p.id);
      if (error) {
        toast("Cannot delete: " + error.message, "danger");
        return;
      }
      toast("Product deleted.", "success");
      await load();
      await loadTopSellers();
    });
  });
}

async function loadTopSellers() {
  let rows;
  try {
    rows = await fetchAllSales();
  } catch (e) {
    toast(e.message, "danger");
    return;
  }
  const top = aggregateBy(rows, "products", 5);
  renderPie(topPieEl, top);
  renderTopList(topListEl, top, "Product");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function escapeAttr(s) {
  return String(s).replace(/"/g, "&quot;");
}

await loadCategoriesAndTypes();
await load();
await loadTopSellers();
