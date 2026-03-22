import { parse as parseCsv } from "./lib-vanillaes-csv.js";
import { parseJson, parseArray } from "./lib-parsers.js";

// Text input keys synced to chrome.storage (API key is stored in Chrome sync storage,
// which is encrypted at rest but does sync to Google's servers).
const STORAGE_KEYS = ["dataUrl", "dryRun", "plApiKey"];

const ELEMENT_KEYS = [
  // STORAGE_KEYS
  "dataUrl",
  "dryRun",
  "plApiKey",
  // ELEMENTS
  "devSection",
  "csvInput",
  "saveBtn",
  "syncBtn",
  "log",
  "logList",
  "clearLog",
  "advancedLink",
];

// ── DOM refs ──────────────────────────────────────────────────────────────────
const els = {};
for (const key of ELEMENT_KEYS) {
  els[key] = document.getElementById(key);
}

// ── Logging ───────────────────────────────────────────────────────────────────
function addLog(message, type = "info") {
  els.log.classList.remove("hidden");
  const li = document.createElement("li");
  li.textContent = message;
  li.className = type;
  els.logList.appendChild(li);
  els.logList.scrollTop = els.logList.scrollHeight;
}

function clearLog() {
  els.logList.innerHTML = "";
  els.log.classList.add("hidden");
}

// ── Settings persistence ──────────────────────────────────────────────────────
async function loadSettings() {
  const stored = await chrome.storage.sync.get(STORAGE_KEYS);
  for (const key of STORAGE_KEYS) {
    if (stored[key] !== undefined) {
      els[key].value = stored[key];
    }
  }
}

async function saveSettings() {
  const data = {};
  for (const key of STORAGE_KEYS) {
    data[key] = els[key].value.trim();
  }
  data.dryRun = els.dryRun.checked;
  await chrome.storage.sync.set(data);
  addLog("Settings saved.", "success");
}

// ── Data URL fetch ────────────────────────────────────────────────────────────
function parseText(text, contentType = "") {
  const looksLikeJson =
    contentType.includes("json") ||
    text.trimStart().startsWith("[") ||
    text.trimStart().startsWith("{");
  return looksLikeJson
    ? parseJson(JSON.parse(text))
    : parseArray(parseCsv(text));
}

