const invoke = window.__TAURI__?.core?.invoke || (async (cmd, args) => console.log(`[Tauri Mock] ${cmd}`, args));

// Window controls
document.getElementById('btn-close').onclick = () => invoke('close_window');
document.getElementById('btn-minimize').onclick = () => invoke('minimize_window');
document.getElementById('btn-maximize').onclick = () => invoke('maximize_window');

// Bang definitions
const BANGS = {
  '!yt': { name: 'YouTube', url: 'https://youtube.com/results?search_query=' },
  '!gh': { name: 'GitHub', url: 'https://github.com/search?q=' },
  '!w':  { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/' },
  '!r':  { name: 'Reddit', url: 'https://reddit.com/search?q=' },
  '!g':  { name: 'Google', url: 'https://google.com/search?q=' },
};

// State
let tabs = [
  { id: 1, title: 'New Tab', url: 'surface://home', history: ['surface://home'], historyIndex: 0 }
];
let activeTabId = 1;
let nextTabId = 2;
let sitesVisited = 0;
let trackersBlocked = 0;

const tabsContainer = document.getElementById('tabs');
const urlbar = document.getElementById('urlbar');
const bangIndicator = document.getElementById('bang-indicator');
const shieldCount = document.getElementById('shield-count');
const homepageFrame = document.getElementById('homepage');

// Render Tabs
function renderTabs() {
  tabsContainer.innerHTML = '';
  tabs.forEach(tab => {
    const tabEl = document.createElement('div');
    tabEl.className = `tab ${tab.id === activeTabId ? 'active' : ''}`;
    tabEl.dataset.id = tab.id;

    tabEl.innerHTML = `
      <span class="tab-favicon">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      </span>
      <span class="tab-title">${escapeHtml(tab.title)}</span>
      <button class="tab-close" title="Close Tab">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    `;

    tabEl.addEventListener('click', (e) => {
      if (e.target.closest('.tab-close')) {
        closeTab(tab.id);
      } else {
        switchTab(tab.id);
      }
    });

    tabsContainer.appendChild(tabEl);
  });

  syncStatsToHome();
}

function createTab() {
  const newTab = {
    id: nextTabId++,
    title: 'New Tab',
    url: 'surface://home',
    history: ['surface://home'],
    historyIndex: 0
  };
  tabs.push(newTab);
  switchTab(newTab.id);
  urlbar.focus();
}

function closeTab(id) {
  if (tabs.length === 1) {
    tabs[0] = {
      id: nextTabId++,
      title: 'New Tab',
      url: 'surface://home',
      history: ['surface://home'],
      historyIndex: 0
    };
    switchTab(tabs[0].id);
    return;
  }
  const idx = tabs.findIndex(t => t.id === id);
  tabs = tabs.filter(t => t.id !== id);
  if (activeTabId === id) {
    const nextActive = tabs[Math.max(0, idx - 1)];
    activeTabId = nextActive.id;
  }
  switchTab(activeTabId);
}

function loadFrameForTab(tab) {
  if (!tab || tab.url === 'surface://home') {
    urlbar.value = '';
    if (!homepageFrame.src.endsWith('home.html')) {
      homepageFrame.src = 'home.html';
    }
  } else {
    urlbar.value = tab.url;
    if (homepageFrame.src !== tab.url) {
      homepageFrame.src = tab.url;
    }
  }
}

function switchTab(id) {
  activeTabId = id;
  const current = tabs.find(t => t.id === activeTabId);
  loadFrameForTab(current);
  updateBangIndicator(urlbar.value);
  renderTabs();
}

document.getElementById('btn-newtab').onclick = createTab;

// Navigation
function navigate(rawInput) {
  let target = rawInput.trim();
  if (!target) return;

  // Bang detection
  for (const [bang, info] of Object.entries(BANGS)) {
    if (target.startsWith(bang + ' ')) {
      target = info.url + encodeURIComponent(target.slice(bang.length + 1));
      break;
    }
  }

  // URL vs search
  const isURL = /^https?:\/\//i.test(target) || /^[\w-]+\.[a-z]{2,}(\/.*)?$/i.test(target);
  if (isURL) {
    if (!/^https?:\/\//i.test(target)) target = 'https://' + target;
  } else {
    target = 'https://google.com/search?q=' + encodeURIComponent(target);
  }

  urlbar.value = target;
  updateBangIndicator('');

  // Update active tab title, URL & history stack
  const current = tabs.find(t => t.id === activeTabId);
  if (current) {
    current.url = target;
    current.history = current.history.slice(0, current.historyIndex + 1);
    current.history.push(target);
    current.historyIndex = current.history.length - 1;

    try {
      const hostname = new URL(target).hostname.replace(/^www\./, '');
      current.title = hostname.charAt(0).toUpperCase() + hostname.slice(1);
    } catch {
      current.title = target;
    }
    loadFrameForTab(current);
  }

  sitesVisited++;
  shieldCount.textContent = trackersBlocked;
  renderTabs();

  invoke('navigate', { url: target });
}

// Live Bang Pill detection in URL bar
function updateBangIndicator(val) {
  for (const [bang, info] of Object.entries(BANGS)) {
    if (val.startsWith(bang + ' ')) {
      bangIndicator.textContent = info.name;
      bangIndicator.classList.remove('hidden');
      return;
    }
  }
  bangIndicator.classList.add('hidden');
}

urlbar.addEventListener('input', (e) => updateBangIndicator(e.target.value));

urlbar.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    navigate(e.target.value);
    urlbar.blur();
  }
});

