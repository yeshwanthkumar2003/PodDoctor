// PodDoctor dashboard
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const state = { namespace: "all", pods: [], issues: [] };

const sevLabel = { critical: "Critical", high: "High", medium: "Medium", low: "Low", info: "Info" };

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

function toast(msg, isError = false) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.toggle("error", isError);
  t.classList.remove("hidden");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add("hidden"), 3500);
}

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function renderKPI(o) {
  $("#kpi-pods").textContent = o.totals.pods;
  $("#kpi-healthy").textContent = o.totals.healthy;
  $("#kpi-issues").textContent = o.totals.issues;
  $("#kpi-nodes").textContent = o.totals.nodes;
  const score = o.totals.pods === 0 ? 100 : Math.round((o.totals.healthy / o.totals.pods) * 100);
  const el = $("#kpi-score");
  el.textContent = `${score}%`;
  el.style.color = score >= 90 ? "var(--green)" : score >= 70 ? "var(--orange)" : "var(--red)";

  // populate ns filter (only once)
  const sel = $("#ns-filter");
  if (sel.options.length <= 1) {
    o.namespaces.forEach((n) => {
      const opt = document.createElement("option");
      opt.value = n; opt.textContent = n;
      sel.appendChild(opt);
    });
  }
}

function renderNodes(nodes) {
  const html = nodes.map((n) => {
    const cpuWarn = n.cpu_pct >= 80 ? "bar-warn" : "";
    const memWarn = n.mem_pct >= 80 ? "bar-warn" : "";
    return `
      <div class="node">
        <div class="node-head">
          <div class="node-name">
            <span class="severity-dot sev-info"></span>${n.name}
            <span class="node-status">● ${n.status}</span>
          </div>
          <div class="node-pods">${n.pods} pods</div>
        </div>
        <div class="bar ${cpuWarn}"><div class="bar-fill bar-cpu" style="width:${n.cpu_pct}%"></div></div>
        <div class="bar-row"><span>CPU</span><span>${n.cpu_pct}%</span></div>
        <div class="bar ${memWarn}"><div class="bar-fill bar-mem" style="width:${n.mem_pct}%"></div></div>
        <div class="bar-row"><span>Memory</span><span>${n.mem_pct}%</span></div>
      </div>`;
  }).join("");
  $("#nodes").innerHTML = html || `<div class="empty">No nodes</div>`;
}

function renderIssues(issues) {
  state.issues = issues;
  if (!issues.length) {
    $("#issues-list").innerHTML = `<div class="empty">🎉 All systems healthy. No issues detected.</div>`;
    return;
  }
  $("#issues-list").innerHTML = issues.map((i) => `
    <div class="issue" data-ns="${i.namespace}" data-pod="${i.pod}">
      <span class="severity-dot sev-${i.severity}"></span>
      <div class="issue-main">
        <div class="issue-title">
          ${i.issue}
          <span class="severity-tag tag-${i.severity}">${sevLabel[i.severity] || i.severity}</span>
        </div>
        <div class="issue-pod">${i.namespace} / ${i.pod}</div>
      </div>
      <div class="confidence">${Math.round(i.confidence * 100)}% conf.</div>
    </div>
  `).join("");

  $$("#issues-list .issue").forEach((el) => {
    el.addEventListener("click", () => openDiagnosis(el.dataset.ns, el.dataset.pod));
  });
}

function renderPods(pods) {
  state.pods = pods;
  const tbody = $("#pods-table tbody");
  if (!pods.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">No pods</td></tr>`;
    return;
  }
  tbody.innerHTML = pods.map((p) => `
    <tr>
      <td><span class="status-chip status-${p.phase}">${p.phase}</span></td>
      <td class="pod-name">${p.name}</td>
      <td>${p.namespace}</td>
      <td>${p.node}</td>
      <td>${p.restarts}</td>
      <td>${p.age}</td>
      <td>
        <button class="btn" data-pod="${p.name}" data-ns="${p.namespace}">
          Diagnose
        </button>
      </td>
    </tr>
  `).join("");
  tbody.querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => openDiagnosis(b.dataset.ns, b.dataset.pod));
  });
}

function renderEvents(events) {
  $("#events").innerHTML = events.map((e) => `
    <div class="event ${e.type === 'Warning' ? 'warn' : 'normal'}">
      <div class="event-head">
        <span class="event-reason">${e.reason}</span>
        <span class="event-time">${timeAgo(e.timestamp)}</span>
      </div>
      <div class="event-msg">${e.message}</div>
      <div class="event-obj">${e.namespace}/${e.object}</div>
    </div>
  `).join("");
}

