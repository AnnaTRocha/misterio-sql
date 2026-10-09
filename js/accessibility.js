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
    <button class="accessibility-toggle" type="button" aria-expanded="false" aria-controls="accessibility-panel">Acessibilidade</button>
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
