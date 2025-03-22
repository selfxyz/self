import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import ReactNativeBiometrics from 'react-native-biometrics';

async function fetchBiometricAvailablity(): Promise<boolean> {
  try {
    const { available } = await biometrics.isSensorAvailable();
    return available;
  } catch (error) {
    console.error('Error checking biometric availability:', error);
    return false;
  }
}

const biometrics = new ReactNativeBiometrics({
  allowDeviceCredentials: true,
});

interface AuthProviderProps extends PropsWithChildren {
  authenticationTimeoutinMs?: number;
}
type BiometricAvailablity =
  | 'unknown'
  | 'checking'
  | 'available'
  | 'unavailable';

interface IAuthContext {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  loginWithBiometrics: () => Promise<void>;
  biometricAvailablity: BiometricAvailablity;
}
export const AuthContext = createContext<IAuthContext>({
  isAuthenticated: false,
  isAuthenticating: false,
  loginWithBiometrics: () => Promise.resolve(),
  biometricAvailablity: 'unknown',
});

export const AuthProvider = ({
  children,
  authenticationTimeoutinMs = 15 * 60 * 1000,
}: AuthProviderProps) => {
  const [_, setAuthenticatedTimeout] =
    useState<ReturnType<typeof setTimeout>>();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [biometricAvailablity, setBiometricAvailablity] =
    useState<BiometricAvailablity>('unknown');

  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    fetchBiometricAvailablity();
  }, []);

  const loginWithBiometrics = useCallback(async () => {
    setIsAuthenticating(true);
    try {
      const { success, error } = await biometrics.simplePrompt({
        promptMessage: 'Confirm your identity to access the stored secret',
      });
      if (error) {
        // handle error
        throw error;
      }
      setBiometricAvailablity('available');
      if (!success) {
        // user canceled
        throw new Error('Canceled by user');
      }

      setIsAuthenticated(true);
      setAuthenticatedTimeout(previousTimeout => {
        if (previousTimeout) {
          clearTimeout(previousTimeout);
        }
        return setTimeout(
          () => setIsAuthenticated(false),
          authenticationTimeoutinMs,
        );
      });
    } finally {
      setIsAuthenticating(false);
    }
  }, [authenticationTimeoutinMs]);

  const state: IAuthContext = useMemo(
    () => ({
      isAuthenticated,
      isAuthenticating,
      loginWithBiometrics,
      biometricAvailablity,
    }),
    [
      isAuthenticated,
      isAuthenticating,
      loginWithBiometrics,
      biometricAvailablity,
    ],
  );

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