// ---------------------------------------------------------------------------
// Diagnosis modal
// ---------------------------------------------------------------------------
async function openDiagnosis(ns, pod) {
  const modal = $("#modal");
  modal.classList.remove("hidden");
  $("#modal-body").innerHTML = `<div class="empty">🔬 Running AI diagnosis on <b>${pod}</b>…</div>`;
  try {
    const d = await fetchJSON(`/api/pods/${ns}/${pod}/diagnose`);
    const logs = await fetchJSON(`/api/pods/${ns}/${pod}/logs`);
    renderDiagnosis(d, logs.logs);
  } catch (err) {
    $("#modal-body").innerHTML = `<div class="empty">Failed to diagnose: ${err.message}</div>`;
  }
}

function renderDiagnosis(d, logs) {
  const sevTag = `<span class="severity-tag tag-${d.severity}">${sevLabel[d.severity] || d.severity}</span>`;
  const evidence = d.evidence?.length ? `
    <div class="diag-section">
      <h3>Evidence</h3>
      <ul class="diag-list evidence">${d.evidence.map((e) => `<li>${e}</li>`).join("")}</ul>
    </div>` : "";
  const actions = d.suggested_actions?.length ? `
    <div class="diag-section">
      <h3>Suggested Actions</h3>
      <ul class="diag-list">${d.suggested_actions.map((a) => `<li>${a}</li>`).join("")}</ul>
    </div>` : "";
  const ai = d.ai_summary ? `
    <div class="diag-section">
      <h3><span class="ai-badge">AI</span> &nbsp;Summary</h3>
      <div class="diag-cause">${d.ai_summary}</div>
    </div>` : "";
  const healBtn = d.auto_heal ? `
    <button class="btn btn-primary" id="heal-btn">⚡ Auto-heal: ${d.auto_heal.replace("_", " ")}</button>` : "";

  $("#modal-body").innerHTML = `
    <div class="diag-header">
      <span class="severity-dot sev-${d.severity}" style="width:14px;height:14px"></span>
      <div class="diag-title">${d.issue}</div>
      ${sevTag}
    </div>
    <div class="diag-pod">${d.namespace} / ${d.pod} · confidence ${Math.round(d.confidence * 100)}%</div>

    <div class="diag-section">
      <h3>Root Cause</h3>
      <div class="diag-cause">${d.root_cause}</div>
    </div>
    ${ai}
    ${evidence}
    ${actions}
    <div class="diag-section">
      <h3>Recent Logs</h3>
      <div class="logs-box">${(logs || "(no logs)").replace(/</g, "&lt;")}</div>
    </div>
    <div class="actions-row">
      ${healBtn}
      <button class="btn" id="copy-btn">Copy diagnosis</button>
    </div>
  `;

  if (d.auto_heal) {
    $("#heal-btn").addEventListener("click", async () => {
      $("#heal-btn").textContent = "Healing…";
      $("#heal-btn").disabled = true;
      try {
        const res = await fetchJSON(`/api/pods/${d.namespace}/${d.pod}/heal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: d.auto_heal }),
        });
        toast(res.message || "Heal action submitted");
        setTimeout(refresh, 800);
        closeModal();
      } catch (e) {
        toast("Heal failed: " + e.message, true);
      }
    });
  }

  $("#copy-btn").addEventListener("click", () => {
    navigator.clipboard.writeText(JSON.stringify(d, null, 2));
    toast("Diagnosis copied to clipboard");
  });
}

function closeModal() { $("#modal").classList.add("hidden"); }
$$("#modal [data-close]").forEach((e) => e.addEventListener("click", closeModal));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

// ---------------------------------------------------------------------------
// Refresh loop
// ---------------------------------------------------------------------------
async function refresh() {
  try {
    const [overview, pods, issues, events] = await Promise.all([
      fetchJSON("/api/cluster/overview"),
      fetchJSON(`/api/pods?namespace=${state.namespace}`),
      fetchJSON("/api/issues"),
      fetchJSON("/api/events"),
    ]);
    renderKPI(overview);
    renderNodes(overview.nodes);
    renderIssues(issues.filter((i) => state.namespace === "all" || i.namespace === state.namespace));
    renderPods(pods);
    renderEvents(events);
    $("#last-update").textContent = "Updated " + new Date().toLocaleTimeString();
  } catch (err) {
    toast("Failed to refresh: " + err.message, true);
  }
}

$("#refresh-btn").addEventListener("click", refresh);
$("#ns-filter").addEventListener("change", (e) => { state.namespace = e.target.value; refresh(); });

refresh();
setInterval(refresh, 15000);
