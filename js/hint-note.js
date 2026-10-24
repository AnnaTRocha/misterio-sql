export function createHintNote({ dialog, label, text, close }) {
  let generation = 0;

  const pause = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));
  const isCurrent = run => run === generation && dialog.open;

  async function typeNodes(source, target, run) {
    for (const node of [...source.childNodes]) {
      if (!isCurrent(run)) return;

      if (node.nodeType === Node.TEXT_NODE) {
        for (const character of Array.from(node.textContent || '')) {
          if (!isCurrent(run)) return;
          target.append(document.createTextNode(character));
          await pause(14);
        }
        continue;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      const element = document.createElement(node.localName);
      for (const attribute of node.attributes) element.setAttribute(attribute.name, attribute.value);
      target.append(element);
      await typeNodes(node, element, run);
    }
  }

  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    generation += 1;
    text.classList.remove('is-typing');
  });

  function reveal(safeHtml, hintNumber) {
    const run = ++generation;
    label.textContent = `PISTA ${String(hintNumber).padStart(2, '0')}`;
    text.replaceChildren();

    if (!dialog.open) dialog.showModal();
    close.focus();

    const template = document.createElement('template');
    // The caller passes renderHint output, which escapes text and validates external URLs.
    template.innerHTML = safeHtml;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      text.append(template.content.cloneNode(true));
      text.classList.remove('is-typing');
      return;
    }

    text.classList.add('is-typing');
    typeNodes(template.content, text, run).finally(() => {
      if (run === generation) text.classList.remove('is-typing');
    });
  }

  return { reveal };
}
