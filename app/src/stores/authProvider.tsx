import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useState,
} from 'react';
import ReactNativeBiometrics from 'react-native-biometrics';

interface AuthProviderProps extends PropsWithChildren {
  authenticationTimeoutinMs?: number;
}
interface IAuthContext {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  loginWithBiometrics: () => Promise<void>;
}

export const AuthContext = createContext<IAuthContext>({
  isAuthenticated: false,
  isAuthenticating: false,
  loginWithBiometrics: () => Promise.resolve(),
});

const biometrics = new ReactNativeBiometrics({
  allowDeviceCredentials: true,
});

export const AuthProvider = ({
  children,
  authenticationTimeoutinMs = 15 * 60 * 1000,
}: AuthProviderProps) => {
  const [authenticatedTimeout, setAuthenticatedTimeout] =
    useState<ReturnType<typeof setTimeout>>();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const loginWithBiometrics = useCallback(async () => {
    setIsAuthenticating(true);
    const { success, error } = await biometrics.simplePrompt({
      promptMessage: 'Confirm your identity to access the stored secret',
    });
    if (error) {
      setIsAuthenticating(false);
      // handle error
      throw error;
    }
    if (!success) {
      // user canceled
      throw new Error('Canceled by user');
    }

    if (authenticatedTimeout) {
      clearTimeout(authenticatedTimeout);
    }
    setIsAuthenticating(false);
    setAuthenticatedTimeout(
      setTimeout(() => setIsAuthenticated(false), authenticationTimeoutinMs),
    );
  }, []);

  const state: IAuthContext = {
    isAuthenticated,
    isAuthenticating,
    loginWithBiometrics,
  };

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
};
