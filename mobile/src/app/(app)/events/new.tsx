import { useLocalSearchParams } from 'expo-router';

import { EventFormScreen } from '@/features/events/components/EventFormScreen';

export default function NewEventRoute() {
  const { recipientId } = useLocalSearchParams<{ recipientId?: string }>();
  return <EventFormScreen initialRecipientId={recipientId} />;
}
