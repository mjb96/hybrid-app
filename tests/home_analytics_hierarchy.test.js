import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const indexHTML = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const dashboardSource = await readFile(new URL('../js/dashboard.js', import.meta.url), 'utf8');

test('This week leads Home, then the compact Today card', () => {
  const weekAt = indexHTML.indexOf('id="homeWeekStrip"');
  const todayAt = indexHTML.indexOf('id="homeTodayCard"');
  const weekEnd = indexHTML.indexOf('</section>', weekAt);
  assert.ok(weekAt > 0, 'Home renders the week strip');
  assert.ok(todayAt > weekAt, 'Today follows the week strip');
  assert.ok(todayAt < weekEnd, 'Today is part of the same week surface');
  assert.match(indexHTML, /class="home-week__rail" data-home-card="weekStrip"/);
  assert.match(indexHTML, /Pinned: the strip may be hidden in Customize/);
  assert.match(indexHTML, /id="homeQuickActions"/);
  assert.doesNotMatch(indexHTML, /id="strengthBarChart"/);
  assert.doesNotMatch(indexHTML, /id="runBarChart"/);
  assert.doesNotMatch(indexHTML, />In Focus</);
});

test('Home removes the repeated At-a-Glance grid', () => {
  assert.doesNotMatch(indexHTML, /id="glanceGrid"/);
  assert.doesNotMatch(indexHTML, />At a Glance</);
});

test('the dormant tile catalogue no longer defines a Home tile selection', () => {
  assert.doesNotMatch(dashboardSource, /HOME_TILE_IDS/);
});
