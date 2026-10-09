export function sqlToExecute(editor) {
  const { value, selectionStart, selectionEnd } = editor;
  return (selectionStart === selectionEnd
    ? value
    : value.slice(selectionStart, selectionEnd)).trim();
}
