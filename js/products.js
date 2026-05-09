import { requireAuth } from "./auth.js";
import { supabase } from "./supabase.js";
import { renderNav } from "./nav.js";
import { peso } from "./calc.js";
import { toast } from "./toast.js";

await requireAuth();
renderNav("products");

const tbody = document.getElementById("productsBody");
const form = document.getElementById("productForm");
const modalEl = document.getElementById("productModal");
const modal = new bootstrap.Modal(modalEl);
const titleEl = document.getElementById("productModalTitle");
const idEl = document.getElementById("productId");
const nameEl = document.getElementById("productName");
const buyEl = document.getElementById("purchasingPrice");
const sellEl = document.getElementById("sellingPrice");

document.getElementById("addBtn").addEventListener("click", () => {
  titleEl.textContent = "Add product";
  form.reset();
  idEl.value = "";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    name: nameEl.value.trim(),
    purchasing_price: Number(buyEl.value),
    selling_price: Number(sellEl.value),
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
  await load();
});

async function load() {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, purchasing_price, selling_price")
    .order("name");
  if (error) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-danger">${error.message}</td></tr>`;
    return;
  }
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No products yet. Add one to start tracking sales.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(p.name)}</td>
      <td class="text-end">${peso(p.purchasing_price)}</td>
      <td class="text-end">${peso(p.selling_price)}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-secondary me-1" data-edit="${p.id}">Edit</button>
        <button class="btn btn-sm btn-outline-danger" data-del="${p.id}">Delete</button>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const p = data.find(x => x.id === btn.dataset.edit);
      titleEl.textContent = "Edit product";
      idEl.value = p.id;
      nameEl.value = p.name;
      buyEl.value = p.purchasing_price;
      sellEl.value = p.selling_price;
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
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

await load();
