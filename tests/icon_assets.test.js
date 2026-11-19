// =============================================================================
// APP ICON CONTRACT
//
// The launcher once shipped a 1408×768 rectangular card in every icon slot.
// These checks keep the source vector and every generated launcher size square,
// present, and referenced by the manifest.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function pngInfo(file) {
  const buffer = readFileSync(path.join(ROOT, file));
  assert.equal(buffer.toString('ascii', 1, 4), 'PNG', `${file} is not a PNG`);
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const colorType = buffer.readUInt8(25);
  return { width, height, colorType };
}

test('web icons are square at their declared sizes', () => {
  for (const [file, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['icon-maskable-512.png', 512]]) {
    const info = pngInfo(file);
    assert.equal(info.width, size, file);
    assert.equal(info.height, size, file);
    assert.ok(info.colorType === 2 || info.colorType === 6, `${file} must be a full-colour PNG`);
  }
});

test('the manifest references the generated web icons', () => {
  const manifest = JSON.parse(readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
  const anyIcons = manifest.icons.filter((icon) => icon.purpose === 'any').map((icon) => icon.src);
  assert.deepEqual(anyIcons, ['./icon-192.png', './icon-512.png']);
  assert.equal(manifest.icons.find((icon) => icon.purpose === 'maskable')?.src, './icon-maskable-512.png');
  for (const icon of manifest.icons) {
    assert.ok(existsSync(path.join(ROOT, icon.src)), `${icon.src} is missing`);
    const [w, h] = icon.sizes.split('x').map(Number);
    assert.equal(w, h, `${icon.src} must be square`);
    const info = pngInfo(icon.src);
    assert.equal(info.width, w);
    assert.equal(info.height, h);
  }
});

test('every Android legacy and round icon is square', () => {
  const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const [density, size] of Object.entries(densities)) {
    for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
      const file = `android/app/src/main/res/mipmap-${density}/${name}`;
      const info = pngInfo(file);
      assert.equal(info.width, size, file);
      assert.equal(info.height, size, file);
      assert.ok(info.colorType === 2 || info.colorType === 6, `${file} must be a full-colour PNG`);
    }
  }
});

test('the adaptive foreground is a transparent 432px canvas', () => {
  const file = 'android/app/src/main/res/drawable/ic_launcher_foreground.png';
  const info = pngInfo(file);
  assert.equal(info.width, 432);
  assert.equal(info.height, 432);
  assert.equal(info.colorType, 6, 'adaptive foreground must be RGBA/transparent');
});

test('the vector source remains the single icon source', () => {
  const source = readFileSync(path.join(ROOT, 'assets/brand/icon.svg'), 'utf8');
  assert.match(source, /viewBox="0 0 1024 1024"/);
  assert.match(source, /#a3e635/);
  assert.match(source, /#22d3ee/);
});
