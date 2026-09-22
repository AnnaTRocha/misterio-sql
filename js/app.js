(() => {
  "use strict";

  const CONFIG = Object.freeze({
    databasePath: "data/caso.sqlite",
    answerDigest: "508df44321d2b2e2a04dbb185429c3343ec4bb0ca22b40dfd81c75fc5cea1695",
    maxRows: 200
  });

  let db = null;

  const els = {
    editor: document.getElementById("sqlEditor"),
    runBtn: document.getElementById("runBtn"),
    clearBtn: document.getElementById("clearBtn"),
    result: document.getElementById("resultArea"),
    status: document.getElementById("dbStatus"),
    accusationForm: document.getElementById("accusationForm"),
    suspectInput: document.getElementById("suspectInput"),
    verdict: document.getElementById("verdict")
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setDbStatus(type, text) {
    els.status.className = `db-status ${type}`;
    els.status.innerHTML = `<span></span>${escapeHtml(text)}`;
  }

  async function loadDatabase() {
    try {
      if (typeof initSqlJs !== "function") {
        throw new Error("A biblioteca SQL não foi carregada.");
      }

      const SQL = await initSqlJs({
        locateFile: file =>
          `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
      });

      const response = await fetch(CONFIG.databasePath, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Não foi possível carregar o banco (${response.status}).`);
      }

      const bytes = new Uint8Array(await response.arrayBuffer());
      db = new SQL.Database(bytes);

      setDbStatus("ready", "Banco conectado");
      els.runBtn.disabled = false;
    } catch (error) {
      setDbStatus("error", "Falha ao carregar");
      els.result.innerHTML = `
        <div class="sql-error">
          Não foi possível abrir o banco de dados.<br><br>
          Rode este projeto por um servidor local, como o Live Server do VS Code
          ou <strong>python -m http.server 8000</strong>.
        </div>
      `;
      console.error(error);
    }
  }

  function isReadOnlyQuery(sql) {
    const cleaned = sql
      .replace(/--.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .trim();

    return /^(SELECT|WITH|PRAGMA\s+table_info)/i.test(cleaned) &&
      !/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|ATTACH|DETACH|VACUUM)\b/i.test(cleaned);
  }

  function executeSql() {
    if (!db) return;

    const sql = els.editor.value.trim();

    if (!sql) {
      renderError("Digite uma consulta SQL.");
      return;
    }

    if (!isReadOnlyQuery(sql)) {
      renderError("Neste desafio são permitidas apenas consultas de leitura (SELECT/WITH).");
      return;
    }

    const startedAt = performance.now();

    try {
      const resultSets = db.exec(sql);
      const elapsed = (performance.now() - startedAt).toFixed(1);

      if (!resultSets.length) {
        els.result.innerHTML = `
          <div class="query-meta">consulta concluída em ${elapsed} ms · 0 linhas</div>
          <div class="empty-result">
            <span>∅</span>
            <p>Nenhum registro encontrado.</p>
          </div>
        `;
        return;
      }

      const rendered = resultSets.map(result => {
        const rows = result.values.slice(0, CONFIG.maxRows);
        const head = result.columns
          .map(column => `<th>${escapeHtml(column)}</th>`)
          .join("");

        const body = rows
          .map(row => `
            <tr>
              ${row.map(value => `<td>${escapeHtml(value)}</td>`).join("")}
            </tr>
          `)
          .join("");

        return `
          <div class="query-meta">
            consulta concluída em ${elapsed} ms ·
            ${result.values.length} linha(s)
            ${result.values.length > CONFIG.maxRows ? ` · exibindo as primeiras ${CONFIG.maxRows}` : ""}
          </div>
          <table class="result-table">
            <thead><tr>${head}</tr></thead>
            <tbody>${body}</tbody>
          </table>
        `;
      }).join("");

      els.result.innerHTML = rendered;
    } catch (error) {
      renderError(`Erro SQL: ${error.message}`);
    }
  }

  function renderError(message) {
    els.result.innerHTML = `<div class="sql-error">${escapeHtml(message)}</div>`;
  }

  function clearEditor() {
    els.editor.value = "";
    els.editor.focus();
  }

  function normalizeName(value) {
    return value
      .trim()
      .toLocaleLowerCase("pt-BR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  }

  async function sha256(text) {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", bytes);

    return Array.from(new Uint8Array(digest))
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  async function checkAccusation(event) {
    event.preventDefault();

    const suspect = normalizeName(els.suspectInput.value);

    if (!suspect) return;

    const digest = await sha256(suspect);
    const correct = digest === CONFIG.answerDigest;

    els.verdict.className = `verdict ${correct ? "success" : "failure"}`;

    if (correct) {
      els.verdict.textContent =
        "✓ Caso solucionado. Sua acusação é compatível com todas as evidências.";
    } else {
      els.verdict.textContent =
        "✕ As evidências ainda não sustentam essa acusação. Continue investigando.";
    }
  }

  els.runBtn.addEventListener("click", executeSql);
  els.clearBtn.addEventListener("click", clearEditor);
  els.accusationForm.addEventListener("submit", checkAccusation);

  els.editor.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      executeSql();
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const start = els.editor.selectionStart;
      const end = els.editor.selectionEnd;
      els.editor.value =
        els.editor.value.substring(0, start) +
        "  " +
        els.editor.value.substring(end);
      els.editor.selectionStart = els.editor.selectionEnd = start + 2;
    }
  });

  window.addEventListener("DOMContentLoaded", loadDatabase);
})();
