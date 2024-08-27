import io, { Socket } from 'socket.io-client';

export class ProofWebSocket {
    private socket: Socket;
    private callbacks: { [key: string]: (data: any) => void } = {};

    constructor(url: string) {
        this.socket = io(url);
        this.setupListeners();
    }

    private setupListeners() {
        this.socket.on('proof_generation_started', (data) => this.triggerCallback('proofGenerationStarted', data));
        this.socket.on('proof_generation_progress', (data) => this.triggerCallback('proofGenerationProgress', data));
        this.socket.on('proof_submitted', (data) => this.triggerCallback('proofSubmitted', data));
        this.socket.on('proof_verified', (data) => this.triggerCallback('proofVerified', data));
    }

    private triggerCallback(event: string, data: any) {
        if (this.callbacks[event]) {
            this.callbacks[event](data);
        }
    }

    on(event: string, callback: (data: any) => void) {
        this.callbacks[event] = callback;
    }

    emitProofGenerationStarted(userId: string) {
        this.socket.emit('proof_generation_started', { userId });
    }

    emitProofGenerationProgress(userId: string, progress: number) {
        this.socket.emit('proof_generation_progress', { userId, progress });
    }

    emitProofSubmitted(userId: string, proofId: string) {
        this.socket.emit('proof_submitted', { userId, proofId });
    }

    emitProofVerified(userId: string, proofId: string, isValid: boolean) {
        this.socket.emit('proof_verified', { userId, proofId, isValid });
    }

    disconnect() {
        this.socket.disconnect();
    }
}
