// Popup logic for Thanos Tabs

const ALARM_NAME = 'thanos-snap';
const DEFAULT_INTERVAL = 5;

async function loadSettings() {
  const result = await chrome.storage.local.get('intervalMinutes');
  document.getElementById('interval').value = result.intervalMinutes ?? DEFAULT_INTERVAL;
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

document.getElementById('snap-now').addEventListener('click', async () => {
  const allTabs = await chrome.tabs.query({});
  const closeableTabs = allTabs.filter(tab => !tab.pinned);

  if (closeableTabs.length === 0) return;

  const toClose = shuffle([...closeableTabs]).slice(0, Math.ceil(closeableTabs.length / 2));

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
