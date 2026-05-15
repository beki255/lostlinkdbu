import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const ANDROID_CLIENT_ID = '';
const IOS_CLIENT_ID = '';
const WEB_CLIENT_ID = '';

const useGoogleAuth = (onSuccess) => {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: WEB_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    selectAccount: true,
  });

  const signIn = async () => {
    try {
      const result = await promptAsync();
      if (result?.type === 'success') {
        const { id_token } = result.params;
        if (onSuccess) {
          await onSuccess(id_token);
        }
        return id_token;
      }
      return null;
    } catch (error) {
      throw error;
    }
  };

  return { signIn, isLoading: !request };
};

export default useGoogleAuth;