async function fetchUrl(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching data URL`);
  const text = await resp.text();
  return parseText(text, resp.headers.get("content-type") || "");
}

// ── Find ProjectionLab tab ────────────────────────────────────────────────────
async function findProjectionLabTab() {
  const tabs = await chrome.tabs.query({
    url: "https://app.projectionlab.com/*",
  });
  if (tabs.length === 0) return null;
  // Prefer active tab, else first
  return tabs.find((t) => t.active) || tabs[0];
}

// ── ProjectionLab sync (runs in MAIN world of PL tab) ─────────────────────────
// NOTE: This function is serialized and injected into the ProjectionLab tab via
// chrome.scripting.executeScript. All helpers must be nested inside it — they
// cannot reference anything from the popup's module scope.
async function syncBalances(accounts, plApiKey, dryRun) {
  async function getProjectionLabData(plApiKey) {
    const api = window.projectionlabPluginAPI;
    if (!api) {
      throw new Error(
        "ProjectionLab Plugin API not found: enable it in Account Settings → Plugin API",
      );
    }

    try {
      return await api.exportData({ key: plApiKey });
    } catch (e) {
      throw new Error(`exportData failed: ${e.message || e}`);
    }
  }

  function buildAccountMaps(exportedData) {
    const today = exportedData?.today;
    if (!today) {
      throw new Error(
        'exportData response missing "today": check your API key and that Current Finances has accounts',
      );
    }

    const TYPE_MAP = {
      asset: today.assets || [],
      debt: today.debts || [],
      investment: today.investmentAccounts || [],
      savings: today.savingsAccounts || [],
    };

    const byTypeAndName = {};
    for (const [type, list] of Object.entries(TYPE_MAP)) {
      const nameMap = new Map();
      for (const acct of list) {
        const key = (acct.name || "").trim().toLowerCase();
        if (!key) continue;
        if (nameMap.has(key))
          throw new Error(
            `Duplicate account "${type} - ${acct.name}" in ProjectionLab`,
          );
        nameMap.set(key, acct);
      }
      byTypeAndName[type] = nameMap;
    }
    return byTypeAndName;
  }

  async function syncBalance(account, byTypeAndName, plApiKey, dryRun) {
    const { type, name, balance } = account;
    const normalizedType = type?.trim().toLowerCase();
    const nameMap = byTypeAndName[normalizedType];

    if (!nameMap) {
      return {
        name,
        status: "error",
        message: `Unknown type "${type}" (expected: asset, debt, investment, savings)`,
      };
    }

    const lookupKey = name.trim().toLowerCase();
    const plAccount = nameMap.get(lookupKey);

    if (!plAccount) {
      return {
        name,
        status: "warn",
        message: `no matching ${normalizedType} found in ProjectionLab`,
      };
    }

    if (!plAccount.id) {
      return {
        name,
        status: "error",
        message: `account found but has no ID field`,
      };
    }

    if (plAccount.balance === balance) {
      return { name, status: "info", message: `balance unchanged: ${balance}` };
    }

    if (dryRun) {
      return {
        name,
        status: "success",
        message: `would update from: ${plAccount.balance} to: ${balance} [dry-run]`,
      };
    }

    try {
      await window.projectionlabPluginAPI.updateAccount(
        plAccount.id,
        { balance },
        { key: plApiKey },
      );
      return { name, status: "success", message: `updated to ${balance}` };
    } catch (e) {
      return {
        name,
        status: "error",
        message: `updateAccount failed: ${e.message || e}`,
      };
    }
  }

  const exportedData = await getProjectionLabData(plApiKey);
  const byTypeAndName = buildAccountMaps(exportedData);

  return Promise.all(
    accounts.map((account) =>
      syncBalance(account, byTypeAndName, plApiKey, dryRun),
    ),
  );
}

// ── Main sync handler ─────────────────────────────────────────────────────────
async function getAccounts(dataUrl, devText) {
  if (devText) {
    addLog("Using inline data override", "warn");
    return parseText(devText);
  }
  if (!dataUrl) throw new Error("Data URL is required");
  addLog("Fetching balance data…", "info");
  return await fetchUrl(dataUrl);
}

function validateAccounts(accounts) {
  const seenSheet = new Set();
  for (const { type, name } of accounts) {
    const key = `${type?.trim().toLowerCase()}:${name.trim().toLowerCase()}`;
    if (seenSheet.has(key))
      throw new Error(`Duplicate account "${type} - ${name}" in source data`);
    seenSheet.add(key);
  }
}

async function performSync(accounts, plApiKey, dryRun) {
  const tab = await findProjectionLabTab();
  if (!tab) {
    throw new Error(
      "No ProjectionLab tab found: open app.projectionlab.com first",
    );
  }
  addLog(`Syncing to ProjectionLab tab: "${tab.title || tab.url}"`, "info");

  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    func: syncBalances,
    args: [accounts, plApiKey, dryRun],
  });

  if (result.error) {
    throw new Error(
      `Error fetching state: ${result.error.message || String(result.error)}`,
    );
  }

  return result.result;
}

function displaySyncResults(syncResults) {
  const counts = { success: 0, info: 0, warn: 0, error: 0 };
  for (const r of syncResults) {
    addLog(`${r.name}: ${r.message}`, r.status);
    counts[r.status] = (counts[r.status] ?? 0) + 1;
  }

  const {
    success: successCount,
    info: infoCount,
    warn: warnCount,
    error: errCount,
  } = counts;

  const summary = [];
  if (successCount) summary.push(`${successCount} synced`);
  if (infoCount) summary.push(`${infoCount} unchanged`);
  if (warnCount) summary.push(`${warnCount} not matched`);
  if (errCount) summary.push(`${errCount} failed`);
  addLog(`Done: ${summary.join(", ")}`, errCount === 0 ? "success" : "warn");
}

async function runSync() {
  clearLog();
  els.syncBtn.disabled = true;
  els.syncBtn.textContent = "Syncing…";

  try {
    const dataUrl = els.dataUrl.value.trim();
    const plApiKey = els.plApiKey.value.trim();
    const dryRun = els.dryRun.checked;
    const devText = !els.devSection.classList.contains("hidden")
      ? els.csvInput.value.trim()
      : "";

    if (!plApiKey) throw new Error("ProjectionLab API Key is required");
    if (dryRun) addLog("Dry-run mode: no changes will be written", "warn");

    const accounts = await getAccounts(dataUrl, devText);
    validateAccounts(accounts);
    addLog(
      `Found data for ${accounts.length} account${accounts.length === 1 ? "" : "s"}`,
      "info",
    );

    const syncResults = await performSync(accounts, plApiKey, dryRun);
    displaySyncResults(syncResults);
  } catch (err) {
    addLog(`Error: ${err.message}`, "error");
  } finally {
    els.syncBtn.disabled = false;
    els.syncBtn.textContent = "Sync Now";
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  const updateAdvancedLink = () => {
    els.advancedLink.textContent = els.devSection.classList.contains("hidden")
      ? "Advanced Options"
      : "Hide Advanced Options";
  };
  updateAdvancedLink();
  els.advancedLink.addEventListener("click", (e) => {
    e.preventDefault();
    els.devSection.classList.toggle("hidden");
    updateAdvancedLink();
  });

  await loadSettings();
  els.saveBtn.addEventListener("click", saveSettings);
  els.syncBtn.addEventListener("click", runSync);
  els.clearLog.addEventListener("click", clearLog);
});
