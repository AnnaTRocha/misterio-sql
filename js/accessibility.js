const key = 'misterio-sql-accessibility';
const defaults = { theme: 'system', font: 'normal', zoom: '100' };

function readSettings() {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(key) || '{}') };
  } catch {
    return { ...defaults };
  }
}

const settings = readSettings();
const root = document.documentElement;
const systemDark = matchMedia('(prefers-color-scheme: dark)');

function apply() {
  const theme = settings.theme === 'system' ? (systemDark.matches ? 'dark' : 'light') : settings.theme;
  root.dataset.colorTheme = theme;
  root.dataset.fontSize = settings.font;
  root.style.setProperty('--reading-zoom', `${Number(settings.zoom) / 100}`);
  root.style.colorScheme = theme;
}

apply();
systemDark.addEventListener('change', apply);

function renderControls() {
  const wrapper = document.createElement('div');
  wrapper.className = 'accessibility-controls';
  wrapper.innerHTML = `
    <button class="accessibility-toggle" type="button" aria-label="Opções de acessibilidade" title="Opções de acessibilidade" aria-expanded="false" aria-controls="accessibility-panel">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        <circle cx="12" cy="3.5" r="1.5"/><path d="M4 8.5c2.6 1 5.3 1.5 8 1.5s5.4-.5 8-1.5M12 10v4.2m0 0-4 6.3m4-6.3 4 6.3"/>
      </svg>
    </button>
    <section class="accessibility-panel" id="accessibility-panel" aria-label="Preferências de acessibilidade" hidden>
      <label>Tema
        <select name="theme">
          <option value="system">Automático</option><option value="light">Claro</option><option value="dark">Escuro</option>
        </select>
      </label>
      <label>Tamanho do texto
        <select name="font">
          <option value="normal">Padrão</option><option value="large">Grande</option><option value="larger">Muito grande</option>
        </select>
      </label>
      <label>Zoom da interface
        <select name="zoom">
          <option value="100">100%</option><option value="125">125%</option><option value="150">150%</option>
        </select>
      </label>
    </section>`;
  document.body.append(wrapper);
  const toggle = wrapper.querySelector('button');
  const panel = wrapper.querySelector('section');
  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-expanded', String(!panel.hidden));
  });
  for (const select of wrapper.querySelectorAll('select')) {
    select.value = settings[select.name];
    select.addEventListener('change', () => {
      settings[select.name] = select.value;
      try { localStorage.setItem(key, JSON.stringify(settings)); } catch { /* Storage can be unavailable. */ }
      apply();
    });
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderControls);
else renderControls();
