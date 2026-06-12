import { deploySystemFixturesV2 } from "./deploymentV2";
import type { DeployedActors } from "./types";

export async function deploySystemFixtures(): Promise<DeployedActors> {
  // Legacy unit tests still import deploySystemFixtures; reuse the v2 fixture
  // and return the overlapping actor set expected by v1 tests.
  return (await deploySystemFixturesV2()) as unknown as DeployedActors;
}
