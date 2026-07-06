/**
 * Utility to parse markdown-like formatting into styled HTML strings securely.
 */
export function renderMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';
  
  // 1. Escape HTML first to prevent XSS injection
  let html = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 2. Parse Headers
  html = html.replace(/^### (.*?)$/gm, '<h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-50 mt-3 mb-1">$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2 class="text-base font-bold text-zinc-900 dark:text-zinc-50 mt-4 mb-1.5">$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1 class="text-lg font-bold text-zinc-900 dark:text-zinc-50 mt-5 mb-2">$1</h1>');

  // 3. Parse Bold (**text**)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-zinc-900 dark:text-zinc-50">$1</strong>');

  // 4. Parse Italic (*text*)
  html = html.replace(/\*(.*?)\*/g, '<em class="italic text-zinc-700 dark:text-zinc-350">$1</em>');

  // 5. Parse Checkboxes (- [ ] and - [x])
  html = html.replace(/^(\s*)-\s+\[ \]\s+(.*?)$/gm, '<div class="flex items-center gap-2 my-1 text-zinc-650 dark:text-zinc-350"><input type="checkbox" disabled class="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-0 w-3.5 h-3.5 pointer-events-none" /> <span>$1</span></div>');
  html = html.replace(/^(\s*)-\s+\[x\]\s+(.*?)$/gm, '<div class="flex items-center gap-2 my-1 text-zinc-400 dark:text-zinc-500 line-through"><input type="checkbox" checked disabled class="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-0 w-3.5 h-3.5 pointer-events-none" /> <span>$1</span></div>');

  // 6. Parse regular bullets (excluding already parsed checkboxes)
  html = html.replace(/^(\s*)-\s+(?!\[ \]|\[x\])(.*?)$/gm, '<li class="list-disc list-inside ml-2 my-1 text-zinc-650 dark:text-zinc-350">$2</li>');

  // 7. Parse inline code block (`code`)
  html = html.replace(/`(.*?)`/g, '<code class="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');

  // 8. Convert links ([name](url))
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-zinc-900 dark:text-zinc-100 underline hover:text-zinc-600 dark:hover:text-zinc-300 font-medium">$1</a>');

  // 9. Line breaks
  html = html.replace(/\n/g, '<br />');

  return html;
}

/**
 * Inserts markdown formatting syntax around or at the cursor in a textarea
 */
export function insertMarkdown(
  textarea: HTMLTextAreaElement,
  type: 'bold' | 'italic' | 'h3' | 'bullet' | 'todo' | 'link' | 'image_url',
  value?: string
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selectedText = text.substring(start, end);

  let replacement = '';
  let cursorOffset = 0;

  switch (type) {
    case 'bold':
      replacement = `**${selectedText || '粗体文字'}**`;
      cursorOffset = selectedText ? 0 : 2;
      break;
    case 'italic':
      replacement = `*${selectedText || '斜体文字'}*`;
      cursorOffset = selectedText ? 0 : 1;
      break;
    case 'h3':
      replacement = `\n### ${selectedText || '标题'}\n`;
      cursorOffset = selectedText ? 0 : 4;
      break;
    case 'bullet':
      replacement = `\n- ${selectedText || '列表项'}\n`;
      cursorOffset = selectedText ? 0 : 3;
      break;
    case 'todo':
      replacement = `\n- [ ] ${selectedText || '新任务'}\n`;
      cursorOffset = selectedText ? 0 : 7;
      break;
    case 'link':
      replacement = `[${selectedText || '链接名称'}](${value || 'https://'})`;
      cursorOffset = selectedText ? 0 : 1;
      break;
    case 'image_url':
      replacement = `\n![图片名称](${value || 'https://'})\n`;
      break;
    default:
      break;
  }

  const newValue = text.substring(0, start) + replacement + text.substring(end);
  textarea.value = newValue;
  
  // Set focus and selection back
  textarea.focus();
  if (selectedText) {
    textarea.setSelectionRange(start, start + replacement.length);
  } else {
    textarea.setSelectionRange(start + replacement.length - cursorOffset, start + replacement.length - cursorOffset);
  }
}
