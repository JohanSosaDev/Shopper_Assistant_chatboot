#!/usr/bin/env node
/**
 * publish-tasks-to-github.mjs
 *
 * Toma la planning wave de `docs/tasks/` (formato OpenSymphony) y la publica
 * como Issues + Milestones en el repo GitHub actual.
 *
 * Uso:
 *   node scripts/publish-tasks-to-github.mjs --dry-run    # Preview sin tocar GitHub
 *   node scripts/publish-tasks-to-github.mjs              # Publish real
 *   node scripts/publish-tasks-to-github.mjs --close      # Cerrar issues con status: done
 *
 * Requiere: gh CLI instalado y autenticado contra el repo correcto.
 *
 * Side effects (publish real):
 *   - Crea milestones que no existan (reusa los que sí)
 *   - Crea labels priority:/estimation:/status: que no existan
 *   - Crea issues con title, body, milestone, labels
 *   - Updatea body con refs Blocked by/Blocks una vez que tiene los issue numbers
 *   - Si --close: cierra los issues con status:done (queda histórico)
 *   - Escribe `docs/tasks/github-publish.yaml` con mapping local task_id → issue_number
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const TASKS_DIR = join(REPO_ROOT, 'docs', 'tasks');
const OUTPUT_FILE = join(TASKS_DIR, 'github-publish.yaml');

const dryRun = process.argv.includes('--dry-run');
const closeAfter = process.argv.includes('--close');

const step = (m) => console.log(`\n→ ${m}`);
const ok = (m) => console.log(`  ✓ ${m}`);
const info = (m) => console.log(`  ${m}`);
const warn = (m) => console.log(`  ⚠ ${m}`);
const fail = (m) => { console.error(`  ✗ ${m}`); process.exit(1); };

// ─────────────────────────────────────────────────────────────────────────────
// Parsers minimales (frontmatter YAML simple)
// ─────────────────────────────────────────────────────────────────────────────

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]+?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([\w_-]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1].trim();
    let value = kv[2].trim();
    value = value.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim();
      value = inner
        ? inner.split(',').map((v) => v.trim().replace(/^["'](.*)["']$/, '$1')).filter(Boolean)
        : [];
    }
    fm[key] = value;
  }
  return fm;
}

function parseBody(content) {
  const m = content.match(/^---\n[\s\S]+?\n---\n([\s\S]+)$/);
  return m ? m[1].trim() : content;
}

function milestoneTitle(milestoneId) {
  // m1-foundation → "M1: Foundation"
  const m = milestoneId.match(/^m(\d+)-(.+)$/);
  if (!m) return milestoneId;
  const num = m[1];
  const name = m[2].split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  return `M${num}: ${name}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// gh wrappers
// ─────────────────────────────────────────────────────────────────────────────

function ghJSON(args) {
  const r = spawnSync('gh', args, { encoding: 'utf-8' });
  if (r.status !== 0) throw new Error(`gh ${args.join(' ')} failed: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

function ghExec(args, opts = {}) {
  const r = spawnSync('gh', args, { encoding: 'utf-8', ...opts });
  if (r.status !== 0 && !opts.allowFail) {
    throw new Error(`gh ${args.join(' ')} failed: ${r.stderr}`);
  }
  return r;
}

function ensureLabel(name) {
  ghExec(['label', 'create', name, '--force'], { allowFail: true, stdio: 'pipe' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

step('Verificando gh CLI');
try { execSync('gh --version', { stdio: 'pipe' }); ok('gh CLI disponible'); }
catch { fail('gh CLI no instalado. https://cli.github.com/'); }

try { execSync('gh auth status', { stdio: 'pipe' }); ok('gh autenticado'); }
catch { fail('gh NO autenticado. Corre: gh auth login'); }

// Verificar repo
let repoFull;
try {
  const r = ghJSON(['repo', 'view', '--json', 'nameWithOwner']);
  repoFull = r.nameWithOwner;
  ok(`Repo: ${repoFull}`);
} catch (e) {
  fail(`No se pudo identificar repo: ${e.message}`);
}

if (dryRun) {
  console.log('\n  [DRY RUN] — no se va a tocar GitHub\n');
}

// ─────────────────────────────────────────────────────────────────────────────

step('Leyendo task files de docs/tasks/');
const files = readdirSync(TASKS_DIR).filter((f) => /^\d{3}-.+\.md$/.test(f)).sort();
if (files.length === 0) fail('No se encontraron task files en docs/tasks/');

const tasks = files.map((f) => {
  const content = readFileSync(join(TASKS_DIR, f), 'utf-8');
  const fm = parseFrontmatter(content);
  if (!fm || !fm.id) {
    warn(`${f} sin frontmatter válido, skip`);
    return null;
  }
  return { ...fm, file: f, body: parseBody(content) };
}).filter(Boolean);

ok(`${tasks.length} tasks parseadas`);

// ─────────────────────────────────────────────────────────────────────────────

const milestoneIds = [...new Set(tasks.map((t) => t.milestone))].filter(Boolean);
step(`${milestoneIds.length} milestones identificados`);

const milestoneMap = new Map();

let existingMilestones = [];
if (!dryRun) {
  try {
    existingMilestones = ghJSON(['api', `repos/${repoFull}/milestones`, '--paginate']);
  } catch (e) {
    warn(`No se pudo listar milestones existentes: ${e.message}`);
  }
}

for (const mid of milestoneIds) {
  const title = milestoneTitle(mid);
  const existing = existingMilestones.find((m) => m.title === title);

  if (existing) {
    ok(`milestone existente: ${title} (#${existing.number})`);
    milestoneMap.set(mid, existing.number);
  } else if (dryRun) {
    info(`[dry] crear milestone: ${title}`);
    milestoneMap.set(mid, '<dry>');
  } else {
    try {
      const created = ghJSON([
        'api', `repos/${repoFull}/milestones`,
        '-X', 'POST',
        '-f', `title=${title}`,
        '-f', `description=Milestone agrupando tasks ${mid}`,
      ]);
      ok(`milestone creado: ${title} (#${created.number})`);
      milestoneMap.set(mid, created.number);
    } catch (e) {
      warn(`Falló creación milestone ${title}: ${e.message}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────

step('Creando labels necesarios');
const allLabels = new Set();
for (const t of tasks) {
  if (t.priority) allLabels.add(`priority:${t.priority}`);
  if (t.estimation) allLabels.add(`estimation:${String(t.estimation).toLowerCase()}`);
  if (t.status) allLabels.add(`status:${t.status}`);
}
for (const l of allLabels) {
  if (dryRun) { info(`[dry] ensure label: ${l}`); continue; }
  ensureLabel(l);
}
ok(`${allLabels.size} labels asegurados`);

// ─────────────────────────────────────────────────────────────────────────────

step('Creando issues');
const issueMap = new Map();

// listar issues existentes con label del task_id (para idempotencia)
let existingIssues = [];
if (!dryRun) {
  try {
    existingIssues = ghJSON(['issue', 'list', '--state', 'all', '--limit', '200', '--json', 'number,title,body,labels']);
  } catch (e) {
    warn(`No se pudo listar issues existentes: ${e.message}`);
  }
}

for (const task of tasks) {
  const title = task.title || `Task ${task.id}`;
  const taskIdMarker = `<!-- task-id: ${task.id} -->`;

  // skip si ya existe issue con marker
  const existing = existingIssues.find((i) => i.body?.includes(taskIdMarker));
  if (existing) {
    ok(`issue existente: ${title} (#${existing.number})`);
    issueMap.set(task.id, existing.number);
    continue;
  }

  const labels = [];
  if (task.priority) labels.push(`priority:${task.priority}`);
  if (task.estimation) labels.push(`estimation:${String(task.estimation).toLowerCase()}`);
  if (task.status) labels.push(`status:${task.status}`);

  const body = [
    taskIdMarker,
    '',
    task.body,
    task.closed_by_commit ? `\n---\nClosed by commit \`${task.closed_by_commit}\`` : '',
  ].join('\n');

  if (dryRun) {
    info(`[dry] issue: ${title} | labels=${labels.join(',')} | milestone=${milestoneMap.get(task.milestone)}`);
    issueMap.set(task.id, '<dry>');
    continue;
  }

  const args = ['issue', 'create', '--title', title, '--body', body];
  if (milestoneMap.get(task.milestone)) {
    args.push('--milestone', String(milestoneMap.get(task.milestone)));
  }
  for (const l of labels) args.push('--label', l);

  try {
    const r = ghExec(args, { stdio: 'pipe' });
    const url = r.stdout.trim();
    const num = parseInt(url.split('/').pop(), 10);
    ok(`issue creado: ${title} (#${num})`);
    issueMap.set(task.id, num);
  } catch (e) {
    warn(`Falló issue ${task.id}: ${e.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

step('Actualizando bodies con refs Blocked by/Blocks');
for (const task of tasks) {
  const num = issueMap.get(task.id);
  if (!num || num === '<dry>') {
    if (dryRun) info(`[dry] update refs en ${task.id}`);
    continue;
  }

  const blockedBy = Array.isArray(task.blockedBy) ? task.blockedBy : [];
  const blocks = Array.isArray(task.blocks) ? task.blocks : [];
  if (blockedBy.length === 0 && blocks.length === 0) continue;

  const refs = [];
  if (blockedBy.length > 0) {
    refs.push('## Blocked by');
    for (const d of blockedBy) {
      const depNum = issueMap.get(d);
      if (depNum) refs.push(`- Blocked by #${depNum} (\`${d}\`)`);
    }
  }
  if (blocks.length > 0) {
    refs.push('## Blocks');
    for (const d of blocks) {
      const depNum = issueMap.get(d);
      if (depNum) refs.push(`- Blocks #${depNum} (\`${d}\`)`);
    }
  }

  const taskIdMarker = `<!-- task-id: ${task.id} -->`;
  const newBody = [
    taskIdMarker,
    '',
    task.body,
    '',
    '---',
    '',
    refs.join('\n'),
    task.closed_by_commit ? `\n---\nClosed by commit \`${task.closed_by_commit}\`` : '',
  ].join('\n');

  try {
    ghExec(['issue', 'edit', String(num), '--body', newBody], { stdio: 'pipe' });
    ok(`refs actualizados en #${num}`);
  } catch (e) {
    warn(`No se pudieron actualizar refs en #${num}: ${e.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

if (closeAfter) {
  step('Cerrando issues con status: done');
  for (const task of tasks) {
    if (task.status !== 'done') continue;
    const num = issueMap.get(task.id);
    if (!num || num === '<dry>') continue;
    if (dryRun) { info(`[dry] cerrar #${num}`); continue; }
    try {
      ghExec(['issue', 'close', String(num), '--comment', `Closed via task package — implementación cerrada en commit \`${task.closed_by_commit ?? 'unknown'}\``], { stdio: 'pipe' });
      ok(`cerrado #${num}`);
    } catch (e) {
      warn(`No se pudo cerrar #${num}: ${e.message}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────

step('Guardando mapping local');
const lines = [
  '# Auto-generado por scripts/publish-tasks-to-github.mjs',
  '# NO editar a mano. Re-correr el script para refrescar.',
  '',
  `repo: ${repoFull}`,
  `dryRun: ${dryRun}`,
  `closeAfter: ${closeAfter}`,
  '',
  'milestones:',
];
for (const [id, num] of milestoneMap) lines.push(`  ${id}: ${num}`);
lines.push('', 'tasks:');
for (const [id, num] of issueMap) lines.push(`  ${id}: ${num}`);

writeFileSync(OUTPUT_FILE, lines.join('\n') + '\n');
ok(`Saved: ${OUTPUT_FILE}`);

console.log(`\nDone. ${tasks.length} tasks procesadas, ${milestoneMap.size} milestones.`);
if (dryRun) console.log('\nEste fue un DRY RUN — re-correr sin --dry-run para publicar.');
