import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

// ─── Types ────────────────────────────────────────────────────────────────
export interface TabItem {
  id:       string;
  label:    ReactNode;
  icon?:    ReactNode;
  content:  ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items:      TabItem[];
  defaultTab?: string;
  className?:  string;
  listClass?:  string;
}

// ─── Composant ────────────────────────────────────────────────────────────
export function Tabs({ items, defaultTab, className, listClass }: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? items[0]?.id);

  const current = items.find((t) => t.id === active) ?? items[0];

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Barre d'onglets */}
      <div
        role="tablist"
        className={cn(
          'flex gap-0 border-b border-ink-200 overflow-x-auto scrollbar-hide',
          listClass,
        )}
      >
        {items.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={tab.id === active}
            aria-controls={`tabpanel-${tab.id}`}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && setActive(tab.id)}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap',
              'px-4 py-3 text-sm font-medium border-b-2 -mb-px',
              'transition-colors duration-150',
              tab.id === active
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-ink-500 hover:text-ink-800 hover:border-ink-300',
              tab.disabled && 'cursor-not-allowed opacity-40',
            )}
          >
            {tab.icon && (
              <span className="text-[1em]" aria-hidden>
                {tab.icon}
              </span>
            )}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {items.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`tabpanel-${tab.id}`}
          aria-labelledby={tab.id}
          hidden={tab.id !== active}
          className="py-6"
        >
          {tab.id === active && tab.content}
        </div>
      ))}
    </div>
  );
}
