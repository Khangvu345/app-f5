import { useLocalSearchParams } from 'expo-router';

import { GiftFormScreen } from '@/features/gifts/components/GiftFormScreen';

export default function NewGiftRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <GiftFormScreen giftId={id} />;
}
