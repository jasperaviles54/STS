// Simple Bootstrap-toast wrapper. Append a div with id="toastStack" to use.
export function toast(message, variant = "primary") {
  let stack = document.getElementById("toastStack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toastStack";
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }
  const el = document.createElement("div");
  el.className = `toast align-items-center text-bg-${variant} border-0 show`;
  el.setAttribute("role", "alert");
  el.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 4000);
  el.querySelector(".btn-close").addEventListener("click", () => el.remove());
}
