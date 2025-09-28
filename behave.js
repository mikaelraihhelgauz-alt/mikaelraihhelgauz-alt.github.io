// SUPABASE INTERACTIONS -----------------------------
const supabaseUrl = "https://mxqrhijblmnyeusciipa.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cXJoaWpibG1ueWV1c2NpaXBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDYwNDcsImV4cCI6MjA3NDU4MjA0N30.d7EiLecW7fOqkXrjUx8E0EMWxzyRwvSuc7rnhhiyPzI"; 
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Store logs here to drive charts
const logs = [];  // { date: '…', kcal: number, protein: number }

// Sign up
document.getElementById("signupBtn").onclick = async () => {
  const { error } = await supabase.auth.signUp({
    email: document.getElementById("email").value,
    password: document.getElementById("password").value,
  });
  if (error) alert(error.message);
};

// Log in
document.getElementById("loginBtn").onclick = async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: document.getElementById("email").value,
    password: document.getElementById("password").value,
  });
  if (error) alert(error.message);
};

// Function to load old entries on auth.
async function loadLoggedEntries() {
  const { data, error } = await supabase
    .from("entries") // or "logged_entries"
    .select("date,kcal,protein")
    .order("date", { ascending: true });

  if (error) { alert("Load failed: " + error.message); console.error(error); return; }

  // repaint table + charts
  logTableBody.innerHTML = "";
  logs.length = 0;
  for (const r of data) {
    const d = new Date(r.date + "T00:00:00");
    const dateStr = d.toLocaleDateString();
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${dateStr}</td><td>${r.kcal}</td><td>${r.protein}</td>`;
    logTableBody.appendChild(tr);
    logs.push({ date: dateStr, kcal: r.kcal, protein: r.protein });
  }
  renderCharts();
}

supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    // logged in
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("trackerPage").style.display = "block";
    await loadLoggedEntries();
  } else {
    // logged out
    document.getElementById("loginPage").style.display = "block";
    document.getElementById("trackerPage").style.display = "none";
    //logTableBody.innerHTML = "";   // optional: clear UI
    //logs.length = 0;
    //renderCharts();
  }
});

(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("trackerPage").style.display = "block";
    await loadLoggedEntries();     // initial load
  }
})();


document.getElementById("logoutBtn").addEventListener("click", async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert("Error signing out: " + error.message);
    } else {
      alert("Signed out!");
      // Optional: redirect or update UI
      window.location.href = "index.html"; 
    }
  });



// ------------------------
// Grabs you already have:
const table = document.getElementById("nutritionTable").querySelector("tbody");
const totalsCell = document.getElementById("totals");
const logBtn = document.getElementById("logDayBtn");
const logTableBody = document.querySelector("#logTable tbody");

// New: chart canvases
const proteinCanvas = document.getElementById("proteinChart");
const kcalCanvas = document.getElementById("kcalChart");



// ------------------------
// Totals helpers (unchanged from your latest version)
function computeTotals() {
  let kcalSum = 0;
  let proteinSum = 0;

  table.querySelectorAll("tr").forEach(row => {
    const inputs = row.querySelectorAll("input");
    if (inputs.length === 2) {
      const kcal = parseFloat(inputs[0].value) || 0;
      const protein = parseFloat(inputs[1].value) || 0;
      kcalSum += kcal;
      proteinSum += protein;
    }
  });

  return {
    kcal: Math.round(kcalSum),
    protein: Number(proteinSum.toFixed(1))
  };
}

function updateTotals() {
  const { kcal, protein } = computeTotals();
  totalsCell.textContent = `${kcal} kcal / ${protein} g`;
}

// ------------------------
// Row auto-add (unchanged)
function addRowIfNeeded(event) {
  const row = event.target.closest("tr");
  const inputs = row.querySelectorAll("input");
  const isLastRow = row === table.lastElementChild;
  const hasValue = Array.from(inputs).some(i => i.value.trim() !== "");

  if (isLastRow && hasValue) {
    const newRow = document.createElement("tr");
    newRow.innerHTML = `
      <td><input type="number" placeholder="0"></td>
      <td><input type="number" placeholder="0"></td>
    `;
    table.appendChild(newRow);
    newRow.querySelectorAll("input").forEach(input => {
      input.addEventListener("input", handleInput);
    });
  }
}

function handleInput(event) {
  addRowIfNeeded(event);
  updateTotals();
}

// Attach initial listeners + initial totals
table.querySelectorAll("input").forEach(input => {
  input.addEventListener("input", handleInput);
});
updateTotals();

// ------------------------
// Simple canvas bar-chart renderer (dark theme)
function renderBarChart(canvas, values, labels, { barColor = "#66ccff", axisColor = "#777", textColor = "#ccc" } = {}) {
  if (!canvas) return;

  // Ensure canvas internal size matches CSS size & device pixel ratio
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // scale drawing commands to CSS pixels

  const w = cssWidth;
  const h = cssHeight;
  ctx.clearRect(0, 0, w, h);

  // Padding for axes/labels
  const padLeft = 36;
  const padBottom = 28;
  const padTop = 8;
  const padRight = 8;

  // Axis
  ctx.strokeStyle = axisColor;
  ctx.lineWidth = 1;
  // x-axis
  ctx.beginPath();
  ctx.moveTo(padLeft, h - padBottom);
  ctx.lineTo(w - padRight, h - padBottom);
  ctx.stroke();
  // y-axis
  ctx.beginPath();
  ctx.moveTo(padLeft, h - padBottom);
  ctx.lineTo(padLeft, padTop);
  ctx.stroke();

  // Compute scales
  const maxVal = Math.max(1, ...values); // avoid zero max
  const plotW = w - padLeft - padRight;
  const plotH = h - padTop - padBottom;

  const n = values.length;
  const gap = 8;
  const barW = n > 0 ? Math.max(6, (plotW - gap * (n + 1)) / n) : 0;

  // Y tick (max and mid)
  ctx.fillStyle = textColor;
  ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  const ticks = [0, maxVal / 2, maxVal];
  ticks.forEach(t => {
    const y = padTop + plotH * (1 - t / maxVal);
    ctx.fillText(String(Math.round(t)), padLeft - 6, y);
    // optional faint grid
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(w - padRight, y);
    ctx.stroke();
  });

  // Bars
  ctx.fillStyle = barColor;
  for (let i = 0; i < n; i++) {
    const v = values[i];
    const x = padLeft + gap + i * (barW + gap);
    const barH = plotH * (v / maxVal);
    const y = padTop + (plotH - barH);
    ctx.fillRect(x, y, barW, barH);
  }

  // X labels (dates)
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let i = 0; i < n; i++) {
    const x = padLeft + gap + i * (barW + gap) + barW / 2;
    const y = h - padBottom + 6;
    const label = labels[i] ?? "";
    ctx.fillText(label, x, y);
  }
}

// Re-render both charts from the current logs[]
function renderCharts() {
  const labels = logs.map(l => l.date);
  const proteinVals = logs.map(l => l.protein);
  const kcalVals = logs.map(l => l.kcal);

  renderBarChart(proteinCanvas, proteinVals, labels);
  renderBarChart(kcalCanvas, kcalVals, labels);
}

// Handle resize to keep charts crisp
window.addEventListener("resize", renderCharts);

// ------------------------
// LOG THE DAY: append + clear + update charts
logBtn.addEventListener("click", async () => {
  const { kcal, protein } = computeTotals();
  if (kcal === 0 && protein === 0) return; // avoid empty logs

  const todayISO = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // 1) Get the logged-in user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    alert("Please log in first");
    return;
  }

  // 2) Insert into your logged_entries table
  const { error } = await supabase.from("entries").insert({
    user_id: user.id,
    date: todayISO,
    kcal,
    protein,
  });
  if (error) {
    alert("Save failed: " + error.message);
    return;
  }

  // 3) Append to table UI
  const tr = document.createElement("tr");
  tr.innerHTML = `<td>${new Date(todayISO).toLocaleDateString()}</td>
                  <td>${kcal}</td>
                  <td>${protein}</td>`;
  logTableBody.appendChild(tr);

  // 4) Update in-memory logs + charts
  logs.push({ date: new Date(todayISO).toLocaleDateString(), kcal, protein });
  renderCharts();

  // 5) Reset inputs
  table.innerHTML = `<tr>
      <td><input type="number" placeholder="0"></td>
      <td><input type="number" placeholder="0"></td>
    </tr>`;
  table.querySelectorAll("input").forEach(input =>
    input.addEventListener("input", handleInput)
  );
  updateTotals();

  alert("Saved to Supabase!");
});



// ---- Tab switching ----
const tabButtons = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");

tabButtons.forEach(button => {
  button.addEventListener("click", () => {
    const target = button.getAttribute("data-tab");

    // deactivate all
    tabButtons.forEach(btn => btn.classList.remove("active"));
    tabContents.forEach(content => content.classList.remove("active"));

    // activate clicked button + its tab
    button.classList.add("active");
    document.getElementById(target).classList.add("active");
  });
});
