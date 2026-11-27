import { useLocalSearchParams } from 'expo-router';

import { EventDetailScreen } from '@/features/events/components/EventDetailScreen';

export default function EventDetailRoute() {
  const { id, occurrence } = useLocalSearchParams<{ id: string; occurrence?: string }>();
  return <EventDetailScreen eventId={id} occurrenceId={occurrence} />;
}
