const MAX_ENTRIES = 12;
const MAX_ROWS = 4;
const MAX_COLUMNS = 6;

const cellText = value => String(value ?? 'NULL').slice(0, 160);

export function createEvidenceSnapshot(query, resultSets) {
  const sets = (Array.isArray(resultSets) ? resultSets : [])
    .filter(set => Array.isArray(set?.columns) && Array.isArray(set?.values) && set.values.length)
    .map(set => ({
      columns: set.columns.slice(0, MAX_COLUMNS).map(cellText),
      values: set.values.slice(0, MAX_ROWS).map(row => row.slice(0, MAX_COLUMNS).map(cellText))
    }));
  if (!sets.length) return null;
  return { query: String(query || '').trim().slice(0, 800), results: sets };
}

export function createEvidenceNotebook({ phaseId, username, root, countElement, listElement }) {
  const storageKey = `misterio-sql:evidence:v1:${encodeURIComponent(username || 'student')}:${Number(phaseId)}`;
  let entries = readEntries();

  function readEntries() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(parsed)
        ? parsed.filter(entry => typeof entry?.query === 'string' && Array.isArray(entry.results) && entry.results.every(set =>
          Array.isArray(set?.columns) && Array.isArray(set?.values) && set.values.every(Array.isArray)
        )).slice(0, MAX_ENTRIES)
        : [];
    } catch {
      return [];
    }
  }

  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(entries));
      return true;
    } catch {
      return false;
    }
  }

  function render() {
    if (!root || !listElement || !countElement) return;
    countElement.textContent = `${entries.length} salvas`;
    listElement.replaceChildren();
    entries.forEach((entry, index) => {
      const item = document.createElement('li');
      item.className = 'evidence-note';
      const header = document.createElement('div');
      header.className = 'evidence-note-header';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'evidence-remove';
      remove.textContent = 'remover';
      remove.setAttribute('aria-label', `Remover registro ${String(entries.length - index).padStart(2, '0')}`);
      remove.addEventListener('click', () => {
        entries.splice(index, 1);
        persist();
        render();
      });
      header.append(remove);
      item.append(header);

      const sql = document.createElement('code');
      sql.className = 'evidence-query';
      sql.textContent = entry.query;
      item.append(sql);

      for (const set of entry.results) {
        const table = document.createElement('table');
        table.className = 'result-table evidence-result-table';
        const head = document.createElement('thead');
        const headRow = document.createElement('tr');
        set.columns.forEach(column => {
          const cell = document.createElement('th');
          cell.textContent = column;
          headRow.append(cell);
        });
        head.append(headRow);
        const body = document.createElement('tbody');
        set.values.forEach(row => {
          const tableRow = document.createElement('tr');
          row.forEach(value => {
            const cell = document.createElement('td');
            cell.textContent = value;
            tableRow.append(cell);
          });
          body.append(tableRow);
        });
        table.append(head, body);
        item.append(table);
      }
      listElement.append(item);
    });
  }

  function save(snapshot) {
    if (!snapshot?.query || !snapshot.results?.length) return false;
    entries = [{ ...snapshot, savedAt: Date.now() }, ...entries].slice(0, MAX_ENTRIES);
    if (!persist()) {
      entries.shift();
      return false;
    }
    if (root) root.open = true;
    render();
    return true;
  }

  function attachSaveButton(container, query, resultSets) {
    const snapshot = createEvidenceSnapshot(query, resultSets);
    if (!snapshot || !container) return;
    const row = document.createElement('div');
    row.className = 'evidence-save-row';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'evidence-save-button';
    button.textContent = 'Guardar';
    button.addEventListener('click', () => {
      if (!save(snapshot)) {
        button.textContent = 'Armazenamento indisponível';
        button.disabled = true;
        return;
      }
      button.textContent = 'Guardada';
      button.disabled = true;
    });
    row.append(button);
    container.append(row);
  }

  render();
  return { attachSaveButton, render };
}
