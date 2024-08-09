import * as fs from 'fs';
import { buildPubkeyTree } from '../../../common/src/utils/pubkeyTree'
import { computeLeafFromModulus, getCSCAModulusMerkleTree } from '../../../common/src/utils/csca'
import { CSCA_AKI_MODULUS, CSCA_TREE_DEPTH, k_csca, n_csca } from '../../../common/src/constants/constants';
import { IMT } from '@zk-kit/imt';
import { poseidon1, poseidon2 } from 'poseidon-lite';
import { splitToWords } from '../../../common/src/utils/utils';

async function serialize_old_dsc_modulus_tree() {
  const pubkeys = JSON.parse(fs.readFileSync("../common/pubkeys/public_keys_parsed.json") as unknown as string)
  const tree = buildPubkeyTree(pubkeys);
  const serializedTree = tree.nodes.map(layer => layer.map(node => node.toString()));
  fs.writeFileSync("outputs/serialized_tree.json", JSON.stringify(serializedTree));
  fs.copyFileSync("outputs/serialized_tree.json", "../common/pubkeys/serialized_tree.json");
  console.log("serialized_tree.json written and copied in common/pubkeys!")
}


serialize_old_dsc_modulus_tree()