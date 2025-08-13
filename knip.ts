import { defineConfig } from 'knip';

export default defineConfig({
  workspaces: ['app', 'circuits', 'common', 'contracts', 'sdk/*', 'packages/*'],
});
