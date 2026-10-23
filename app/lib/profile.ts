import { supabase } from '@/app/lib/supabase';

export async function loadDisplayName(userId: string): Promise<string> {
  if (!supabase) return '';
  const { data: authData } = await supabase.auth.getUser();
  const metadataName = (authData.user?.user_metadata?.display_name as string | undefined) ?? '';
  const { data, error } = await supabase.from('profiles').select('display_name').eq('id', userId).maybeSingle();
  if (error) return metadataName;
  return (data?.display_name as string | null | undefined) ?? metadataName;
}

export async function saveDisplayName(userId: string, displayName: string): Promise<void> {
  if (!supabase) throw new Error('Supabase غير مهيأ.');
  const normalized = displayName.trim();
  if (!normalized) throw new Error('اكتب اسم صاحب الحساب.');
  const { error: authError } = await supabase.auth.updateUser({ data: { display_name: normalized } });
  if (authError) throw new Error(authError.message);
  const { error: profileError } = await supabase.from('profiles').upsert({ id: userId, display_name: normalized }, { onConflict: 'id' });
  if (profileError) return;
}
