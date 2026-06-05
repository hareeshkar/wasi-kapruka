import { supabase } from './supabase';

// User profile shape — mirrors the user_profiles table.
// Optional fields use undefined so callers can detect "not set yet".
export type UserProfile = {
  user_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  preferred_language?: 'en' | 'si' | 'ta';
  date_of_birth?: string;        // ISO yyyy-mm-dd
  gender?: 'female' | 'male' | 'nonbinary' | 'prefer_not_to_say';
  city?: string;
  typical_recipient?: 'self' | 'partner' | 'parent' | 'child' | 'friend' | 'colleague' | 'other';
  interests?: string[];
  profile_complete?: boolean;
};

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('[profile] fetch failed', error.message);
    return null;
  }
  return (data as UserProfile) ?? null;
}

export async function updateProfile(
  userId: string,
  patch: Partial<UserProfile>
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) {
    console.error('[profile] update failed', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

// Which fields are still missing? Used by progressive profiling to decide
// what to ask next without being annoying.
export function missingEssentialFields(p: UserProfile | null): string[] {
  if (!p) return ['first_name', 'last_name', 'preferred_language'];
  const missing: string[] = [];
  if (!p.first_name) missing.push('first_name');
  if (!p.last_name)  missing.push('last_name');
  if (!p.preferred_language) missing.push('preferred_language');
  return missing;
}

export type OptionalProfileField = 'date_of_birth' | 'city' | 'typical_recipient' | 'gender';

export function missingOptionalFields(p: UserProfile | null): OptionalProfileField[] {
  if (!p) return ['date_of_birth', 'city', 'typical_recipient'];
  const missing: OptionalProfileField[] = [];
  if (!p.date_of_birth)     missing.push('date_of_birth');
  if (!p.city)              missing.push('city');
  if (!p.typical_recipient) missing.push('typical_recipient');
  if (!p.gender)            missing.push('gender');
  return missing;
}

// Age + life-stage helper — used by profileToContext to give the LLM a
// register/tone guide so it can match the user's age (your point: "talk like
// the same age user"). Generations follow the Gen Z / Millennial / Gen X /
// Boomer convention used in marketing.
export function computeAge(dob: string | undefined | null): number | null {
  if (!dob) return null;
  const ms = Date.now() - new Date(dob).getTime();
  if (ms < 0) return null;
  return Math.floor(ms / (365.25 * 24 * 3600 * 1000));
}

export function lifeStageForAge(age: number | null): string {
  if (age == null) return '';
  if (age < 13)  return 'child';
  if (age < 20)  return 'teen / student';
  if (age < 28)  return 'Gen Z — early career / university';
  if (age < 43)  return 'Millennial — mid-career / young family';
  if (age < 59)  return 'Gen X — established career / family';
  if (age < 75)  return 'Boomer — pre-retirement or retired';
  return 'senior';
}

// Compact text summary used by the LLM in the SESSION_CONTEXT block.
export function profileToContext(p: UserProfile | null): string {
  if (!p) return 'No profile yet (anonymous guest).';
  const parts: string[] = [];
  const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
  if (name) parts.push(`Name: ${name}`);
  if (p.preferred_language) parts.push(`Language: ${p.preferred_language}`);
  if (p.date_of_birth) {
    const age = computeAge(p.date_of_birth);
    if (age != null) {
      parts.push(`Age: ${age} (life stage: ${lifeStageForAge(age)})`);
      // Age-appropriate tone guide for the LLM
      parts.push(`Tone: ${age < 28 ? 'casual, internet-fluent, emojis welcome'
                          : age < 43 ? 'friendly, modern but not overly casual'
                          : age < 59 ? 'warm, professional, occasional emoji'
                          : 'respectful, clear, no slang'}`);
    }
  }
  if (p.gender) parts.push(`Gender: ${p.gender}`);
  if (p.city) parts.push(`City: ${p.city}`);
  if (p.typical_recipient) parts.push(`Typical recipient: ${p.typical_recipient}`);
  if (p.interests && p.interests.length) parts.push(`Interests: ${p.interests.join(', ')}`);
  return parts.length ? parts.join(' | ') : 'Empty profile.';
}
