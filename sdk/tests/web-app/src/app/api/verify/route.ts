import { SelfBackendVerifier } from '../../../../../../core';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { proof, publicSignals } = body;

        if (!proof || !publicSignals) {
            return NextResponse.json(
                { message: 'Proof and publicSignals are required' },
                { status: 400 }
            );
        }

        const configuredVerifier = new SelfBackendVerifier(
            'https://forno.celo.org',
            "self-workshop",
            'uuid',
            true
        ).setMinimumAge(20);

        const result = await configuredVerifier.verify(proof, publicSignals);
        console.log("Verification result:", result);

        if (result.isValid) {
            return NextResponse.json({
                status: 'success',
                result: result.isValid,
                credentialSubject: result.credentialSubject
            });
        } else {
            return NextResponse.json({
                status: 'error',
                result: result.isValid,
                message: 'Verification failed',
                details: result.isValidDetails
            }, { status: 400 });
        }
    } catch (error) {
        console.error('Error verifying proof:', error);
        return NextResponse.json({
            message: 'Error verifying proof',
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
