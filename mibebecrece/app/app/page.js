import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import AppDashboard from '../../components/AppDashboard';

export default async function AppPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/iniciar-sesion');

  const { data: baby } = await supabase
    .from('baby_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!baby) redirect('/onboarding');

  return <AppDashboard baby={baby} userEmail={user.email} />;
}
