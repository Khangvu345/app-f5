import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState, Header, Loading, Screen, Chip } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { colors, fonts, fontSize, spacing } from '@/theme';

import { useGiftsStore } from '../store/gifts.store';
import type { Gift, GiftTransitionInput } from '../types/gifts.types';
import { GIFT_TABS, tabOfStatus } from '../utils/giftStatus';
import type { GiftTab } from '../utils/giftStatus';

import { FollowUpPrompt } from './FollowUpPrompt';
import { GiftCard } from './GiftCard';
import { GiftStatusSheet } from './GiftStatusSheet';
import { SegmentedControl } from './SegmentedControl';

const EMPTY_TEXT: Record<GiftTab, { title: string; description: string }> = {
  IDEA: {
    title: 'Chưa có ý tưởng quà nào',
    description: 'Lưu ý tưởng để không quên khi đến dịp cần tặng quà.',
  },
  SELECTED: {
    title: 'Chưa chọn món quà nào',
    description: 'Chuyển một ý tưởng sang "Đã chọn" khi bạn quyết định tặng.',
  },
  PURCHASED: {
    title: 'Chưa có món quà nào đã mua',
    description: 'Món quà bạn đã mua nhưng chưa tặng sẽ hiện ở đây.',
  },
  GIVEN: {
    title: 'Chưa ghi nhận món quà đã tặng',
    description: 'Lịch sử quà tặng giúp bạn nhớ người nhận từng thích gì.',
  },
};

export function GiftCollectionScreen() {
  const profile = useAuthStore((s) => s.profile);
  const gifts = useGiftsStore((s) => s.gifts);
  const isLoading = useGiftsStore((s) => s.isLoading);
  const errorMessage = useGiftsStore((s) => s.errorMessage);
  const load = useGiftsStore((s) => s.load);
  const transition = useGiftsStore((s) => s.transition);

  const [tab, setTab] = useState<GiftTab>('IDEA');
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [sheetGift, setSheetGift] = useState<Gift | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (profile) void load(profile);
    }, [profile, load]),
  );

  const counts = useMemo(() => {
    const result: Record<GiftTab, number> = { IDEA: 0, SELECTED: 0, PURCHASED: 0, GIVEN: 0 };
    for (const gift of gifts) {
      const key = tabOfStatus(gift.status);
      if (key) result[key] += 1;
    }
    return result;
  }, [gifts]);

  const recipients = useMemo(() => {
    const seen = new Map<string, string>();
    for (const gift of gifts) {
      if (tabOfStatus(gift.status) === tab) seen.set(gift.recipientId, gift.recipientName);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [gifts, tab]);

  const visible = useMemo(
    () =>
      gifts.filter(
        (gift) =>
          tabOfStatus(gift.status) === tab && (!recipientId || gift.recipientId === recipientId),
      ),
    [gifts, tab, recipientId],
  );

  if (!profile) return <Loading />;

  function handleTabChange(next: GiftTab) {
    setTab(next);
    setRecipientId(null);
  }

  async function handleSubmit(input: GiftTransitionInput) {
    if (!profile || !sheetGift) return;
    await transition(profile, sheetGift.id, input);
    setSheetGift(null);
  }

  function handleRecordGiven() {
    if (!sheetGift) return;
    const id = sheetGift.id;
    setSheetGift(null);
    router.push({ pathname: '/gifts/given', params: { giftId: id } });
  }

  const empty = EMPTY_TEXT[tab];
  const hasGifts = gifts.length > 0;

  return (
    <Screen isFlush edges={['left', 'right']}>
      <Header
        title="Bộ sưu tập"
        actionIcon="add"
        actionLabel="Thêm ý tưởng quà"
        onActionPress={() => router.push('/gifts/new')}
      />
      <View style={styles.controls}>
        <SegmentedControl
          options={GIFT_TABS.map((item) => ({ ...item, count: counts[item.value] }))}
          value={tab}
          onChange={handleTabChange}
        />
        {recipients.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            <Chip
              label="Tất cả"
              isSelected={recipientId === null}
              onPress={() => setRecipientId(null)}
            />
            {recipients.map((item) => (
              <Chip
                key={item.id}
                label={item.name}
                isSelected={recipientId === item.id}
                onPress={() => setRecipientId(item.id)}
              />
            ))}
          </ScrollView>
        ) : null}
        <Text style={styles.note}>Giá ở đây là ước tính, chưa tính vào chi tiêu.</Text>
      </View>
      {isLoading && !hasGifts ? (
        <Loading />
      ) : errorMessage ? (
        <ErrorState message={errorMessage} onRetry={() => void load(profile)} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={
            <EmptyState
              icon="gift-outline"
              title={empty.title}
              description={empty.description}
              actionTitle={tab === 'IDEA' ? 'Thêm ý tưởng quà' : undefined}
              onAction={tab === 'IDEA' ? () => router.push('/gifts/new') : undefined}
            />
          }
          renderItem={({ item }) => (
            <GiftCard
              gift={item}
              onPress={() => router.push({ pathname: '/gifts/[id]', params: { id: item.id } })}
              onChangeStatus={() => setSheetGift(item)}
            />
          )}
        />
      )}
      {sheetGift ? (
        <GiftStatusSheet
          key={sheetGift.id}
          gift={sheetGift}
          onClose={() => setSheetGift(null)}
          onSubmit={handleSubmit}
          onRecordGiven={handleRecordGiven}
        />
      ) : null}
      <FollowUpPrompt />
    </Screen>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: spacing.screen, gap: spacing.sm + 2, paddingBottom: spacing.sm },
  chips: { gap: spacing.sm },
  note: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.textMuted },
  list: { paddingHorizontal: spacing.screen, paddingBottom: spacing.lg, flexGrow: 1 },
  separator: { height: 10 },
});
