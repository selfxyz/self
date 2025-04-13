import { PassportData } from '../../../../common/src/utils/types';
import { useProtocolStore } from '../../stores/protocolStore';
import { generateTeeInputsRegister } from './inputs';
import { useProvingStore } from './proving_state';


export async function init_register_passport(passportData: PassportData, secret: string) {
    const provingStore = useProvingStore.getState();

    // Only proceed if we're in the right state
    if (provingStore.currentState !== 'init_tee_connexion') {
        console.error('Cannot initialize TEE connection - not in the correct state');
        return false;
    }

    const endpointType = passportData.documentType === 'passport' ? 'celo' : 'staging_celo';

    const { inputs, circuitName } = await generateTeeInputsRegister(
        secret,
        passportData,
        endpointType
    );

    // Get the WebSocket URL from the protocol store
    const wsRpcUrl = (useProtocolStore.getState().passport.circuits_dns_mapping as any).REGISTER[circuitName];

    // Connect to the TEE
    const connected = await provingStore.initTeeConnection(wsRpcUrl);

    return connected;
}
