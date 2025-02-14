import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  scopes: ['https://www.googleapis.com/auth/drive.appdata'],
});

export async function googleSignIn() {
  try {
    await GoogleSignin.hasPlayServices();
    if ((await GoogleSignin.signInSilently()).type === 'success') {
      return await GoogleSignin.getTokens();
    }
    if ((await GoogleSignin.signIn()).type === 'success') {
      return await GoogleSignin.getTokens();
    }
    // user cancelled
    return null;
  } catch (error) {
    console.error(error);
    if (isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes.IN_PROGRESS:
          return null;
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new Error('GooglePlayServices not available');
      }
    }
    throw error;
  }
}
