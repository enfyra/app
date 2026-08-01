const STORAGE_KEY = 'enfyra:data-collection-prefs';
const MAX_RECENT = 10;
const MAX_PINNED = 6;
const MAX_SIDEBAR_VISIBLE = 5;

interface DataCollectionPrefs {
  pinned: string[];
  recent: string[];
}

function loadPrefs(): DataCollectionPrefs {
  if (!import.meta.client) return { pinned: [], recent: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { pinned: [], recent: [] };
    const parsed = JSON.parse(raw);
    return {
      pinned: Array.isArray(parsed.pinned) ? parsed.pinned.slice(0, MAX_PINNED) : [],
      recent: Array.isArray(parsed.recent) ? parsed.recent.slice(0, MAX_RECENT) : [],
    };
  } catch {
    return { pinned: [], recent: [] };
  }
}

function savePrefs(prefs: DataCollectionPrefs) {
  if (!import.meta.client) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

export function useDataCollectionPreferences() {
  const prefs = useState<DataCollectionPrefs>('data-collection-prefs', loadPrefs);

  function isPinned(tableName: string): boolean {
    return prefs.value.pinned.includes(tableName);
  }

  function togglePin(tableName: string) {
    const idx = prefs.value.pinned.indexOf(tableName);
    if (idx >= 0) {
      prefs.value.pinned.splice(idx, 1);
    } else {
      if (prefs.value.pinned.length >= MAX_PINNED) {
        prefs.value.pinned.pop();
      }
      prefs.value.pinned.unshift(tableName);
    }
    savePrefs(prefs.value);
  }

  function addRecent(tableName: string) {
    prefs.value.recent = prefs.value.recent.filter(t => t !== tableName);
    prefs.value.recent.unshift(tableName);
    if (prefs.value.recent.length > MAX_RECENT) {
      prefs.value.recent = prefs.value.recent.slice(0, MAX_RECENT);
    }
    savePrefs(prefs.value);
  }

  const sidebarCollections = computed(() => {
    const pinned = [...prefs.value.pinned];
    const recent = prefs.value.recent.filter(t => !pinned.includes(t));
    return { pinned, recent, maxVisible: MAX_SIDEBAR_VISIBLE };
  });

  return {
    prefs: readonly(prefs),
    isPinned,
    togglePin,
    addRecent,
    sidebarCollections,
    MAX_SIDEBAR_VISIBLE,
  };
}
