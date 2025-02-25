import Elysia, { t } from 'elysia';
// import { SelfBackendVerifier } from "@selfxyz/core";
import { SelfBackendVerifier } from "../../../../../core/src/SelfBackendVerifier";

export const ContractsController = new Elysia()
  .post(
    'verify-vc-and-disclose-proof',
    async (request: any) => {
      try {
        const selfBackendVerifier = new SelfBackendVerifier(
          process.env.RPC_URL as string,
          process.env.SCOPE as string,
        );

        const result = await selfBackendVerifier.verify(
          request.body.proof,
          request.body.publicSignals
        );
        console.log(result);

        return {
          status: "success",
          result: result.isValid,
        };
      } catch (error) {
        return {
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    {
      body: t.Object({
        proof: t.Any(),
        publicSignals: t.Any(),
      }),
      response: {
        200: t.Object({
          status: t.String(),
          result: t.Boolean(),
        }),
        500: t.Object({
          status: t.String(),
          message: t.String(),
        }),
      },
      detail: {
        tags: ['Contracts'],
        summary: 'Verify a VC and disclose a proof',
        description: 'Verify a VC and disclose a proof',
      },
    },
  );
  