const cfg = window.APP_CONFIG || {};
if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes("YOUR_") ||
    !cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.includes("YOUR_")) {
  alert("Please open config.js and add your Supabase URL and anon/publishable key.");
}

const db = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
let products = [];
const $ = id => document.getElementById(id);

function esc(value){
  return String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

async function loadProducts(){
  const { data, error } = await db
    .from("products")
    .select("*")
    .order("product")
    .order("color");

  if(error){ alert(error.message); return; }
  products = data || [];
  renderProducts();
}

function renderProducts(){
  const q = $("searchInput").value.trim().toLowerCase();
  const visible = products.filter(p => `${p.product} ${p.color}`.toLowerCase().includes(q));

  $("stockBody").innerHTML = visible.map(p => `
    <tr>
      <td>
        <div class="inline-edit" id="product-wrap-${p.id}">
          <span class="editable-text" title="Click to edit"
                onclick="startInlineEdit('${p.id}','product')">${esc(p.product)}</span>
        </div>
      </td>
      <td>
        <div class="inline-edit" id="color-wrap-${p.id}">
          <span class="editable-text" title="Click to edit"
                onclick="startInlineEdit('${p.id}','color')">${esc(p.color)}</span>
        </div>
      </td>
      <td class="qty">${p.quantity}</td>
      <td><button class="mini in" onclick="openMovement('${p.id}','IN')">+ IN</button></td>
      <td><button class="mini out" onclick="openMovement('${p.id}','OUT')">− OUT</button></td>
    </tr>
  `).join("");

  $("emptyStock").classList.toggle("hidden", visible.length > 0);
  $("productCount").textContent = products.length;
  $("totalQuantity").textContent = products.reduce((sum,p)=>sum+Number(p.quantity||0),0);
}

$("searchInput").addEventListener("input", renderProducts);

$("productForm").addEventListener("submit", async e => {
  e.preventDefault();

  const product = $("productInput").value.trim();
  const color = $("colorInput").value.trim();
  const quantity = Number($("quantityInput").value);

  if (quantity < 0) {
    alert("Quantity cannot be negative.");
    return;
  }

  // Check if Product + Color already exists (case-insensitive)
  const existing = products.find(p =>
    p.product.trim().toLowerCase() === product.toLowerCase() &&
    p.color.trim().toLowerCase() === color.toLowerCase()
  );

  if (existing) {
    // Duplicate found: treat input quantity as STOCK IN
    if (quantity === 0) {
      alert("This product + color already exists. Enter a quantity greater than 0 to add stock.");
      return;
    }

    const { error } = await db.rpc("change_stock", {
      p_product_id: existing.id,
      p_movement: "IN",
      p_quantity: quantity,
      p_note: "Added from product input"
    });

    if (error) {
      alert(error.message);
      return;
    }
  } else {
    // New Product + Color
    const { data, error } = await db.from("products")
      .insert({ product, color, quantity })
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    if (quantity > 0) {
      await db.from("stock_history").insert({
        product_id: data.id,
        product,
        color,
        movement: "IN",
        quantity,
        note: "Opening stock"
      });
    }
  }

  e.target.reset();
  $("quantityInput").value = 0;
  await loadProducts();
});

window.openMovement = function(id,type){
  const p = products.find(x => x.id === id);
  if(!p) return;

  $("movementProductId").value = id;
  $("movementType").value = type;
  $("movementTitle").textContent = type === "IN" ? "Stock IN" : "Stock OUT";
  $("movementProduct").textContent = `${p.product} • ${p.color} • Current: ${p.quantity}`;
  $("movementQty").value = 1;
  $("movementNote").value = "";
  $("movementDialog").showModal();
};

$("movementForm").addEventListener("submit", async e => {
  e.preventDefault();

  const { error } = await db.rpc("change_stock", {
    p_product_id: $("movementProductId").value,
    p_movement: $("movementType").value,
    p_quantity: Number($("movementQty").value),
    p_note: $("movementNote").value.trim() || null
  });

  if(error){ alert(error.message); return; }

  $("movementDialog").close();
  await loadProducts();
});

$("closeMovement").onclick = $("cancelMovement").onclick = () => $("movementDialog").close();

async function loadHistory(){
  const { data, error } = await db
    .from("stock_history")
    .select("*")
    .order("created_at", { ascending:false });

  if(error){ alert(error.message); return; }

  $("historyBody").innerHTML = (data || []).map(h => `
    <tr>
      <td>${new Date(h.created_at).toLocaleString()}</td>
      <td>${esc(h.product)}</td>
      <td>${esc(h.color)}</td>
      <td class="${h.movement === "IN" ? "move-in" : "move-out"}">${h.movement}</td>
      <td>${h.quantity}</td>
      <td>${esc(h.note || "")}</td>
    </tr>
  `).join("");

  $("emptyHistory").classList.toggle("hidden", (data || []).length > 0);
}

$("historyBtn").onclick = async () => {
  await loadHistory();
  $("historyDialog").showModal();
};

$("closeHistory").onclick = () => $("historyDialog").close();



window.startInlineEdit = function(id, field){
  const p = products.find(x => x.id === id);
  if(!p) return;

  const wrap = document.getElementById(`${field}-wrap-${id}`);
  if(!wrap) return;

  const currentValue = field === "product" ? p.product : p.color;

  wrap.innerHTML = `
    <input class="inline-edit-input" id="${field}-input-${id}" value="${esc(currentValue)}">
    <div class="inline-actions">
      <button type="button" class="inline-save"
              onclick="saveInlineEdit('${id}','${field}')">Save</button>
      <button type="button" class="inline-cancel"
              onclick="renderProducts()">Cancel</button>
    </div>
  `;

  const input = document.getElementById(`${field}-input-${id}`);
  input.focus();
  input.select();

  input.addEventListener("keydown", (e) => {
    if(e.key === "Enter") saveInlineEdit(id, field);
    if(e.key === "Escape") renderProducts();
  });
};

window.saveInlineEdit = async function(id, field){
  const input = document.getElementById(`${field}-input-${id}`);
  if(!input) return;

  const value = input.value.trim();
  if(!value){
    alert(`${field === "product" ? "Product" : "Color"} cannot be empty.`);
    return;
  }

  const current = products.find(x => x.id === id);
  if(!current) return;

  const updatedProduct = field === "product" ? value : current.product;
  const updatedColor = field === "color" ? value : current.color;

  const duplicate = products.some(p =>
    p.id !== id &&
    p.product.trim().toLowerCase() === updatedProduct.toLowerCase() &&
    p.color.trim().toLowerCase() === updatedColor.toLowerCase()
  );

  if(duplicate){
    alert("Another item already uses this Product + Color combination.");
    return;
  }

  const payload = field === "product" ? { product: value } : { color: value };

  const { error } = await db
    .from("products")
    .update(payload)
    .eq("id", id);

  if(error){
    alert(error.code === "23505"
      ? "Another item already uses this Product + Color combination."
      : error.message);
    return;
  }

  await loadProducts();
};

const resetButton = $("resetBtn");
if (resetButton) {
  resetButton.addEventListener("click", async () => {
    const code = prompt("Enter unlock code to delete ALL products and history:");
    if (code === null) return;

    if (code !== "0012") {
      alert("Incorrect unlock code.");
      return;
    }

    const confirmed = confirm(
      "WARNING: This will permanently delete ALL stock items and ALL history. Continue?"
    );
    if (!confirmed) return;

    resetButton.disabled = true;
    resetButton.textContent = "Resetting...";

    const { error } = await db.rpc("reset_inventory", {
      p_unlock_code: code
    });

    resetButton.disabled = false;
    resetButton.textContent = "Reset All Data";

    if (error) {
      alert("Reset failed: " + error.message);
      return;
    }

    alert("All stock data and history have been deleted.");
    await loadProducts();
  });
}

loadProducts();
