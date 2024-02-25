import * as fs from 'fs';
import { buildPubkeyTree } from '../../../common/src/utils/pubkeyTree'

async function main() {
  const pubkeys = JSON.parse(fs.readFileSync("../common/pubkeys/public_keys_parsed.json") as unknown as string)
  const tree = buildPubkeyTree(pubkeys);
  const serializedTree = tree.nodes.map(layer => layer.map(node => node.toString()));
  fs.writeFileSync("outputs/serialized_tree.json", JSON.stringify(serializedTree));
  fs.copyFileSync("outputs/serialized_tree.json", "../common/pubkeys/serialized_tree.json");
  fs.copyFileSync("outputs/serialized_tree.json", "../app/deployments/serialized_tree.json");
  console.log("serialized_tree.json written and copied in common/pubkeys and app/deployments!")
}

main()