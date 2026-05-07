// Popup logic for Thanos Tabs

const ALARM_NAME = 'thanos-snap';
const DEFAULT_INTERVAL = 5;

async function loadSettings() {
  const result = await chrome.storage.local.get(['intervalMinutes', 'minTabsKept']);
  document.getElementById('interval').value = result.intervalMinutes ?? DEFAULT_INTERVAL;
  document.getElementById('minKept').value = result.minTabsKept ?? 0;
  updateStatus();
}

async function updateStatus() {
  const tabs = await chrome.tabs.query({});
  const closeable = tabs.filter(t => !t.pinned);
  const statusEl = document.getElementById('status');

  const alarm = await chrome.alarms.get(ALARM_NAME);
  if (alarm) {
    const next = new Date(alarm.scheduledTime);
    const mins = Math.ceil((next - Date.now()) / 60000);
    statusEl.textContent = `${closeable.length} closeable tabs · next snap in ${mins}m`;
  } else {
    statusEl.textContent = `${closeable.length} closeable tabs`;
  }
}

document.getElementById('interval').addEventListener('change', async (e) => {
  const value = Math.max(1, parseInt(e.target.value, 10) || DEFAULT_INTERVAL);
  e.target.value = value;
  await chrome.storage.local.set({ intervalMinutes: value });

  // Reschedule alarm
  chrome.alarms.clear(ALARM_NAME, () => {
    chrome.alarms.create(ALARM_NAME, {
      periodInMinutes: value,
      delayInMinutes: value,
    });
  });

  updateStatus();
});

document.getElementById('minKept').addEventListener('change', async (e) => {
  const value = Math.max(0, parseInt(e.target.value, 10) || 0);
  e.target.value = value;
  await chrome.storage.local.set({ minTabsKept: value });
  updateStatus();
});

document.getElementById('snap-now').addEventListener('click', async () => {
  const storage = await chrome.storage.local.get('minTabsKept');
  const minKept = storage.minTabsKept ?? 0;

  const allTabs = await chrome.tabs.query({});
  const closeableTabs = allTabs.filter(tab => !tab.pinned);

  if (closeableTabs.length <= minKept) return;

  const maxToClose = closeableTabs.length - minKept;
  const toClose = shuffle([...closeableTabs]).slice(0, Math.max(1, Math.floor(maxToClose / 2)));

  for (const tab of toClose) {
    chrome.tabs.remove(tab.id).catch(() => {});
  }

  updateStatus();
});

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

loadSettings();
