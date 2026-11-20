import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  migrationRecoveryCopy,
  showMigrationRecovery,
} from '../js/state/migration-recovery-ui.js';

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.id = '';
    this.className = '';
    this.type = '';
    this._text = '';
  }
  set textContent(value) { this._text = String(value); }
  get textContent() { return this._text + this.children.map((child) => child.textContent).join(''); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  append(...children) { this.children.push(...children); }
  addEventListener(type, listener) { this.listeners[type] = listener; }
  click() { this.listeners.click?.(); }
  focus() { this.focused = true; }
  querySelector(selector) {
    if (selector.toUpperCase() === this.tagName) return this;
    for (const child of this.children) {
      const match = child.querySelector(selector);
      if (match) return match;
    }
    return null;
  }
}

class FakeDocument {
  constructor() { this.body = new FakeElement('body'); }
  createElement(tagName) { return new FakeElement(tagName); }
  getElementById(id) {
    const find = (node) => {
      if (node.id === id) return node;
      for (const child of node.children) {
        const match = find(child);
        if (match) return match;
      }
      return null;
    };
    return find(this.body);
  }
}

function buttons(node) {
  const found = [];
  for (const child of node.children || []) {
    if (child.tagName === 'BUTTON') found.push(child);
    found.push(...buttons(child));
  }
  return found;
}

test('migration recovery copy distinguishes a future schema', () => {
  const copy = migrationRecoveryCopy({ fromVersion: 8, toVersion: 8 });
  assert.match(copy.message, /newer version/i);
  assert.match(copy.message, /update/i);
});

test('migration recovery blocks startup with an accessible retry action', () => {
  const document = new FakeDocument();
  let reloads = 0;
  const dialog = showMigrationRecovery(
    { fromVersion: 2, toVersion: 3 },
    document,
    () => { reloads++; },
  );

  assert.equal(dialog.getAttribute('role'), 'alertdialog');
  assert.equal(dialog.getAttribute('aria-modal'), 'true');
  assert.match(dialog.textContent, /stopped before saving any changes/i);
  dialog.querySelector('button').click();
  assert.equal(reloads, 1);

  assert.equal(
    showMigrationRecovery({}, document, () => {}),
    dialog,
    'repeated failures must not stack recovery dialogs',
  );
});

test('corrupt recovery offers an export and a two-step fresh start', () => {
  const document = new FakeDocument();
  let fresh = 0;
  const dialog = showMigrationRecovery(
    { corrupt: true },
    document,
    () => {},
    { getRawState: () => '{broken', onStartFresh: () => { fresh++; } },
  );

  assert.match(dialog.textContent, /could not read the saved file/i);
  const controls = buttons(dialog);
  assert.equal(controls.length, 3, 'Retry, export and fresh-start are all offered');
  assert.equal(controls[1].textContent, 'Export a copy');

  assert.equal(controls[2].textContent, 'Start fresh (erases this copy)');
  controls[2].click();
  assert.equal(fresh, 0, 'the first tap only arms the destructive action');
  assert.match(controls[2].textContent, /Tap again/);
  controls[2].click();
  assert.equal(fresh, 1);
});
