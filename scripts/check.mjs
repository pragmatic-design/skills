#!/usr/bin/env node
// Validates the repository against the Agent Skills specification and keeps the README catalog in
// sync with the skills' frontmatter. Zero dependencies.
//
//   node scripts/check.mjs           check only; exit code 1 on any error
//   node scripts/check.mjs --write   also rewrite the README catalog from the frontmatter
//
// Spec: https://agentskills.io/specification

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const write = process.argv.includes('--write');
const errors = [];
const warnings = [];
const rel = (p) => relative(root, p).split(sep).join('/');

// The catalog groups, per plugin, in README order. Every skill must sit in exactly one group:
// a skill added upstream and not placed here fails the check instead of vanishing from the README.
const groups = {
  'pragmatic-design': [
    {
      title: 'Start here',
      skills: ['pragmatic-new-app', 'pragmatic-architecture', 'pragmatic-choose-modules', 'pragmatic-ecosystem', 'pragmatic-nuget-feed'],
    },
    {
      title: 'Domain and API',
      skills: ['pragmatic-use-persistence', 'pragmatic-use-actions-endpoints', 'pragmatic-use-foundation', 'pragmatic-use-composition', 'pragmatic-use-migrations', 'pragmatic-use-traits', 'pragmatic-use-client'],
    },
    {
      title: 'Identity and access',
      skills: ['pragmatic-use-identity', 'pragmatic-use-authorization', 'pragmatic-use-delegation', 'pragmatic-use-multitenancy'],
    },
    {
      title: 'Events, messaging and background work',
      skills: ['pragmatic-use-events', 'pragmatic-use-messaging', 'pragmatic-use-jobs', 'pragmatic-use-distributed'],
    },
    {
      title: 'Runtime concerns',
      skills: ['pragmatic-use-caching', 'pragmatic-use-configuration', 'pragmatic-use-feature-flags', 'pragmatic-use-resilience', 'pragmatic-use-logging', 'pragmatic-use-temporal', 'pragmatic-use-i18n'],
    },
    {
      title: 'Files, documents and communication',
      skills: ['pragmatic-use-storage', 'pragmatic-use-documents', 'pragmatic-use-imaging', 'pragmatic-use-email', 'pragmatic-use-notifications'],
    },
    {
      title: 'Compliance and quality',
      skills: ['pragmatic-use-audit', 'pragmatic-use-privacy', 'pragmatic-use-testing'],
    },
  ],
  pdxui: [
    {
      title: 'Start here',
      skills: ['pdxui-language', 'pdxui', 'pdxui-screens', 'pdxui-theme'],
    },
    {
      title: 'Components, one page per component',
      skills: ['pdxui-layout', 'pdxui-navigation', 'pdxui-data', 'pdxui-forms', 'pdxui-inputs', 'pdxui-overlay', 'pdxui-display', 'pdxui-infra'],
    },
    {
      title: 'Topics no single component covers',
      skills: ['pdxui-data-layer', 'pdxui-validation', 'pdxui-routing', 'pdxui-i18n', 'pdxui-setup', 'pdxui-testing'],
    },
  ],
};

// --- frontmatter -----------------------------------------------------------------------------

// Reads the flat `key: value` frontmatter the skills use. Not a YAML parser: a nested or
// multi-line value is reported as an error, so it cannot be misread silently.
function readFrontmatter(file) {
  const text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    errors.push(`${rel(file)}: no YAML frontmatter`);
    return { fields: {}, lines: text.split('\n').length };
  }
  const fields = {};
  for (const line of match[1].split('\n')) {
    if (line.trim() === '') continue;
    const kv = line.match(/^([a-z][a-z0-9-]*):\s*(.*)$/);
    if (!kv) {
      errors.push(`${rel(file)}: frontmatter line not understood: ${line}`);
      continue;
    }
    let value = kv[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = JSON.parse(value);
    else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1).replace(/''/g, "'");
    fields[kv[1]] = value;
  }
  return { fields, lines: text.split('\n').length };
}

// --- per-skill checks ------------------------------------------------------------------------

const nameRule = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function checkSkill(dir) {
  const file = join(dir, 'SKILL.md');
  const folder = dir.split(sep).pop();
  if (!existsSync(file)) {
    errors.push(`${rel(dir)}: no SKILL.md`);
    return null;
  }
  const { fields, lines } = readFrontmatter(file);
  const { name, description, compatibility } = fields;

  if (!name) errors.push(`${rel(file)}: missing name`);
  else {
    if (name.length > 64) errors.push(`${rel(file)}: name longer than 64 characters`);
    if (!nameRule.test(name)) errors.push(`${rel(file)}: name "${name}" must be lowercase letters, digits and single hyphens`);
    if (name !== folder) errors.push(`${rel(file)}: name "${name}" does not match its folder "${folder}"`);
  }
  if (!description) errors.push(`${rel(file)}: missing description`);
  else if (description.length > 1024) errors.push(`${rel(file)}: description is ${description.length} characters, max 1024`);
  if (compatibility !== undefined && (compatibility.length < 1 || compatibility.length > 500)) {
    errors.push(`${rel(file)}: compatibility must be 1-500 characters`);
  }
  if (lines > 500) warnings.push(`${rel(file)}: ${lines} lines, the spec recommends under 500`);

  return { name: name ?? folder, description: description ?? '' };
}

