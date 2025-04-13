import { create } from 'zustand';
import { createMachine, createActor, AnyActorRef } from 'xstate';
import { v4 } from 'uuid';
import { useProtocolStore } from '../../stores/protocolStore';
import forge from 'node-forge';
import io, { Socket } from 'socket.io-client';
import { getPublicKey, verifyAttestation } from './attest';
import { checkPassportSupported, isUserRegistered, isPassportNullified } from './payload';
import { loadPassportDataAndSecret, clearPassportData } from '../../stores/passportDataProvider';
import { navigationRef } from '../../Navigation';
import { EndpointType, SelfApp } from '../../../../common/src/utils/appType';
import { getCircuitNameFromPassportData } from '../../../../common/src/utils/circuits/circuitsName';
import { clientKey, clientPublicKeyHex, getPayload, encryptAES256GCM, getWSDbRelayerUrl, checkIfPassportDscIsInTree } from './provingTypes';
import { ec } from './provingTypes';
import { WS_RPC_URL_VC_AND_DISCLOSE } from '../../../../common/src/constants/constants';
import { generateCircuitInputsDSC, generateCircuitInputsRegister } from '../../../../common/src/utils/circuits/generateInputs';
const provingMachine = createMachine({
    id: 'proving',
    initial: 'idle',
    states: {
        idle: {
            on: {
                FETCH_DATA: 'fetching_data',
                ERROR: 'error',
            },
        },
        fetching_data: {
            on: {
                FETCH_SUCCESS: 'validating_passport',
                FETCH_ERROR: 'error',
            },
        },
        validating_passport: {
            on: {
                VALIDATION_SUCCESS: 'init_tee_connexion',
                VALIDATION_ERROR: 'error',
                ALREADY_REGISTERED: 'completed',
            },
        },
        init_tee_connexion: {
            on: {
                CONNECT_SUCCESS: 'ready_to_prove',
                CONNECT_ERROR: 'error',
            },
        },
        ready_to_prove: {
            on: { START_PROVING: 'proving' },
        },
        proving: {
            on: {
                PROVE_SUCCESS: 'post_proving',
                PROVE_ERROR: 'error',
            },
        },
        post_proving: {
            on: {
                SWITCH_TO_REGISTER: 'fetching_data',
                COMPLETED: 'completed',
            },
        },
        completed: {
            type: 'final',
        },
        error: {
            type: 'final',
        },
    },
});

interface ProvingState {
    currentState: string;
    attestation: any;
    serverPublicKey: string | null;
    sharedKey: Buffer | null;
    wsConnection: WebSocket | null;
    socketConnection: Socket | null;
    uuid: string | null;
    userConfirmed: boolean;
    passportData: any | null;
    secret: string | null;
    circuitType: 'register' | 'dsc' | 'disclose' | null;
    init: (circuitType: 'dsc' | 'disclose', selfApp: SelfApp | null) => Promise<void>;
    startFetchingData: () => Promise<void>;
    validatePassport: () => Promise<void>;
    initTeeConnection: (wsRpcUrl: string) => Promise<boolean>;
    startProving: () => Promise<void>;
    postProving: () => void;
    setUserConfirmed: () => void;
    closeConnections: () => void;
    _handleWebSocketMessage: (event: MessageEvent) => Promise<void>;
    _startSocketIOStatusListener: (receivedUuid: string, endpointType: EndpointType) => void;
}

