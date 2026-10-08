const phaseId = Number(new URLSearchParams(location.search).get('id'));
if (phaseId >= 3 && phaseId <= 9) {
  await import('./course-phase.js');
} else {
  await import('./phase.js');
}