// --- relative links --------------------------------------------------------------------------

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== 'node_modules' && entry !== '.git') walk(full, out);
    } else if (entry.endsWith('.md')) out.push(full);
  }
  return out;
}

// Every relative link in a markdown file must point at a file that exists. Fenced code blocks and
// inline code are skipped: what is written there is code, not a link.
function checkLinks(file) {
  const text = readFileSync(file, 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/^(```|~~~)[\s\S]*?^\1/gm, '')
    .replace(/`[^`\n]*`/g, '');
  for (const m of text.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const target = m[1];
    if (/^([a-z]+:|#|\/)/i.test(target)) continue;
    const path = decodeURIComponent(target.split('#')[0]);
    if (path && !existsSync(resolve(dirname(file), path))) {
      errors.push(`${rel(file)}: broken link ${target}`);
    }
  }
}

// --- manifests -------------------------------------------------------------------------------

function checkManifests() {
  const marketplace = JSON.parse(readFileSync(join(root, '.claude-plugin/marketplace.json'), 'utf8'));
  for (const entry of marketplace.plugins) {
    const pluginDir = resolve(root, entry.source);
    const manifestPath = join(pluginDir, '.claude-plugin/plugin.json');
    if (!existsSync(manifestPath)) {
      errors.push(`marketplace.json: plugin "${entry.name}" has no ${rel(manifestPath)}`);
      continue;
    }
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (manifest.name !== entry.name) errors.push(`${rel(manifestPath)}: name "${manifest.name}", marketplace says "${entry.name}"`);
    if (manifest.version !== entry.version) {
      errors.push(`${rel(manifestPath)}: version ${manifest.version}, marketplace.json says ${entry.version}: an installed copy updates only when they agree and move`);
    }
  }
  return marketplace.plugins.map((p) => ({ name: p.name, dir: resolve(root, p.source) }));
}

// --- README catalog --------------------------------------------------------------------------

const cell = (s) => s.replace(/\|/g, '\\|').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function renderCatalog(plugin, skills) {
  const byName = new Map(skills.map((s) => [s.name, s]));
  const placed = new Set();
  const out = [];
  for (const group of groups[plugin] ?? []) {
    out.push(`**${group.title}**`, '', '| Skill | Use it when |', '|---|---|');
    for (const name of group.skills) {
      const skill = byName.get(name);
      if (!skill) {
        errors.push(`scripts/check.mjs: group "${group.title}" lists ${name}, which is not a skill of ${plugin}`);
        continue;
      }
      if (placed.has(name)) errors.push(`scripts/check.mjs: ${name} is in more than one group`);
      placed.add(name);
      out.push(`| [\`${name}\`](plugins/${plugin}/skills/${name}/SKILL.md) | ${cell(skill.description)} |`);
    }
    out.push('');
  }
  for (const s of skills) {
    if (!placed.has(s.name)) errors.push(`scripts/check.mjs: ${plugin} skill ${s.name} is in no catalog group`);
  }
  return out.join('\n').trimEnd();
}

function syncReadme(catalogs) {
  const readmePath = join(root, 'README.md');
  const original = readFileSync(readmePath, 'utf8').replace(/\r\n/g, '\n');
  let updated = original;
  for (const [plugin, body] of Object.entries(catalogs)) {
    const start = `<!-- catalog:${plugin}:start -->`;
    const end = `<!-- catalog:${plugin}:end -->`;
    const block = new RegExp(`${start}[\\s\\S]*?${end}`);
    if (!block.test(updated)) {
      errors.push(`README.md: missing the ${start} ... ${end} markers`);
      continue;
    }
    updated = updated.replace(block, `${start}\n<!-- generated by scripts/check.mjs --write from each SKILL.md; do not edit by hand -->\n\n${body}\n\n${end}`);
  }
  if (updated === original) return;
  if (write) {
    writeFileSync(readmePath, updated);
    console.log('README.md: catalog rewritten');
  } else {
    errors.push('README.md: the catalog differs from the skills\' frontmatter; run node scripts/check.mjs --write');
  }
}

// --- main ------------------------------------------------------------------------------------

const plugins = checkManifests();
const catalogs = {};
let skillCount = 0;
for (const plugin of plugins) {
  const skillsDir = join(plugin.dir, 'skills');
  const skills = readdirSync(skillsDir)
    .map((d) => join(skillsDir, d))
    .filter((d) => statSync(d).isDirectory())
    .map(checkSkill)
    .filter(Boolean);
  skillCount += skills.length;
  catalogs[plugin.name] = renderCatalog(plugin.name, skills);
}
syncReadme(catalogs);
const mdFiles = walk(root);
mdFiles.forEach(checkLinks);

for (const w of warnings) console.log(`warning  ${w}`);
for (const e of errors) console.log(`error    ${e}`);
console.log(`${plugins.length} plugins, ${skillCount} skills, ${mdFiles.length} markdown files: ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
