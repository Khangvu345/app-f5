import { useLocalSearchParams } from 'expo-router';

import { RecipientProfileScreen } from '@/features/recipients/components/RecipientProfileScreen';

export default function RecipientProfileRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RecipientProfileScreen recipientId={id} />;
}
