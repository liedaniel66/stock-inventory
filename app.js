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
      <td>${esc(p.product)}</td>
      <td>${esc(p.color)}</td>
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

loadProducts();
