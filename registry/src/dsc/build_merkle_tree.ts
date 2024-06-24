import * as fs from 'fs';
import { buildPubkeyTree } from '../../../common/src/utils/pubkeyTree'
import { getCSCAModulusMerkleTree } from '../../../common/src/utils/csca'
import { k_csca, n_csca } from '../../../common/src/constants/constants';

async function serialize_old_dsc_modulus_tree() {
  const pubkeys = JSON.parse(fs.readFileSync("../common/pubkeys/public_keys_parsed.json") as unknown as string)
  const tree = buildPubkeyTree(pubkeys);
  const serializedTree = tree.nodes.map(layer => layer.map(node => node.toString()));
  fs.writeFileSync("outputs/serialized_tree.json", JSON.stringify(serializedTree));
  fs.copyFileSync("outputs/serialized_tree.json", "../common/pubkeys/serialized_tree.json");
  console.log("serialized_tree.json written and copied in common/pubkeys!")
}

async function serialize_new_csca_modulus_tree() {
  const tree = getCSCAModulusMerkleTree(n_csca, k_csca);
  const serializedTree = tree.nodes.map(layer => layer.map(node => node.toString()));
  fs.writeFileSync("outputs/serialized_csca_tree.json", JSON.stringify(serializedTree));
  fs.copyFileSync("outputs/serialized_csca_tree.json", "../common/pubkeys/serialized_csca_tree.json");
  console.log("serialized_csca_tree.json written and copied in common/pubkeys!")
}

serialize_new_csca_modulus_tree()