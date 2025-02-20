import { SelfBackendVerifier } from '../../core/src/SelfBackendVerifier';

export const createVerifier = (rpcUrl: string, scope: string) => {
    const verifier = new SelfBackendVerifier(rpcUrl, scope)
        .excludeCountries("Italy")

    return verifier;
};
