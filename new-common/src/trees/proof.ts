import { poseidon2 } from 'poseidon-lite';

import {
  CSCA_TREE_DEPTH,
  DSC_TREE_DEPTH,
  OFAC_TREE_LEVELS,
} from '../foundation/constants/circuit.js';

import { IMT } from '@openpassport/zk-kit-imt';
import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import type { SMT } from '@openpassport/zk-kit-smt';

export function generateMerkleProof(imt: LeanIMT, _index: number, maxleaf_depth: number) {
  const { siblings, index } = imt.generateProof(_index);
  const leaf_depth = siblings.length;
  const path: number[] = [];

  for (let i = 0; i < maxleaf_depth; i += 1) {
    path.push((index >> i) & 1);
    if (siblings[i] === undefined) {
      siblings[i] = BigInt(0);
    }
  }
  return { siblings, path, leaf_depth };
}

export function generateSMTProof(smt: SMT, leaf: bigint) {
  const { entry, matchingEntry, siblings, root } = smt.createProof(leaf);

  let closestleaf: bigint;
  if (!matchingEntry) {
    if (!entry[1]) {
      closestleaf = BigInt(0);
    } else {
      closestleaf = BigInt(entry[0]);
    }
  } else {
    closestleaf = BigInt(matchingEntry[0]);
  }

  siblings.reverse();
  while (siblings.length < OFAC_TREE_LEVELS) siblings.push(BigInt(0));

  return { root, closestleaf, siblings };
}

export function getDscTreeInclusionProof(
  leaf: string,
  serialized_dsc_tree: string | string[][],
): [string, number[], bigint[], number] {
  const hashFunction = (a: any, b: any) => poseidon2([a, b]);
  const tree = LeanIMT.import(hashFunction, serialized_dsc_tree as string);
  const index = tree.indexOf(BigInt(leaf));
  if (index === -1) {
    throw new Error('Your public key was not found in the registry');
  }
  const { siblings, path, leaf_depth } = generateMerkleProof(tree, index, DSC_TREE_DEPTH);
  return [tree.root as unknown as string, path, siblings, leaf_depth];
}

export function getCscaTreeInclusionProof(
  leaf: string,
  _serialized_csca_tree: string[][],
): [string, string[], string[]] {
  const tree = new IMT(poseidon2, CSCA_TREE_DEPTH, 0, 2);
  tree.setNodes(_serialized_csca_tree);
  const index = tree.indexOf(leaf);
  if (index === -1) {
    throw new Error('Your public key was not found in the registry');
  }
  const proof = tree.createProof(index);
  return [
    tree.root as string,
    proof.pathIndices.map((i: number) => i.toString()),
    proof.siblings.flat().map((sibling: any) => sibling.toString()),
  ];
}

export function getCscaTreeRoot(serialized_csca_tree: string[][]) {
  const tree = new IMT(poseidon2, CSCA_TREE_DEPTH, 0, 2);
  tree.setNodes(serialized_csca_tree);
  return tree.root;
}
