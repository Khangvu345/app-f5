import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Text } from 'react-native';

import { env } from '@/config/env';
import { useAuthStore } from '@/store/auth.store';
import { toApiError } from '@/utils/api-error';

import { Button } from './Button';

function GoogleButton() {
  const providerLogin = useAuthStore((state) => state.providerLogin);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const handlePress = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const { GoogleSignin, isSuccessResponse } =
        await import('@react-native-google-signin/google-signin');
      GoogleSignin.configure({
        webClientId: env.googleWebClientId,
        iosClientId: env.googleIosClientId || undefined,
      });
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }
      const result = await GoogleSignin.signIn();
      if (!isSuccessResponse(result)) return;
      const token = result.data.idToken;
      if (!token) throw new Error('Không nhận được thông tin đăng nhập Google.');
      await providerLogin('google', token);
      router.replace('/(app)');
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <>
      <Button
        title="Tiếp tục với Google"
        variant="secondary"
        loading={isLoading}
        onPress={() => void handlePress()}
      />
      {error ? <Text>{error}</Text> : null}
    </>
  );
}

function AppleButton() {
  const providerLogin = useAuthStore((state) => state.providerLogin);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const handlePress = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const bytes = await Crypto.getRandomBytesAsync(32);
      const nonce = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
      const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
      const credential = await AppleAuthentication.signInAsync({ nonce: hash });
      if (!credential.identityToken) throw new Error('Không nhận được thông tin đăng nhập Apple.');
      await providerLogin('apple', credential.identityToken, nonce);
      router.replace('/(app)');
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <>
      <Button
        title="Tiếp tục với Apple"
        variant="secondary"
        loading={isLoading}
        onPress={() => void handlePress()}
      />
      {error ? <Text>{error}</Text> : null}
    </>
  );
}

export function ProviderLogin() {
  const isGoogleConfigured =
    Boolean(env.googleWebClientId) &&
    (Platform.OS === 'android' || (Platform.OS === 'ios' && Boolean(env.googleIosClientId)));
  return (
    <>
      {isGoogleConfigured ? <GoogleButton /> : null}
      {Platform.OS === 'ios' && env.appleEnabled ? <AppleButton /> : null}
    </>
  );
}
