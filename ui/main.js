const { invoke } = window.__TAURI__.core;

// Window controls
document.getElementById('btn-close').onclick = () => invoke('close_window');
document.getElementById('btn-minimize').onclick = () => invoke('minimize_window');
document.getElementById('btn-maximize').onclick = () => invoke('maximize_window');

// Navigation
function navigate(url) {
  let target = url.trim();
  if (!target) return;

  // Bang detection
  const bangs = {
    '!yt': 'https://youtube.com/results?search_query=',
    '!gh': 'https://github.com/search?q=',
    '!w': 'https://en.wikipedia.org/wiki/',
    '!r': 'https://reddit.com/search?q=',
    '!g': 'https://google.com/search?q=',
  };

  for (const [bang, base] of Object.entries(bangs)) {
    if (target.startsWith(bang + ' ')) {
      target = base + encodeURIComponent(target.slice(bang.length + 1));
      break;
    }
  }

  // URL vs search
  const isURL = /^https?:\/\//.test(target) || /^[\w-]+\.\w{2,}/.test(target);
  if (isURL) {
    if (!/^https?:\/\//.test(target)) target = 'https://' + target;
  } else {
    target = 'https://google.com/search?q=' + encodeURIComponent(target);
  }

  document.getElementById('urlbar').value = target;
  invoke('navigate', { url: target });
}

document.getElementById('urlbar').addEventListener('keydown', e => {
  if (e.key === 'Enter') navigate(e.target.value);
});

document.getElementById('search-btn').onclick = () => {
  navigate(document.getElementById('search-input').value);
};

document.getElementById('search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') navigate(e.target.value);
});