const keyFor = username => `misterio-sql:recent-unlock:${encodeURIComponent(username)}`;

export function rememberUnlockedPhase(username, phaseId) {
  const nextPhase = Number(phaseId) + 1;
  if (!username || !Number.isInteger(nextPhase) || nextPhase < 2 || nextPhase > 9) return;

  try {
    sessionStorage.setItem(keyFor(username), String(nextPhase));
  } catch {
    // The unlock animation is optional; completion must still work if storage is unavailable.
  }
}

export function animateRecentUnlock(username) {
  if (!username) return;

  try {
    const key = keyFor(username);
    const phaseId = Number(sessionStorage.getItem(key));
    sessionStorage.removeItem(key);
    if (!Number.isInteger(phaseId) || phaseId < 2 || phaseId > 9) return;

    const index = String(phaseId).padStart(2, '0');
    const card = [...document.querySelectorAll('.case-file')]
      .find(element => element.dataset.index === index);
    if (card && !card.classList.contains('locked')) card.classList.add('just-unlocked');
  } catch {
    // The unlock animation is optional; dashboard rendering must still work if storage is unavailable.
  }
}
