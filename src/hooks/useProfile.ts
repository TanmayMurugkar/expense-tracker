import { useCallback, useEffect, useState } from 'react';
import { fetchProfile, updateProfile } from '../services/profile';
import { Profile } from '../types';

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setProfile(await fetchProfile());
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (patch: Partial<Pick<Profile, 'full_name' | 'currency'>>) => {
      const updated = await updateProfile(patch);
      setProfile(updated);
      return updated;
    },
    [],
  );

  return { profile, loading, error, save, refetch: load };
}
