import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { supabaseSecureStorage } from '@/shared/secure-storage';
import { getSupabaseConfig } from './config';
import type { Database } from './database.types';

let client: SupabaseClient<Database> | null = null;
let isAutoRefreshListenerRegistered = false;

const registerAutoRefreshListener = (supabase: SupabaseClient<Database>): void => {
  if (Platform.OS === 'web' || isAutoRefreshListenerRegistered) {
    return;
  }

  const syncAutoRefresh = (state: AppStateStatus): void => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  };

  syncAutoRefresh(AppState.currentState);
  AppState.addEventListener('change', syncAutoRefresh);
  isAutoRefreshListenerRegistered = true;
};

export const getSupabaseClient = (): SupabaseClient<Database> => {
  if (client) {
    return client;
  }

  const config = getSupabaseConfig();

  client = createClient<Database>(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
      persistSession: true,
      storage: supabaseSecureStorage,
    },
  });

  registerAutoRefreshListener(client);

  return client;
};
