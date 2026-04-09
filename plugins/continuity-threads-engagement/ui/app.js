/**
 * Threads Engagement Dashboard — Client-Side Logic
 * Vanilla JS SPA for the plugin iframe UI.
 */

const API = window.location.origin;
let currentFilter = "drafted";
let currentPage = 1;
let activeDraftIndex = {};  // postId -> active draft tab index

// ── Init ──────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  // Check if plugin is configured
  try {
    const res = await fetch(`${API}/api/status`);
    const status = await res.json();
    if (!status.configured) {
      showSetupScreen(status.message);
      return;
    }
  } catch {
    showSetupScreen("Unable to connect to plugin. Try restarting.");
    return;
  }

  fetchStats();
  fetchPosts();
  setupFilterTabs();
  setInterval(fetchStats, 30000);
});

function showSetupScreen(message) {
  document.querySelector(".stats-bar").style.display = "none";
  document.querySelector(".toolbar").style.display = "none";
  document.querySelector(".filter-tabs").style.display = "none";
  document.getElementById("feed").innerHTML = `
    <div class="empty-state" style="padding: 64px 24px;">
      <div class="icon" style="font-size: 48px; margin-bottom: 16px;">🧵</div>
      <div class="title" style="font-size: 18px; margin-bottom: 8px;">Threads Engagement</div>
      <div class="subtitle" style="max-width: 320px; margin: 0 auto; line-height: 1.6;">
        ${escHtml(message)}
      </div>
      <div style="margin-top: 24px; padding: 16px; border-radius: 8px; background: var(--bg-card); border: 1px solid var(--border); text-align: left; max-width: 320px; margin-left: auto; margin-right: auto;">
        <div style="font-size: 12px; font-weight: 600; margin-bottom: 8px;">Setup checklist:</div>
        <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.8;">
          1. Get a Threads API token from Meta Developer Console<br>
          2. Go to <strong>Settings > Plugins > Configure</strong><br>
          3. Enter your token, user ID, keywords, and persona<br>
          4. Restart the plugin
        </div>
      </div>
    </div>`;
}

// ── Stats ─────────────────────────────────

async function fetchStats() {
  try {
    const res = await fetch(`${API}/api/stats`);
    const stats = await res.json();
    renderStats(stats);
  } catch (err) {
    console.error("Failed to fetch stats:", err);
  }
}

function renderStats(stats) {
  document.getElementById("stat-pending").textContent = stats.pendingReview;
  document.getElementById("stat-replied").textContent = stats.totalReplied;
  document.getElementById("stat-discovered").textContent = stats.totalDiscovered;
  document.getElementById("stat-rejected").textContent = stats.totalRejected;
  document.getElementById("stat-budget").textContent = `${stats.searchBudgetRemaining}/500`;

  const budgetPct = ((500 - stats.searchBudgetRemaining) / 500) * 100;
  const fill = document.getElementById("budget-fill");
  fill.style.width = `${budgetPct}%`;
  fill.className = "fill" + (budgetPct > 80 ? " danger" : budgetPct > 60 ? " warning" : "");

  const lastScan = stats.lastScanAt
    ? timeAgo(new Date(stats.lastScanAt + "Z"))
    : "Never";
  document.getElementById("last-scan").textContent = `Last scan: ${lastScan}`;
}

// ── Posts Feed ─────────────────────────────

async function fetchPosts() {
  const feed = document.getElementById("feed");
  feed.innerHTML = '<div class="loading">Loading posts...</div>';

  try {
    const res = await fetch(`${API}/api/posts?status=${currentFilter}&page=${currentPage}&limit=20`);
    const data = await res.json();
    renderPosts(data.posts);
  } catch (err) {
    feed.innerHTML = '<div class="empty-state"><div class="title">Failed to load posts</div></div>';
  }
}

function renderPosts(posts) {
  const feed = document.getElementById("feed");

  if (posts.length === 0) {
    feed.innerHTML = `
      <div class="empty-state">
        <div class="icon">📭</div>
        <div class="title">No posts here</div>
        <div class="subtitle">${currentFilter === "drafted" ? "Run a scan to discover posts" : "Nothing in this category yet"}</div>
      </div>`;
    return;
  }

  feed.innerHTML = posts.map(renderPostCard).join("");
}

