import fetch from 'node-fetch';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

function usage() {
  console.error(
    'Usage: GITHUB_TOKEN=xxx yarn coderabbit:comments <pr-url-or-number> [output-file]',
  );
  process.exit(1);
}

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('GITHUB_TOKEN is required');
  process.exit(1);
}

const arg = process.argv[2];
if (!arg) usage();

let owner: string;
let repo: string;
let number: number;

if (/^https?:\/\//.test(arg)) {
  const match = arg.match(/github\.com[/:]([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) {
    console.error('Could not parse repository info from URL');
    process.exit(1);
  }
  owner = match[1];
  repo = match[2].replace(/\.git$/, '');
  number = parseInt(match[3], 10);
} else if (/^\d+$/.test(arg)) {
  number = parseInt(arg, 10);
  let remote = '';
  try {
    remote = execSync('git config --get remote.origin.url').toString().trim();
  } catch {
    console.error('Could not determine repository from git remote');
    process.exit(1);
  }
  const match = remote.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  if (!match) {
    console.error('Could not determine repository from git remote');
    process.exit(1);
  }
  owner = match[1];
  repo = match[2];
} else {
  usage();
}

const outputFile = process.argv[3];

const query = `
  query($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        reviewThreads(first: 100, states: [UNRESOLVED]) {
          nodes {
            comments(first: 100) {
              nodes {
                author { login }
                body
                path
                line
                originalLine
              }
            }
          }
        }
      }
    }
  }
`;

(async () => {
  try {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query,
        variables: { owner, name: repo, number },
      }),
    });
    const json: any = await response.json();
    const threads = json.data.repository.pullRequest.reviewThreads
      .nodes as any[];
    const comments: { path: string; line: number | null; body: string }[] = [];
    for (const thread of threads) {
      for (const comment of thread.comments.nodes) {
        if (comment.author?.login === 'coderabbit[bot]') {
          comments.push({
            path: comment.path,
            line: comment.line ?? comment.originalLine ?? null,
            body: comment.body.trim(),
          });
        }
      }
    }
    const formatted = comments
      .map(c => `${c.path}:${c.line ?? '?'}\n${c.body}`)
      .join('\n\n');
    if (outputFile) {
      writeFileSync(outputFile, formatted);
    } else {
      console.log(formatted);
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
