import { cpSync, mkdirSync, rmSync, renameSync } from 'node:fs';

const src = 'dist';
const staging = '_hosted';
const dest = 'dist';

mkdirSync(`${staging}/v1`, { recursive: true });
cpSync(src, `${staging}/v1`, { recursive: true });
rmSync(src, { recursive: true, force: true });
renameSync(staging, dest);
