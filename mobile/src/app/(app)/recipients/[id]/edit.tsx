import { useLocalSearchParams } from 'expo-router';

import { RecipientFormScreen } from '@/features/recipients/components/RecipientFormScreen';

export default function EditRecipientRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RecipientFormScreen recipientId={id} />;
}
