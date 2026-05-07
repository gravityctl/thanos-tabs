// Thanos Tabs - Background Service Worker

const DEFAULT_INTERVAL_MINUTES = 5;
const ALARM_NAME = 'thanos-snap';

// Load saved interval or default
async function getIntervalMinutes() {
  const result = await chrome.storage.local.get('intervalMinutes');
  return result.intervalMinutes ?? DEFAULT_INTERVAL_MINUTES;
}

// Update badge with next snap time
async function updateBadge() {
  const intervalMinutes = await getIntervalMinutes();
  const nextSnap = new Date(Date.now() + intervalMinutes * 60 * 1000);
  const minutesLeft = Math.ceil((nextSnap - Date.now()) / 60000);
  chrome.action.setBadgeText({ text: minutesLeft.toString() });
  chrome.action.setBadgeBackgroundColor({ color: '#7c3aed' });
}

// Close half of the non-pinned tabs
async function snapTabs() {
  const allTabs = await chrome.tabs.query({});

  const closeableTabs = allTabs.filter(tab => !tab.pinned);

  if (closeableTabs.length === 0) {
    return;
  }

  // Shuffle and take half
  const toClose = shuffleArray([...closeableTabs]).slice(0, Math.ceil(closeableTabs.length / 2));

  // Give a short delay so user sees what's happening
  await new Promise(resolve => setTimeout(resolve, 200));

  for (const tab of toClose) {
    chrome.tabs.remove(tab.id).catch(() => {});
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Set up the alarm to run periodically
async function setupAlarm() {
  const intervalMinutes = await getIntervalMinutes();
  const periodMinutes = intervalMinutes;

  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: periodMinutes,
    delayInMinutes: periodMinutes,
  });
}

// Alarm listener
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    snapTabs();
    updateBadge();
  }
});

// When extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  setupAlarm();
  updateBadge();
});

// When browser starts
chrome.runtime.onStartup.addListener(() => {
  setupAlarm();
  updateBadge();
});

// Listen for storage changes (interval updated via popup)
chrome.storage.onChanged.addListener((changes) => {
  if (changes.intervalMinutes) {
    chrome.alarms.clear(ALARM_NAME, () => {
      setupAlarm();
    });
    updateBadge();
  }
});

// Update badge every minute
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    snapTabs();
    updateBadge();
  }
});

// Also update badge on a regular interval for countdown accuracy
chrome.alarms.create('badge-tick', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'badge-tick') {
    updateBadge();
  }
});
