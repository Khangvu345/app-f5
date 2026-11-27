import { useLocalSearchParams } from 'expo-router';

import { EventFormScreen } from '@/features/events/components/EventFormScreen';

export default function EditEventRoute() {
  const { id, occurrence } = useLocalSearchParams<{ id: string; occurrence?: string }>();
  return <EventFormScreen eventId={id} occurrenceId={occurrence} />;
}