export const useProvingStore = create<ProvingState>((set, get) => {
    let actor: AnyActorRef | null = null;

    function setupActorSubscriptions(newActor: AnyActorRef) {
        newActor.subscribe((state: any) => {
            set({ currentState: state.value as string });

            if (state.value === 'fetching_data') {
                get().startFetchingData();
            }
            if (state.value === 'validating_passport') {
                get().validatePassport();
            }

            if (state.value === 'init_tee_connexion') {
                const protocolStore = useProtocolStore.getState();
                const circuitsMapping = protocolStore.passport.circuits_dns_mapping as any;
                const passportData = get().passportData;

                let circuitName = null;
                let wsRpcUrl = null;
                if (get().circuitType === 'disclose') { // TODO: refactor this inside the getCircuitNameFromPassportData function
                    circuitName = 'disclose';
                    wsRpcUrl = WS_RPC_URL_VC_AND_DISCLOSE;
                } else {
                    circuitName = getCircuitNameFromPassportData(passportData, get().circuitType as 'register' | 'dsc');
                    if (get().circuitType === 'register') {
                        console.log(circuitsMapping?.REGISTER);
                        wsRpcUrl = circuitsMapping?.REGISTER?.[circuitName];
                    }
                    else {
                        console.log(circuitsMapping?.DSC);
                        wsRpcUrl = circuitsMapping?.DSC?.[circuitName];
                    }
                }
                if (!circuitName) {
                    console.error('Could not determine circuit name');
                    actor?.send({ type: 'CONNECT_ERROR' });
                    return;
                }
                if (wsRpcUrl) {
                    console.log('Automatically starting TEE connection with URL:', wsRpcUrl);
                    get().initTeeConnection(wsRpcUrl);
                } else {
                    console.error('No WebSocket URL available for TEE connection');
                    actor?.send({ type: 'CONNECT_ERROR' });
                }
            }

            if (state.value === 'ready_to_prove' && get().userConfirmed) {
                console.log('User already confirmed, starting proving automatically');
                get().startProving();
            }

            if (state.value === 'post_proving') {
                get().postProving();
            }
        });
    }

    return {
        currentState: 'idle',
        attestation: null,
        serverPublicKey: null,
        sharedKey: null,
        wsConnection: null,
        socketConnection: null,
        uuid: null,
        userConfirmed: false,
        passportData: null,
        secret: null,
        circuitType: null,

        _handleWebSocketMessage: async (event: MessageEvent) => {
            if (!actor) {
                console.error('Cannot process message: State machine not initialized.');
                return;
            }
            console.log('Received WebSocket message:', event.data);
            try {
                const result = JSON.parse(event.data);

                if (result.result?.attestation) {
                    console.log('Processing attestation response...');
                    const attestationData = result.result.attestation;
                    const sessionUuid = result.result.uuid;
                    set({ attestation: attestationData, uuid: sessionUuid });

                    const serverPubkey = getPublicKey(attestationData);
                    const verified = await verifyAttestation(attestationData);

                    if (!verified) {
                        console.error('Attestation verification failed');
                        actor!.send({ type: 'CONNECT_ERROR' });
                        return;
                    }

                    const serverKey = ec.keyFromPublic(serverPubkey as string, 'hex');
                    const derivedKey = clientKey.derive(serverKey.getPublic());

                    set({
                        serverPublicKey: serverPubkey,
                        sharedKey: Buffer.from(derivedKey.toArray('be', 32)),
                    });
                    console.log('Attestation verified, shared key derived, session UUID stored:', sessionUuid);
                    actor!.send({ type: 'CONNECT_SUCCESS' });
                } else if (result.id === 2 && typeof result.result === 'string' && !result.error) {
                    const statusUuid = result.result;
                    if (get().uuid !== statusUuid) {
                        console.warn(`Received status UUID (${statusUuid}) does not match stored UUID (${get().uuid}). Using received UUID.`);
                    }
                    const { passportData } = get();
                    if (!statusUuid) {
                        console.error('Cannot start Socket.IO listener: UUID missing from state or response.');
                        actor!.send({ type: 'PROVE_ERROR' });
                        return;
                    }
                    if (!passportData) {
                        console.error('Cannot start Socket.IO listener: passportData missing from state.');
                        actor!.send({ type: 'PROVE_ERROR' });
                        return;
                    }
                    actor!.send({ type: 'SUBMIT_SUCCESS' });

                    const socketEndpointType = passportData.documentType === 'passport' ? 'celo' : 'staging_celo';
                    get()._startSocketIOStatusListener(statusUuid, socketEndpointType);
                } else if (result.error) {
                    console.error('Received error from TEE:', result.error);
                    actor!.send({ type: 'PROVE_ERROR' });
                } else {
                    console.warn('Received unknown message format from TEE:', result);
                }

            } catch (error) {
                console.error('Error processing WebSocket message:', error);
                if (get().currentState === 'init_tee_connexion') {
                    actor!.send({ type: 'CONNECT_ERROR' });
                } else {
                    actor!.send({ type: 'PROVE_ERROR' });
                }
            }
        },

        _startSocketIOStatusListener: (receivedUuid: string, endpointType: EndpointType) => {
            if (!actor) {
                console.error('Cannot start Socket.IO listener: Actor not available.');
                return;
            }

            console.log(`Attempting to connect Socket.IO for UUID: ${receivedUuid}`);
            const url = getWSDbRelayerUrl(endpointType);
            let socket: Socket | null = io(url, {
                path: '/',
                transports: ['websocket'],
            });
            set({ socketConnection: socket });

            socket.on('connect', () => {
                console.log('SocketIO: Connection opened');
                socket?.emit('subscribe', receivedUuid);
                console.log(`SocketIO: Subscribed to UUID: ${receivedUuid}`);
            });

            socket.on('status', (message: any) => {
                const data =
                    typeof message === 'string' ? JSON.parse(message) : message;
                console.log('SocketIO status message:', data);
                if (data.status === 3 || data.status === 5) {
                    console.log('Proof generation/verification failed (status 3 or 5).');
                    actor!.send({ type: 'PROVE_ERROR' });
                    socket?.disconnect();
                    set({ socketConnection: null });
                } else if (data.status === 4) {
                    console.log('Proof verified (status 4).');
                    socket?.disconnect();
                    set({ socketConnection: null });
                    actor!.send({ type: 'PROVE_SUCCESS' });

                } else {
                    console.log(`SocketIO: Received intermediate status ${data.status}`);
                }
            });

            socket.on('disconnect', (reason: string) => {
                console.log(`SocketIO disconnected. Reason: ${reason}`);
                const currentActor = actor; // Store actor locally
                // Check state and ensure actor exists before sending
                if (get().currentState === 'ready_to_prove' && currentActor) {
                    console.error('SocketIO disconnected unexpectedly during proof listening.');
                    currentActor.send({ type: 'PROVE_ERROR' });
                }
                set({ socketConnection: null }); // Clean up reference
            });

            socket.on('connect_error', (error) => {
                console.error('SocketIO connection error:', error);
                actor!.send({ type: 'PROVE_ERROR' });
                set({ socketConnection: null });
            });

        },

        init: async (circuitType: 'dsc' | 'disclose', _selfApp: SelfApp | null = null) => {
            get().closeConnections();
            if (actor) {
                try {
                    actor.stop();
                    console.log('Stopped existing state machine actor');
                } catch (error) {
                    console.error('Error stopping actor:', error);
                }
            }
            set({
                currentState: 'idle',
                attestation: null,
                serverPublicKey: null,
                sharedKey: null,
                wsConnection: null,
                socketConnection: null,
                uuid: null,
                userConfirmed: false,
                passportData: null,
                secret: null,
            });

            actor = createActor(provingMachine);
            setupActorSubscriptions(actor);
            actor.start();

            const passportDataAndSecretStr = await loadPassportDataAndSecret();
            if (!passportDataAndSecretStr) {
                actor!.send({ type: 'ERROR' });
                return;
            }

            const passportDataAndSecret = JSON.parse(passportDataAndSecretStr);
            const { passportData, secret } = passportDataAndSecret;

            set({ passportData, secret });
            set({ circuitType });
            actor.send({ type: 'FETCH_DATA' });
        },

        startFetchingData: async () => {
            _checkActorInitialized(actor);
            try {
                const { passportData } = get();
                const env = passportData.documentType && passportData.documentType !== 'passport' ? 'stg' : 'prod';
                await useProtocolStore.getState().passport.fetch_all(env);
                actor!.send({ type: 'FETCH_SUCCESS' });
            } catch (error) {
                console.error('Error fetching data:', error);
                actor!.send({ type: 'FETCH_ERROR' });
            }
        },

        validatePassport: async () => {
            _checkActorInitialized(actor);
            try {
                const { passportData, secret } = get();
                const isSupported = await checkPassportSupported(passportData);
                if (isSupported.status !== 'passport_supported') {
                    console.log('Passport not supported:', isSupported.status, isSupported.details);
                    // TODO: we have to fire a mixpanel event here
                    if (navigationRef.isReady()) {
                        navigationRef.navigate('UnsupportedPassport');
                    }
                    await clearPassportData();
                    actor!.send({ type: 'VALIDATION_ERROR' });
                    return;
                }

                const isRegistered = await isUserRegistered(passportData, secret as string);
                if (isRegistered) {
                    if (navigationRef.isReady()) {
                        navigationRef.navigate('AccountVerifiedSuccess');
                    }
                    actor!.send({ type: 'ALREADY_REGISTERED' });
                    return;
                }

                const isNullifierOnchain = await isPassportNullified(passportData);
                if (isNullifierOnchain) {
                    console.log('Passport is nullified, but not registered with this secret. Navigating to AccountRecoveryChoice');
                    if (navigationRef.isReady()) {
                        navigationRef.navigate('AccountRecoveryChoice');
                    }
                    actor!.send({ type: 'ALREADY_REGISTERED' });
                    return;
                }
                const isDscRegistered = await checkIfPassportDscIsInTree(passportData);
                if (isDscRegistered) {
                    console.log('DSC is registered, setting circuit type to register');
                    set({ circuitType: 'register' });
                }
                else {
                    console.log('DSC is not registered');
                }
                actor!.send({ type: 'VALIDATION_SUCCESS' });
            } catch (error) {
                console.error('Error validating passport:', error);
                actor!.send({ type: 'VALIDATION_ERROR' });
            }
        },

        initTeeConnection: async (wsRpcUrl: string): Promise<boolean> => {
            _checkActorInitialized(actor);

            console.log(`Attempting TEE connection to ${wsRpcUrl}`);
            const ws = get().wsConnection;
            if (ws) {
                ws.close();
                set({ wsConnection: null });
            }

            return new Promise((resolve) => {
                const ws = new WebSocket(wsRpcUrl);
                set({ wsConnection: ws });

                const handleConnectSuccess = () => resolve(true);
                const handleConnectError = () => resolve(false);

                ws.addEventListener('message', get()._handleWebSocketMessage);

                ws.addEventListener('open', () => {
                    const connectionUuid = v4();
                    const helloBody = {
                        jsonrpc: '2.0',
                        method: 'openpassport_hello',
                        id: 1,
                        params: {
                            user_pubkey: [4, ...Array.from(Buffer.from(clientPublicKeyHex, 'hex'))],
                            uuid: connectionUuid,
                        },
                    };
                    console.log('TEE WebSocket open, sending hello:', helloBody);
                    ws.send(JSON.stringify(helloBody));
                });

                ws.addEventListener('error', (error) => {
                    console.error('TEE WebSocket error:', error);
                    get()._handleWebSocketMessage(new MessageEvent('error', { data: JSON.stringify({ error: 'WebSocket connection error' }) }));
                    handleConnectError();
                });

                ws.addEventListener('close', (event) => {
                    console.log(`TEE WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
                    if (get().currentState === 'init_tee_connexion') {
                        console.error('TEE WebSocket closed unexpectedly during connection.');
                        get()._handleWebSocketMessage(new MessageEvent('error', { data: JSON.stringify({ error: 'WebSocket closed unexpectedly' }) }));
                        handleConnectError();
                    }
                });

                if (!actor) {
                    console.error('Cannot subscribe to actor changes: Actor not initialized.');
                    handleConnectError();
                    return;
                }
                const unsubscribe = actor.subscribe((state) => {
                    if (state.matches('ready_to_prove')) {
                        handleConnectSuccess();
                        unsubscribe.unsubscribe();
                    } else if (state.matches('error')) {
                        handleConnectError();
                        unsubscribe.unsubscribe();
                    }
                });
            });
        },

        startProving: async () => {
            if (!actor) {
                console.error('Cannot start proving: State machine not initialized.');
                return;
            }
            const { wsConnection, sharedKey, uuid: currentUuid, passportData, secret } = get();

            if (get().currentState !== 'ready_to_prove') {
                console.error('Cannot start proving: Not in ready_to_prove state.');
                return;
            }
            if (!wsConnection || !sharedKey || !passportData || !secret) {
                console.error('Cannot start proving: Missing wsConnection, sharedKey, passportData, or secret.');
                actor.send({ type: 'PROVE_ERROR' });
                return;
            }

            console.log('Starting proving process (sending submit request)...');
            try {
                let inputs = null;
                let circuitName = null;
                let endpointType = null;
                let endpoint = null;
                const protocolStore = useProtocolStore.getState();
                switch (get().circuitType) {
                    case 'register':
                        inputs = generateCircuitInputsRegister(
                            secret,
                            passportData,
                            protocolStore.passport.dsc_tree,
                        );
                        circuitName = getCircuitNameFromPassportData(passportData, 'register');
                        endpointType = passportData.documentType && passportData.documentType !== 'passport' ? 'staging_celo' : 'celo';
                        endpoint = 'https://self.xyz';
                        break;
                    case 'dsc':
                        inputs = generateCircuitInputsDSC(
                            passportData.dsc,
                            protocolStore.passport.csca_tree,
                        );
                        circuitName = getCircuitNameFromPassportData(passportData, 'dsc');
                        endpointType = passportData.documentType && passportData.documentType !== 'passport' ? 'staging_celo' : 'celo';
                        endpoint = 'https://self.xyz';
                        break;
                    case 'disclose':
                        // circuitName ='disclose;
                        break;
                    default:
                        console.error('Invalid circuit type:', get().circuitType);
                        throw new Error('Invalid circuit type');
                }


                // const endpointType = passportData.documentType && passportData.documentType !== 'passport' ? 'staging_celo' : 'celo';
                // console.log('Generating circuit inputs for registration...');
                // const { inputs, circuitName } = await generateTeeInputsRegister(
                //     secret,
                //     passportData,
                //     endpointType
                // );
                // if (!circuitName) {
                //     throw new Error('Could not determine circuit name');
                // }

                // console.log('Creating TEE payload...');
                const payload = getPayload(
                    inputs,
                    get().circuitType as 'register' | 'dsc' | 'disclose',
                    circuitName as string,
                    endpointType as EndpointType,
                    endpoint as string
                );

                console.log('Encrypting payload...');
                const forgeKey = forge.util.createBuffer(sharedKey.toString('binary'));
                const encryptionData = encryptAES256GCM(
                    JSON.stringify(payload),
                    forgeKey,
                );

                console.log('Sending submit request...');
                const submitBody = {
                    jsonrpc: '2.0',
                    method: 'openpassport_submit_request',
                    id: 2,
                    params: {
                        uuid: currentUuid,
                        ...encryptionData,
                    },
                };
                console.log('Truncated submit body:', submitBody);
                wsConnection.send(JSON.stringify(submitBody));
                actor.send({ type: 'START_PROVING' });
            } catch (error) {
                console.error('Error during startProving preparation/send:', error);
                actor.send({ type: 'PROVE_ERROR' });
            }
        },

        setUserConfirmed: () => {
            set({ userConfirmed: true });
            if (get().currentState === 'ready_to_prove') {
                get().startProving();
            }
        },

        postProving: () => {
            _checkActorInitialized(actor);
            if (get().circuitType === 'dsc') {
                actor!.send({ type: 'SWITCH_TO_REGISTER' });
            } else {
                actor!.send({ type: 'COMPLETED' });
                navigationRef.navigate('AccountVerifiedSuccess');

            }
        },

        closeConnections: () => {
            console.log('🧹 Cleaning up connections');

            const ws = get().wsConnection;
            if (ws) {
                try {
                    ws.close();
                    console.log('Closed WebSocket connection.');
                } catch (error) {
                    console.error('Error closing WebSocket:', error);
                }
                set({ wsConnection: null });
            }

            const socket = get().socketConnection;
            if (socket) {
                try {
                    socket.disconnect();
                    console.log('Disconnected Socket.IO.');
                } catch (error) {
                    console.error('Error disconnecting Socket.IO:', error);
                }
                set({ socketConnection: null });
            }

            set({
                attestation: null,
                serverPublicKey: null,
                sharedKey: null,
                uuid: null,
            });
        },
    };
});


function _checkActorInitialized(actor: AnyActorRef | null) {
    if (!actor) {
        throw new Error('State machine not initialized. Call init() first.');
    }
}
