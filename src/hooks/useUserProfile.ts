import { useCallback, useEffect, useState } from 'react';
import {
  fetchProfile,
  updateProfile,
  missingOptionalFields,
  type UserProfile,
} from '../lib/user-profile';

export { missingOptionalFields };

type UseUserProfileResult = {
  profile: UserProfile | null;
  loading: boolean;
  save: (patch: Partial<UserProfile>) => Promise<{ ok: boolean; error?: string }>;
  refresh: () => Promise<void>;
};

export function useUserProfile(userId: string | null): UseUserProfileResult {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(!!userId);

  const refresh = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const p = await fetchProfile(userId);
    setProfile(p);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(async (patch: Partial<UserProfile>) => {
    if (!userId) return { ok: false, error: 'Not signed in' };
    const result = await updateProfile(userId, patch);
    if (result.ok) {
      setProfile(prev => (prev ? { ...prev, ...patch } : null));
    }
    return result;
  }, [userId]);

  return { profile, loading, save, refresh };
}
