import { FrameLocator, Locator, Page } from '@playwright/test';
import { locators } from '../locators/locators';

// Either the page itself, or the iframe the user switched into.
export type Scope = Page | FrameLocator;

// A target that starts like this is treated as a selector and used as written.
const SELECTOR_LIKE = /^(css=|xpath=|text=|id=|data-testid=|role=|#|\.|\/\/|\[)/;

/**
 * 1. A name from src/locators/locators.ts  -> its selector
 * 2. Something that looks like a selector  -> used as is
 * 3. Anything else                         -> undefined (the caller falls back to text matching)
 */
function explicit(scope: Scope, target: string): Locator | undefined {
  const mapped = locators[target];
  if (mapped) return scope.locator(mapped);
  if (SELECTOR_LIKE.test(target)) return scope.locator(target);
  return undefined;
}

/** Buttons, links, or any element whose visible text is exactly `target`. */
export function clickable(scope: Scope, target: string): Locator {
  return (
    explicit(scope, target) ??
    scope
      .getByRole('button', { name: target, exact: true })
      .or(scope.getByRole('link', { name: target, exact: true }))
      .or(scope.getByText(target, { exact: true }))
      .first()
  );
}

/** Inputs, text areas and checkboxes, found by label, placeholder or accessible name. */
export function field(scope: Scope, target: string): Locator {
  return (
    explicit(scope, target) ??
    scope
      .getByLabel(target)
      .or(scope.getByPlaceholder(target))
      .or(scope.getByRole('textbox', { name: target }))
      .first()
  );
}

/** <select> dropdowns, found by label or accessible name. */
export function dropdown(scope: Scope, target: string): Locator {
  return (
    explicit(scope, target) ??
    scope.getByLabel(target).or(scope.getByRole('combobox', { name: target })).first()
  );
}

/** Any element, for checks and waits. Plain text matches elements containing that text. */
export function element(scope: Scope, target: string): Locator {
  return explicit(scope, target) ?? scope.getByText(target).first();
}

/** The selector of an iframe: a locator name, or the selector as written. */
export function frameSelector(target: string): string {
  return locators[target] ?? target;
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
