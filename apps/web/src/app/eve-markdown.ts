import { Pipe, PipeTransform } from '@angular/core';

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/** Inline marks outside code: `code` and **bold**. The text is already escaped. */
function inline(text: string): string {
  return text
    .replace(/`([^`\n]+)`/g, '<code class="rounded bg-ink-950/70 px-1 font-mono text-[0.92em] text-brand-200">$1</code>')
    .replace(/\*\*(?!\s)([^*\n]+?)(?<!\s)\*\*/g, '<strong class="font-semibold text-ink-50">$1</strong>');
}

/**
 * The little Markdown the agent writes (fenced code, `code`, **bold**) as HTML. Everything is escaped first, so the
 * only tags in the result are the ones made here; Angular's [innerHTML] sanitizer still runs on top. Line breaks stay
 * as text for the bubble's `whitespace-pre-wrap`.
 */
export function renderEveMarkdown(text: string): string {
  const parts = escapeHtml(text).split(/```[\w-]*\n?([\s\S]*?)```/g);
  return parts
    .map((part, i) => {
      if (i % 2) {
        return `<pre class="my-1.5 overflow-x-auto rounded-lg bg-ink-950/80 px-2.5 py-2 font-mono text-[11px] leading-relaxed text-brand-100">${part.replace(/\n$/, '')}</pre>`;
      }
      // A <pre> is already a block; the newline beside it would add a blank line in a pre-wrap bubble.
      let textPart = part;
      if (i > 0) textPart = textPart.replace(/^\n/, '');
      if (i < parts.length - 1) textPart = textPart.replace(/\n$/, '');
      return inline(textPart);
    })
    .join('');
}

@Pipe({ name: 'eveMarkdown' })
export class EveMarkdownPipe implements PipeTransform {
  transform(text: string | null | undefined): string {
    return renderEveMarkdown(text ?? '');
  }
}
