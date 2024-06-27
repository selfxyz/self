import * as fs from 'fs';
import { buildPassTree} from '../../../common/src/utils/passportTree'

async function passport() {
  const passports = JSON.parse(fs.readFileSync("../common/ofacdata/passport.json") as unknown as string)
  const tree = buildPassTree(passports);
  
  const serializedTree = tree.nodes.map(layer => layer.map(node => node.toString()));
  fs.writeFileSync("outputs/passport_tree.json", JSON.stringify(serializedTree));
  console.log("passport_tree.json written and copied in common/pubkeys!")
}

passport()