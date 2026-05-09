// Per-row calculations (formulas chosen by the user).
export const totalSelling = (qty, sell) => qty * sell;
export const gpPercent    = (buy, sell) => (sell === 0 ? 0 : (buy / sell) * 100);
export const gpPeso       = (buy, sell) => sell - buy;

// Aggregate helpers used by weekly/monthly/yearly pages.
// Each `row` is expected to look like { quantity, products: { purchasing_price, selling_price, name } }.
export function sumTotals(rows) {
  let qty = 0, revenue = 0, profit = 0;
  for (const r of rows) {
    const q = r.quantity;
    const buy = Number(r.products.purchasing_price);
    const sell = Number(r.products.selling_price);
    qty += q;
    revenue += q * sell;
    profit += (sell - buy) * q;
  }
  return { qty, revenue, profit };
}

export function topProductsByQty(rows, limit = 5) {
  const map = new Map();
  for (const r of rows) {
    const name = r.products.name;
    map.set(name, (map.get(name) || 0) + r.quantity);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, qty]) => ({ name, qty }));
}

export const peso = (n) => "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const pct  = (n) => Number(n).toFixed(0) + "%";

// Local-date YYYY-MM-DD (avoids UTC drift from toISOString).
export function localDateISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ISO week range (Mon–Sun) covering the given date.
export function weekRange(d = new Date()) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // 0 = Mon
  const monday = new Date(date);
  monday.setDate(date.getDate() - day);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: localDateISO(monday), end: localDateISO(sunday), monday, sunday };
}

export function monthRange(year, month /* 1-12 */) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start: localDateISO(start), end: localDateISO(end) };
}

export function yearRange(year) {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}
