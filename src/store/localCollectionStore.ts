import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from '../lib/safeStorage';
import { supabase } from '../lib/supabase';

export interface LocalCoin {
  id: number;
  name: string;
  country: string;
  year_start: number | null;
  year_end: number | null;
  front_image_url: string | null;
  back_image_url: string | null;
  mintage: number | null;
  composition: string | null;
  estimated_price_min: number | null;
  estimated_price_max: number | null;
  grade_label: string | null;
  grade_value: number | null;
  denomination: string | null;
  metal_composition_detailed: string | null;
  weight_grams: number | null;
  diameter_mm: number | null;
  thickness_mm: number | null;
  edge_type: string | null;
  designer: string | null;
  history_description: string | null;
  ai_opinion: string | null;
  created_at: string;
}

interface LocalCollectionState {
  generalCoinIds: number[];
  coins: LocalCoin[];
  snapHistoryIds: number[]; // IDs of scanned coins (for history)
  
  addCoinToGeneral: (coinId: number) => void;
  removeCoinFromGeneral: (coinId: number) => void;
  addCoin: (coin: LocalCoin) => void;
  getCoin: (coinId: number) => LocalCoin | undefined;
  addToSnapHistory: (coinId: number) => void;
  removeFromSnapHistory: (coinId: number) => void;
  getSnapHistory: () => LocalCoin[];
  
  syncToSupabase: (userId: string) => Promise<void>;
  clearAll: () => void;
  hasLocalData: () => boolean;
}

export const useLocalCollectionStore = create<LocalCollectionState>()(
  persist(
    (set, get) => ({
      generalCoinIds: [],
      coins: [],
      snapHistoryIds: [],

      addCoinToGeneral: (coinId: number) => {
        set((state) => {
          if (state.generalCoinIds.includes(coinId)) return state;
          return { generalCoinIds: [...state.generalCoinIds, coinId] };
        });
      },

      removeCoinFromGeneral: (coinId: number) => {
        set((state) => {
          const stillInHistory = state.snapHistoryIds.includes(coinId);
          return {
            generalCoinIds: state.generalCoinIds.filter((id) => id !== coinId),
            coins: stillInHistory
              ? state.coins
              : state.coins.filter((c) => c.id !== coinId),
          };
        });
      },

      addCoin: (coin: LocalCoin) => {
        set((state) => {
          const exists = state.coins.some((c) => c.id === coin.id);
          if (exists) return state;
          return { coins: [...state.coins, coin] };
        });
      },

      getCoin: (coinId: number) => {
        return get().coins.find((c) => c.id === coinId);
      },

      addToSnapHistory: (coinId: number) => {
        set((state) => {
          if (state.snapHistoryIds.includes(coinId)) return state;
          return { snapHistoryIds: [coinId, ...state.snapHistoryIds] };
        });
      },

      removeFromSnapHistory: (coinId: number) => {
        set((state) => {
          const stillInCollection = state.generalCoinIds.includes(coinId);
          return {
            snapHistoryIds: state.snapHistoryIds.filter((id) => id !== coinId),
            coins: stillInCollection
              ? state.coins
              : state.coins.filter((c) => c.id !== coinId),
          };
        });
      },

      getSnapHistory: () => {
        const { snapHistoryIds, coins } = get();
        return snapHistoryIds
          .map((id) => coins.find((c) => c.id === id))
          .filter((c): c is LocalCoin => c !== undefined);
      },

      syncToSupabase: async (userId: string) => {
        const { generalCoinIds, snapHistoryIds } = get();
        
        if (generalCoinIds.length === 0 && snapHistoryIds.length === 0) return;

        try {
          // Sync snap history - update scanned_by_user_id for all local coins
          if (snapHistoryIds.length > 0) {
            await supabase
              .from('coins')
              .update({ scanned_by_user_id: userId })
              .in('id', snapHistoryIds)
              .is('scanned_by_user_id', null);
          }

          // Sync collections
          if (generalCoinIds.length > 0) {
            const { data: existingCollection } = await supabase
              .from('collections')
              .select('id, coin_ids')
              .eq('user_id', userId)
              .eq('is_default', true)
              .single();

            if (existingCollection) {
              const mergedIds = Array.from(
                new Set([...existingCollection.coin_ids, ...generalCoinIds])
              );

              await supabase
                .from('collections')
                .update({ coin_ids: mergedIds, updated_at: new Date().toISOString() })
                .eq('id', existingCollection.id);
            } else {
              await supabase.from('collections').insert({
                user_id: userId,
                name: 'General',
                description: null,
                coin_ids: generalCoinIds,
                is_default: true,
              });
            }
          }

          // Clear local data after successful sync
          set({ generalCoinIds: [], coins: [], snapHistoryIds: [] });
        } catch (err) {
          console.error('Failed to sync local data:', err);
          throw err;
        }
      },

      clearAll: () => {
        set({ generalCoinIds: [], coins: [], snapHistoryIds: [] });
      },

      hasLocalData: () => {
        const { generalCoinIds, coins, snapHistoryIds } = get();
        return generalCoinIds.length > 0 || coins.length > 0 || snapHistoryIds.length > 0;
      },
    }),
    {
      name: 'local-collection-storage',
      storage: createJSONStorage(() => safeStorage),
    }
  )
);
