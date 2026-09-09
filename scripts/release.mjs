import { execSync } from 'node:child_process';
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

function run(command, options = {}) {
  return execSync(command, {
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
    ...options,
  }).trim();
}

function runInherit(command, options = {}) {
  execSync(command, {
    stdio: 'inherit',
    ...options,
  });
}

function extractChangelogSection(changelogContent, version) {
  const lines = changelogContent.split(/\r?\n/);
  const versionRegex = new RegExp(`^##\\s*\\[?${version.replace(/\\./g, '\\.')}\\]?`);
  const headerIndex = lines.findIndex((line) => versionRegex.test(line.trim()));

  if (headerIndex === -1) {
    return `Release v${version}`;
  }

  const nextHeaderRegex = /^##\s+\d+\.\d+\.\d+/;
  const relativeNextIndex = lines.slice(headerIndex + 1).findIndex((line) => nextHeaderRegex.test(line.trim()));

  const sectionLines = relativeNextIndex !== -1
    ? lines.slice(headerIndex + 1, headerIndex + 1 + relativeNextIndex)
    : lines.slice(headerIndex + 1);

  const section = sectionLines.join('\n').trim();
  return section.length > 0 ? section : `Release v${version}`;
}

async function createGitHubRelease({ version, tagName, notes, token }) {
  // Check if GitHub CLI is available
  let hasGh = false;
  try {
    execSync('gh --version', { stdio: 'ignore' });
    hasGh = true;
  } catch {
    hasGh = false;
  }

  if (hasGh) {
    console.log(`[release] Checking if release ${tagName} already exists via gh...`);
    try {
      execSync(`gh release view "${tagName}"`, { stdio: 'ignore' });
      console.log(`[release] Release ${tagName} already exists in GitHub Releases.`);
      return;
    } catch {
      console.log(`[release] Creating GitHub Release ${tagName} via gh...`);
      const tempNotesFile = resolve(process.cwd(), `.release-notes-${version}.tmp.md`);
      try {
        writeFileSync(tempNotesFile, notes, 'utf8');
        runInherit(`gh release create "${tagName}" --title "${tagName}" --notes-file "${tempNotesFile}"`);
        console.log(`[release] Release ${tagName} created successfully via gh.`);
      } catch (ghErr) {
        if (ghErr.message && (ghErr.message.includes('already exists') || ghErr.message.includes('already_exists'))) {
          console.log(`[release] Release ${tagName} already exists (caught during creation via gh).`);
        } else {
          console.warn(`[release] Warning creating release via gh: ${ghErr.message}`);
        }
      } finally {
        if (existsSync(tempNotesFile)) {
          unlinkSync(tempNotesFile);
        }
      }
      return;
    }
  }

  // Fallback to GitHub REST API if token is provided
  if (token) {
    console.log(`[release] gh CLI not available. Attempting release creation via GitHub REST API...`);

    // Determine repository owner and repo
    let repoSlug = process.env.GITHUB_REPOSITORY;
    if (!repoSlug) {
      try {
        const remoteUrl = run('git config --get remote.origin.url');
        const match = remoteUrl.match(/[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
        if (match) {
          repoSlug = `${match[1]}/${match[2]}`;
        }
      } catch {
        // Ignore error
      }
    }

    if (!repoSlug) {
      console.warn('[release] Could not determine repository for GitHub REST API release creation.');
      return;
    }

    try {
      const apiUrl = `https://api.github.com/repos/${repoSlug}/releases`;

      // Check existing release
      const checkRes = await fetch(`https://api.github.com/repos/${repoSlug}/releases/tags/${tagName}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'chil-release-script',
        },
      });

      if (checkRes.ok) {
        console.log(`[release] Release ${tagName} already exists according to GitHub API.`);
        return;
      }

      const createRes = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent': 'chil-release-script',
        },
        body: JSON.stringify({
          tag_name: tagName,
          name: tagName,
          body: notes,
          draft: false,
          prerelease: false,
        }),
      });

      if (!createRes.ok) {
        const errorText = await createRes.text();
        if (createRes.status === 422 && errorText.includes('already_exists')) {
          console.log(`[release] Release ${tagName} already exists according to GitHub API (422 already_exists).`);
          return;
        }
        console.warn(`[release] Failed to create GitHub release via API: ${createRes.status} ${errorText}`);
      } else {
        console.log(`[release] Release ${tagName} created successfully via GitHub REST API.`);
      }
    } catch (err) {
      console.warn('[release] Error calling GitHub REST API for release:', err.message);
    }
    return;
  }

  console.warn('[release] Neither gh CLI nor GITHUB_TOKEN/GH_TOKEN is available. Skipped GitHub Release creation.');
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const rootDir = process.cwd();
  const pkgPath = resolve(rootDir, 'package.json');
  const changelogPath = resolve(rootDir, 'CHANGELOG.md');

  if (!existsSync(pkgPath)) {
    throw new Error(`package.json not found at ${pkgPath}`);
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const version = pkg.version;
  const tagName = `v${version}`;

  console.log(`[release] Target version: ${version} (${tagName})`);

  let changelogContent = '';
  if (existsSync(changelogPath)) {
    changelogContent = readFileSync(changelogPath, 'utf8');
  }

  const notes = extractChangelogSection(changelogContent, version);
  console.log(`[release] Extracted release notes (${notes.length} characters)`);

  if (isDryRun) {
    console.log('[release] --dry-run enabled. Skipping git tagging, push, and release creation.');
    console.log('--- Release Notes Preview ---');
    console.log(notes);
    console.log('-----------------------------');
    return;
  }

  // 1. Tag locally if tag doesn't exist (also trigger changeset tag if needed)
  try {
    runInherit('npx changeset tag');
  } catch (err) {
    console.log(`[release] changeset tag output/warning: ${err.message}`);
  }

  let tagExistsLocally = false;
  try {
    const existingTags = run(`git tag -l "${tagName}"`);
    tagExistsLocally = existingTags.includes(tagName);
  } catch {
    tagExistsLocally = false;
  }

  if (!tagExistsLocally) {
    console.log(`[release] Creating local git tag: ${tagName}`);
    try {
      runInherit(`git tag -a "${tagName}" -m "Release ${tagName}"`);
    } catch (err) {
      console.warn(`[release] Tag creation warning: ${err.message}`);
    }
  } else {
    console.log(`[release] Local git tag ${tagName} already exists.`);
  }

  // 2. Push tag to origin if not already present on remote
  let remoteTagExists = false;
  try {
    const remoteTags = run(`git ls-remote --tags origin "refs/tags/${tagName}"`);
    remoteTagExists = remoteTags.includes(tagName);
  } catch {
    remoteTagExists = false;
  }

  if (!remoteTagExists) {
    try {
      console.log(`[release] Pushing tag ${tagName} to origin...`);
      runInherit(`git push origin "${tagName}"`);
    } catch (err) {
      console.warn(`[release] Push tag warning: ${err.message}`);
    }
  } else {
    console.log(`[release] Remote git tag ${tagName} already exists on origin.`);
  }

  // 3. Create GitHub Release
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  await createGitHubRelease({
    version,
    tagName,
    notes,
    token,
  });

  console.log(`[release] Release processing for ${tagName} complete.`);
}

main().catch((err) => {
  console.error('[release] Release failed:', err);
  process.exit(1);
});
