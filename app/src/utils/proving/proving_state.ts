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
import { generateTeeInputsVCAndDisclose } from './inputs';
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
    selfApp: SelfApp | null;
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
    _handleWsOpen: () => void;
    _handleWsError: (error: Event) => void;
    _handleWsClose: (event: CloseEvent) => void;
}

export const useProvingStore = create<ProvingState>((set, get) => {
    let actor: AnyActorRef | null = null;
    let actorId: string | null = null;

    function setupActorSubscriptions(newActor: AnyActorRef, id: string) {
        console.log(`[ProvingState] Setting up subscriptions for actor ${id}`);
        newActor.subscribe((state: any) => {
            console.log(`[ProvingState Actor ${id}] State transition: ${state.value}`);
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
                if (get().circuitType === 'disclose') {
                    circuitName = 'disclose';
                    wsRpcUrl = WS_RPC_URL_VC_AND_DISCLOSE;
                } else {
                    circuitName = getCircuitNameFromPassportData(passportData, get().circuitType as 'register' | 'dsc');
                    if (get().circuitType === 'register') {
                        wsRpcUrl = circuitsMapping?.REGISTER?.[circuitName];
                    }
                    else {
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
        selfApp: null,

        _handleWebSocketMessage: async (event: MessageEvent) => {
            if (!actor) {
                console.error('Cannot process message: State machine not initialized.');
                return;
            }
            // console.log('Received WebSocket message:', event.data);
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
                const currentActor = actor;
                if (get().currentState === 'ready_to_prove' && currentActor) {
                    console.error('SocketIO disconnected unexpectedly during proof listening.');
                    currentActor.send({ type: 'PROVE_ERROR' });
                }
                set({ socketConnection: null });
            });

            socket.on('connect_error', (error) => {
                console.error('SocketIO connection error:', error);
                actor!.send({ type: 'PROVE_ERROR' });
                set({ socketConnection: null });
            });

        },

        _handleWsOpen: () => {
            if (!actor) { return; }
            const ws = get().wsConnection;
            if (!ws) { return; }

            console.log('TEE WebSocket open, sending hello...');
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
            ws.send(JSON.stringify(helloBody));
        },

        _handleWsError: (error: Event) => {
            console.error('TEE WebSocket error event:', error);
            if (!actor) { return; }
            get()._handleWebSocketMessage(new MessageEvent('error', { data: JSON.stringify({ error: 'WebSocket connection error' }) }));
        },

        _handleWsClose: (event: CloseEvent) => {
            console.log(`TEE WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
            if (!actor) { return; }
            const currentState = get().currentState;
            if (currentState === 'init_tee_connexion' || currentState === 'proving' || currentState === 'listening_for_status') {
                console.error(`TEE WebSocket closed unexpectedly during ${currentState}.`);
                get()._handleWebSocketMessage(new MessageEvent('error', { data: JSON.stringify({ error: 'WebSocket closed unexpectedly' }) }));
            }
            if (get().wsConnection) {
                set({ wsConnection: null });
            }
        },

        init: async (circuitType: 'dsc' | 'disclose', selfApp: SelfApp | null = null) => {
            console.log('[ProvingState] init called');
            get().closeConnections();

            if (actor) {
                try {
                    console.log(`[ProvingState] Stopping existing actor ${actorId}`);
                    actor.stop();
                    console.log(`[ProvingState] Stopped existing actor ${actorId}`);
                } catch (error) {
                    console.error(`[ProvingState] Error stopping actor ${actorId}:`, error);
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

            actorId = v4();
            actor = createActor(provingMachine);
            console.log(`[ProvingState] Created new actor ${actorId}`);
            setupActorSubscriptions(actor, actorId);
            actor.start();
            console.log(`[ProvingState] Started new actor ${actorId}`);

            const passportDataAndSecretStr = await loadPassportDataAndSecret();
            if (!passportDataAndSecretStr) {
                actor!.send({ type: 'ERROR' });
                return;
            }

            const passportDataAndSecret = JSON.parse(passportDataAndSecretStr);
            const { passportData, secret } = passportDataAndSecret;

            set({ passportData, secret });
            set({ circuitType });
            console.log('selfApp in the init function', selfApp);
            set({ selfApp });
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
                const { passportData, secret, circuitType } = get();
                const isSupported = await checkPassportSupported(passportData);
                if (isSupported.status !== 'passport_supported') {
                    console.log('Passport not supported:', isSupported.status, isSupported.details);
                    if (navigationRef.isReady()) {
                        navigationRef.navigate('UnsupportedPassport');
                    }
                    await clearPassportData();
                    actor!.send({ type: 'VALIDATION_ERROR' });
                    return;
                }

                const isRegistered = await isUserRegistered(passportData, secret as string);
                if (circuitType === 'disclose') {
                    if (isRegistered) {
                        actor!.send({ type: 'VALIDATION_SUCCESS' });
                        return;
                    }
                    else {
                        // TODO: show the screen 'are you new here?'
                    }
                }
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
                    console.log('[ProvingState] DSC is registered, setting circuit type to register');
                    set({ circuitType: 'register' });
                }
                else {
                    console.log('[ProvingState] DSC is not registered');
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
            get().closeConnections();

            return new Promise((resolve) => {
                const ws = new WebSocket(wsRpcUrl);
                set({ wsConnection: ws });

                const handleConnectSuccess = () => resolve(true);
                const handleConnectError = () => resolve(false);

                ws.addEventListener('message', get()._handleWebSocketMessage);
                ws.addEventListener('open', get()._handleWsOpen);
                ws.addEventListener('error', get()._handleWsError);
                ws.addEventListener('close', get()._handleWsClose);

                if (!actor) { return; }
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
            _checkActorInitialized(actor);
            const { wsConnection, sharedKey, uuid: currentUuid, passportData, secret } = get();

            if (get().currentState !== 'ready_to_prove') {
                console.error('Cannot start proving: Not in ready_to_prove state.');
                return;
            }
            if (!wsConnection || !sharedKey || !passportData || !secret) {
                console.error('Cannot start proving: Missing wsConnection, sharedKey, passportData, or secret.');
                actor!.send({ type: 'PROVE_ERROR' });
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
                        circuitName = 'vc_and_disclose';
                        const selfApp = get().selfApp;
                        inputs = generateTeeInputsVCAndDisclose(
                            secret,
                            passportData,
                            selfApp as SelfApp,
                        ).inputs;
                        endpointType = selfApp?.endpointType;
                        endpoint = selfApp?.endpoint;
                        break;
                    default:
                        console.error('Invalid circuit type:', get().circuitType);
                        throw new Error('Invalid circuit type');
                }
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
                wsConnection.send(JSON.stringify(submitBody));
                actor!.send({ type: 'START_PROVING' });
            } catch (error) {
                console.error('Error during startProving preparation/send:', error);
                actor!.send({ type: 'PROVE_ERROR' });
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
            const { circuitType } = get();
            console.log(`[ProvingState Actor ${actorId}] Post-proving for circuit type: ${circuitType}`);
            if (circuitType === 'dsc') {
                actor!.send({ type: 'SWITCH_TO_REGISTER' });
            } else if (circuitType === 'register') {
                actor!.send({ type: 'COMPLETED' });
                navigationRef.navigate('AccountVerifiedSuccess');
            }
            else if (circuitType === 'disclose') {
                actor!.send({ type: 'COMPLETED' });
            }
        },

        closeConnections: () => {
            console.log(`[ProvingState Actor ${actorId}] 🧹 Cleaning up connections`);

            const ws = get().wsConnection;
            if (ws) {
                console.log(`[ProvingState Actor ${actorId}] Removing WebSocket listeners...`);
                try {
                    ws.removeEventListener('message', get()._handleWebSocketMessage);
                    ws.removeEventListener('open', get()._handleWsOpen);
                    ws.removeEventListener('error', get()._handleWsError);
                    ws.removeEventListener('close', get()._handleWsClose);

                    console.log(`[ProvingState Actor ${actorId}] Closing WebSocket connection...`);
                    ws.close();
                    console.log(`[ProvingState Actor ${actorId}] Closed WebSocket connection.`);
                } catch (error) {
                    console.error(`[ProvingState Actor ${actorId}] Error removing listeners or closing WebSocket:`, error);
                }
                set({ wsConnection: null });
            }

            const socket = get().socketConnection;
            if (socket) {
                console.log('Removing Socket.IO listeners...');
                socket.close();
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
