import Elysia from 'elysia';

import { ContractsController } from './contracts/infrastructure/contracts.controller';

const routes = new Elysia({ prefix: 'api/v1' })
  .use(ContractsController);

export { routes as AppRoutes };