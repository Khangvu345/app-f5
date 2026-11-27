import { EmptyState } from '@/components/ui/EmptyState';
import { Header } from '@/components/ui/Header';
import { Screen } from '@/components/ui/Screen';

export default function DiscoverScreen() {
  return (
    <Screen isFlush edges={['left', 'right']}>
      <Header title="Khám phá" />
      <EmptyState
        icon="sparkles-outline"
        title="Gợi ý quà bằng AI"
        description="Tính năng này sẽ sớm ra mắt. Bạn có thể lưu ý tưởng quà thủ công trong Bộ sưu tập."
      />
    </Screen>
  );
}
