import { api } from './api-client.js';

const $ = id => document.getElementById(id);

function formatTimestamp(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? 'HORÁRIO INDISPONÍVEL' : new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  }).format(date);
}

function renderEntries(entries) {
  const list = $('teamEvidenceList');
  list.replaceChildren();
  if (!entries.length) {
    const empty = document.createElement('li');
    empty.className = 'team-board-empty';
    empty.textContent = 'A equipe ainda não registrou observações.';
    list.append(empty);
    return;
  }

  entries.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'team-evidence-note';
    const meta = document.createElement('div');
    meta.className = 'team-evidence-meta';
    const author = document.createElement('span');
    author.textContent = entry.author || 'integrante';
    const timestamp = document.createElement('time');
    timestamp.dateTime = entry.created_at || '';
    timestamp.textContent = formatTimestamp(entry.created_at);
    meta.append(author, timestamp);
    const note = document.createElement('p');
    note.textContent = entry.note;
    item.append(meta, note);
    list.append(item);
  });
}

export async function initTeamBoard(phaseId) {
  if (Number(phaseId) !== 9) return;
  const root = $('teamBoard');
  if (!root) return;
  const form = $('teamEvidenceForm');
  const submit = $('teamEvidenceSubmit');
  const feedback = $('teamBoardFeedback');
  let entries = [];

  try {
    const data = await api('/api/game?action=team-board&phase_id=9');
    root.hidden = false;
    $('teamBoardTitle').textContent = data.group_name || 'Equipe de investigação';
    entries = data.entries || [];
    renderEntries(entries);
  } catch (error) {
    root.hidden = false;
    feedback.textContent = error.message;
    form.hidden = true;
    return;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const note = $('teamEvidenceNote').value;
    submit.disabled = true;
    feedback.textContent = 'Compartilhando com a equipe…';
    try {
      const data = await api('/api/game?action=team-board', {
        method: 'POST',
        body: { phase_id: 9, note }
      });
      entries = [data.entry, ...entries].slice(0, 30);
      renderEntries(entries);
      form.reset();
      feedback.textContent = 'Observação adicionada ao quadro da equipe.';
    } catch (error) {
      feedback.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });
}
