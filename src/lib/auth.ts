import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export type AuthResult = { ok: true } | { ok: false; error: string };

export async function signInWithApple(): Promise<AuthResult> {
  if (Platform.OS !== 'ios') {
    return { ok: false, error: 'Apple Sign In is only available on iOS' };
  }
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) {
      return { ok: false, error: 'No identity token from Apple' };
    }
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    if (error) return { ok: false, error: error.message };

    // Apple only provides name on first sign in — save it to user_metadata
    if (data.user && credential.fullName) {
      const givenName = credential.fullName.givenName || '';
      const familyName = credential.fullName.familyName || '';
      const fullName = [givenName, familyName].filter(Boolean).join(' ');
      if (fullName) {
        await supabase.auth.updateUser({
          data: { full_name: fullName },
        });
      }
    }

    return { ok: true };
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === 'ERR_REQUEST_CANCELED') {
      return { ok: false, error: 'Canceled' };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Apple sign in failed',
    };
  }
}

export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    const redirectUrl = getRedirectUrl();
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });
    if (oauthError) return { ok: false, error: oauthError.message };
    if (!data?.url) return { ok: false, error: 'No OAuth URL' };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl, {
      preferEphemeralSession: false,
    });

    if (result.type !== 'success' || !result.url) {
      return { ok: false, error: result.type === 'cancel' ? 'Canceled' : 'No redirect URL' };
    }

    const url = result.url;
    const hash = url.includes('#') ? url.split('#')[1] : '';
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (!access_token || !refresh_token) {
      return { ok: false, error: 'Missing tokens in redirect' };
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (sessionError) return { ok: false, error: sessionError.message };
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Google sign in failed',
    };
  }
}

function getRedirectUrl(): string {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }
  return 'coinsnap://auth/callback';
}
