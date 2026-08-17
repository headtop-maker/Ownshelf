import { Redirect } from 'expo-router';
import { useAppSelector } from '@/app-store';
import { LibraryPage } from '@/pages/library';

export default function Index() {
  const onboardingSeen = useAppSelector((s) => s.settings?.onboardingSeen);
  if (!onboardingSeen) return <Redirect href="/onboarding" />;
  return <LibraryPage />;
}