urlbar.addEventListener('focus', () => urlbar.select());

// Navbar buttons
document.getElementById('nav-back').onclick = () => {
  const current = tabs.find(t => t.id === activeTabId);
  if (current && current.historyIndex > 0) {
    current.historyIndex--;
    current.url = current.history[current.historyIndex];
    current.title = current.url === 'surface://home'
      ? 'New Tab'
      : new URL(current.url).hostname.replace(/^www\./, '');
    loadFrameForTab(current);
    renderTabs();
  }
};

document.getElementById('nav-forward').onclick = () => {
  const current = tabs.find(t => t.id === activeTabId);
  if (current && current.historyIndex < current.history.length - 1) {
    current.historyIndex++;
    current.url = current.history[current.historyIndex];
    current.title = current.url === 'surface://home'
      ? 'New Tab'
      : new URL(current.url).hostname.replace(/^www\./, '');
    loadFrameForTab(current);
    renderTabs();
  }
};

document.getElementById('nav-reload').onclick = () => {
  const current = tabs.find(t => t.id === activeTabId);
  if (current) {
    homepageFrame.src = current.url === 'surface://home' ? 'home.html' : current.url;
  }
};

document.getElementById('nav-home').onclick = () => {
  const current = tabs.find(t => t.id === activeTabId);
  if (current && current.url !== 'surface://home') {
    current.url = 'surface://home';
    current.title = 'New Tab';
    current.history = current.history.slice(0, current.historyIndex + 1);
    current.history.push('surface://home');
    current.historyIndex = current.history.length - 1;
    loadFrameForTab(current);
    renderTabs();
  }
};

// Listen for navigation messages from home.html iframe
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'navigate') {
    navigate(event.data.url);
  } else if (event.data && event.data.type === 'request-stats') {
    syncStatsToHome();
  }
});

function syncStatsToHome() {
  homepageFrame.contentWindow?.postMessage({
    type: 'stats-update',
    tabsCount: tabs.length,
    sitesVisited,
    trackersBlocked
  }, '*');
}

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
    e.preventDefault();
    urlbar.focus();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
    e.preventDefault();
    createTab();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
    e.preventDefault();
    closeTab(activeTabId);
  }
});

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

// Initial render
renderTabs();