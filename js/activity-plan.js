const root = document.getElementById('activityPlanContent');

async function loadActivityPlan() {
  try {
    const response = await fetch('/api/activity-plan?action=content', { cache: 'no-store' });
    if (response.status === 404) {
      root.innerHTML = `
        <span class="eyebrow">PLANO DE ATIVIDADES</span>
        <h1>Visualização desativada</h1>
        <p class="recovery-lead">O professor desativou temporariamente a visualização pública deste plano.</p>`;
      return;
    }
    if (!response.ok) throw new Error('Não foi possível carregar o plano.');

    root.innerHTML = await response.text();
  } catch {
    root.innerHTML = `
      <span class="eyebrow">PLANO DE ATIVIDADES</span>
      <h1>Plano indisponível</h1>
      <p class="recovery-lead">Não foi possível carregar o plano agora. Tente novamente em alguns instantes.</p>`;
  } finally {
    root.setAttribute('aria-busy', 'false');
  }
}

loadActivityPlan();
