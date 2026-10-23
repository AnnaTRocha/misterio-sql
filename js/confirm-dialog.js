export function confirmInPage({ title, message, confirmLabel = 'Confirmar' }) {
  const dialog = document.getElementById('confirmationDialog');
  const titleElement = document.getElementById('confirmationTitle');
  const messageElement = document.getElementById('confirmationMessage');
  const acceptButton = document.getElementById('confirmationAccept');

  if (!dialog?.showModal || !titleElement || !messageElement || !acceptButton || dialog.open) {
    return Promise.resolve(false);
  }

  titleElement.textContent = title;
  messageElement.textContent = message;
  acceptButton.textContent = confirmLabel;
  dialog.returnValue = 'cancel';

  return new Promise(resolve => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true });
    dialog.showModal();
  });
}