function renderPostCard(post) {
  const drafts = post.drafts || [];
  const activeIdx = activeDraftIndex[post.id] || 0;
  const activeDraft = drafts[activeIdx];

  const scoreClass = post.relevance_score >= 8 ? "high" : post.relevance_score >= 6 ? "medium" : "low";
  const isActionable = ["pending", "drafted"].includes(post.status);

  return `
    <div class="post-card" data-post-id="${post.id}">
      <div class="post-header">
        <span class="username">@${escHtml(post.username)}</span>
        <span class="time">${timeAgo(new Date(post.posted_at))}</span>
        <span class="score-badge ${scoreClass}">${post.relevance_score.toFixed(1)}</span>
        ${!isActionable ? `<span class="status-badge ${post.status}">${post.status}</span>` : ""}
      </div>

      <div class="post-text">${escHtml(post.text)}</div>

      <span class="post-keyword">${escHtml(post.search_keyword)}</span>

      ${post.relevance_reason ? `<div class="post-reason">${escHtml(post.relevance_reason)}</div>` : ""}

      ${drafts.length > 0 ? `
        <div class="drafts-section">
          <div class="draft-tabs">
            ${drafts.map((d, i) => `
              <button class="draft-tab ${i === activeIdx ? "active" : ""}"
                      onclick="switchDraft('${post.id}', ${i})">
                Draft ${i + 1}
              </button>
            `).join("")}
          </div>
          <textarea class="draft-textarea"
                    id="draft-${post.id}"
                    onblur="saveDraft('${activeDraft?.id}', this.value)"
                    ${!isActionable ? "disabled" : ""}
          >${activeDraft ? escHtml(activeDraft.draft_text) : ""}</textarea>
        </div>
      ` : ""}

      ${isActionable ? `
        <div class="action-bar">
          <button class="action-btn approve" onclick="approvePost('${post.id}')">Approve & Post</button>
          <button class="action-btn" onclick="regenerateDrafts('${post.id}')">Regenerate</button>
          <button class="action-btn" onclick="skipPost('${post.id}')">Skip</button>
          <button class="action-btn reject" onclick="rejectPost('${post.id}')">Reject</button>
        </div>
      ` : ""}
    </div>`;
}

// ── Actions ───────────────────────────────

async function approvePost(postId) {
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = "Posting...";

  try {
    const res = await fetch(`${API}/api/posts/${postId}/approve`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      fetchPosts();
      fetchStats();
    } else {
      alert("Failed: " + (data.error || "Unknown error"));
    }
  } catch (err) {
    alert("Network error: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Approve & Post";
  }
}

async function rejectPost(postId) {
  await fetch(`${API}/api/posts/${postId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "rejected" }),
  });
  fetchPosts();
  fetchStats();
}

async function skipPost(postId) {
  await fetch(`${API}/api/posts/${postId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "skipped" }),
  });
  fetchPosts();
  fetchStats();
}

async function regenerateDrafts(postId) {
  const card = document.querySelector(`[data-post-id="${postId}"]`);
  const section = card?.querySelector(".drafts-section");
  if (section) section.innerHTML = '<div class="loading">Generating new drafts...</div>';

  try {
    const res = await fetch(`${API}/api/posts/${postId}/regenerate`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      activeDraftIndex[postId] = 0;
      fetchPosts();
    }
  } catch (err) {
    console.error("Regenerate failed:", err);
  }
}

async function saveDraft(draftId, text) {
  if (!draftId) return;
  await fetch(`${API}/api/drafts/${draftId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

function switchDraft(postId, index) {
  activeDraftIndex[postId] = index;
  fetchPosts(); // re-render
}

async function triggerScan() {
  const btn = document.getElementById("scan-btn");
  btn.disabled = true;
  btn.textContent = "Scanning...";

  try {
    const res = await fetch(`${API}/api/scan`, { method: "POST" });
    const data = await res.json();
    fetchPosts();
    fetchStats();
  } catch (err) {
    console.error("Scan failed:", err);
  } finally {
    btn.disabled = false;
    btn.textContent = "Scan Now";
  }
}

// ── Filter Tabs ───────────────────────────

function setupFilterTabs() {
  document.querySelectorAll(".filter-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      currentFilter = tab.dataset.status;
      currentPage = 1;
      document.querySelectorAll(".filter-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      fetchPosts();
    });
  });
}

// ── Helpers ───────────────────────────────

function escHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
