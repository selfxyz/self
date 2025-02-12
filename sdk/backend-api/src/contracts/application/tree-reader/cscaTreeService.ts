import serialized_csca_tree from '../../../../../../common/pubkeys/serialized_csca_tree.json';
import { IMT } from '@openpassport/zk-kit-imt';
import { poseidon2 } from 'poseidon-lite';
import { CSCA_TREE_DEPTH } from '../../../../../../common/src/constants/constants';
import { getContractInstanceRoot } from './getTree';

export async function getCscaTree() {
    let tree = new IMT(poseidon2, CSCA_TREE_DEPTH, 0, 2);
    tree.setNodes(serialized_csca_tree);
    const localRoot = tree.root;
    const contractRoot = await getContractInstanceRoot('csca');
    if (localRoot !== contractRoot) {
        throw new Error('CSCA tree root is different from contract root');
    }
    return serialized_csca_tree.toString();
}