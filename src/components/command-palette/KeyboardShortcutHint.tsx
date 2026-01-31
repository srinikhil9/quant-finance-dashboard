'use client';

import { Command } from 'lucide-react';

/**
 * Small hint shown in the navbar to indicate Ctrl+K shortcut
 */
export function KeyboardShortcutHint() {
  return (
    <button
      onClick={() => {
        // Trigger the command palette
        const event = new KeyboardEvent('keydown', {
          key: 'k',
          ctrlKey: true,
          bubbles: true,
        });
        document.dispatchEvent(event);
      }}
      className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 bg-zinc-800/50 border border-zinc-700 rounded-md hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
    >
      <Command className="w-3 h-3" />
      <span>Search</span>
      <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-zinc-900 border border-zinc-600 rounded">
        Ctrl+K
      </kbd>
    </button>
  );
}

export default KeyboardShortcutHint;
