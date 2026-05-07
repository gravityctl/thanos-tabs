// Thanos Tabs - Background Service Worker

const DEFAULT_INTERVAL_MINUTES = 5;
const ALARM_NAME = 'thanos-snap';
const BADGE_TICK_NAME = 'badge-tick';

async function getIntervalMinutes() {
  const result = await chrome.storage.local.get('intervalMinutes');
  return result.intervalMinutes ?? DEFAULT_INTERVAL_MINUTES;
}

// Update badge with minutes remaining until next alarm fire
async function updateBadge() {
  const alarm = await chrome.alarms.get(ALARM_NAME);
  if (!alarm) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }
  const minutesLeft = Math.max(1, Math.ceil((alarm.scheduledTime - Date.now()) / 60000));
  chrome.action.setBadgeText({ text: minutesLeft.toString() });
  chrome.action.setBadgeBackgroundColor({ color: '#7c3aed' });
}

let isSnapping = false;

// Close half of the non-pinned tabs, never dropping below minTabsKept
async function snapTabs() {
  if (isSnapping) return;
  isSnapping = true;

  try {
    const result = await chrome.storage.local.get(['minTabsKept', 'intervalMinutes']);
    const minKept = result.minTabsKept ?? 0;

    const allTabs = await chrome.tabs.query({});
    const closeableTabs = allTabs.filter(tab => !tab.pinned);

    if (closeableTabs.length <= minKept) {
      return;
    }

    // keepCount = max(minKept, ceil(total/2)), closeCount = total - keepCount
    const keepCount = Math.max(minKept, Math.ceil(closeableTabs.length / 2));
    const toClose = shuffleArray([...closeableTabs]).slice(keepCount);

    for (const tab of toClose) {
      await chrome.tabs.remove(tab.id);
    }
  } finally {
    isSnapping = false;
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function setupAlarm() {
  const intervalMinutes = await getIntervalMinutes();
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: intervalMinutes,
    delayInMinutes: intervalMinutes,
  });
  chrome.alarms.create(BADGE_TICK_NAME, { periodInMinutes: 1 });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    snapTabs().then(updateBadge);
  } else if (alarm.name === BADGE_TICK_NAME) {
    updateBadge();
  }
});

chrome.runtime.onInstalled.addListener(() => {
  setupAlarm();
  updateBadge();
});

chrome.runtime.onStartup.addListener(() => {
  setupAlarm();
  updateBadge();
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.intervalMinutes) {
    chrome.alarms.clear(ALARM_NAME, () => {
      setupAlarm();
    });
    updateBadge();
  }
});