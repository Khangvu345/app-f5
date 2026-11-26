import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, Divider, ErrorState, Header, Loading, Screen } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { colors, fonts, fontSize, spacing } from '@/theme';

import { useGift } from '../hooks/useGift';
import { useGiftsStore } from '../store/gifts.store';
import type { GiftStatus, GiftTransitionInput } from '../types/gifts.types';
import { formatEstimateFromX100, formatVndFromX100 } from '../utils/formatVnd';
import { formatOccasion, isoToDisplay } from '../utils/giftDate';
import {
  getNextStatuses,
  getTransitionPath,
  GIFT_REACTION_LABELS,
  GIFT_STATUS_LABELS,
} from '../utils/giftStatus';

import { GiftStatusSheet } from './GiftStatusSheet';

type Tone = 'primary' | 'warning' | 'neutral';

function toneOf(status: GiftStatus): Tone {
  if (status === 'GIVEN' || status === 'PURCHASED') return 'primary';
  if (status === 'RETURNED') return 'warning';
  return 'neutral';
}

interface RowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: RowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function GiftDetailScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { gift, isLoading, errorMessage, reload } = useGift(profile, id);
  const transition = useGiftsStore((s) => s.transition);
  const remove = useGiftsStore((s) => s.remove);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  if (!profile || (isLoading && !gift)) return <Loading />;
  if (errorMessage || !gift) {
    return (
      <Screen isFlush edges={['left', 'right', 'bottom']}>
        <Header variant="bar" title="Chi tiết quà" />
        <ErrorState
          message={errorMessage ?? 'Không tìm thấy món quà này.'}
          onRetry={errorMessage ? () => reload() : undefined}
        />
      </Screen>
    );
  }

  const current = gift;
  const occasion = formatOccasion(current.occasionTitle, current.occasionDate);
  const canChange = getNextStatuses(current.status).length > 0;
  const canRecordGiven = (getTransitionPath(current.status, 'GIVEN')?.length ?? 0) > 0;

  async function handleSubmit(input: GiftTransitionInput) {
    if (!profile) return;
    await transition(profile, current.id, input);
    setIsSheetOpen(false);
    reload();
  }

  function handleDelete() {
    Alert.alert('Xoá món quà', `Bạn có chắc muốn xoá "${current.name}"?`, [
      { text: 'Giữ lại', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: () => {
          if (!profile) return;
          void remove(profile, current.id).then(() => router.back());
        },
      },
    ]);
  }

  return (
    <Screen isFlush edges={['left', 'right', 'bottom']}>
      <Header variant="bar" title="Chi tiết quà" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{current.name}</Text>
            <Badge label={GIFT_STATUS_LABELS[current.status]} tone={toneOf(current.status)} />
          </View>
          <Text style={styles.sub}>
            {occasion ? `${current.recipientName} · ${occasion}` : current.recipientName}
          </Text>
          <Divider />
          {current.category ? <InfoRow label="Nhóm quà" value={current.category} /> : null}
          {current.estimatedAmountX100 !== null ? (
            <InfoRow
              label="Giá ước tính"
              value={formatEstimateFromX100(current.estimatedAmountX100)}
            />
          ) : null}
          {current.actualAmountX100 !== null ? (
            <InfoRow label="Giá thực tế" value={formatVndFromX100(current.actualAmountX100)} />
          ) : null}
          {current.purchasedOn ? (
            <InfoRow label="Ngày mua" value={isoToDisplay(current.purchasedOn)} />
          ) : null}
          {current.givenOn ? (
            <InfoRow label="Ngày tặng" value={isoToDisplay(current.givenOn)} />
          ) : null}
          {current.reaction ? (
            <InfoRow label="Phản hồi" value={GIFT_REACTION_LABELS[current.reaction]} />
          ) : null}
          {current.productUrl ? <InfoRow label="Liên kết" value={current.productUrl} /> : null}
          {current.note ? <InfoRow label="Ghi chú" value={current.note} /> : null}
          <InfoRow label="Nguồn" value={current.source === 'AI' ? 'Gợi ý AI' : 'Tự thêm'} />
        </Card>
        <View style={styles.actions}>
          {canChange ? (
            <Button title="Chuyển trạng thái" onPress={() => setIsSheetOpen(true)} />
          ) : null}
          {canRecordGiven ? (
            <Button
              title="Ghi nhận đã tặng"
              variant="secondary"
              onPress={() =>
                router.push({ pathname: '/gifts/given', params: { giftId: current.id } })
              }
            />
          ) : null}
          {current.status === 'IDEA' || current.status === 'CONSIDERING' ? (
            <Button
              title="Sửa ý tưởng"
              variant="secondary"
              onPress={() => router.push({ pathname: '/gifts/new', params: { id: current.id } })}
            />
          ) : null}
          <Button title="Xoá món quà" variant="danger" onPress={handleDelete} />
        </View>
      </ScrollView>
      {isSheetOpen ? (
        <GiftStatusSheet
          gift={current}
          onClose={() => setIsSheetOpen(false)}
          onSubmit={handleSubmit}
          onRecordGiven={() => {
            setIsSheetOpen(false);
            router.push({ pathname: '/gifts/given', params: { giftId: current.id } });
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.screen, gap: spacing.md },
  card: { padding: spacing.md, gap: spacing.sm + 4 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: { flex: 1, fontFamily: fonts.bold, fontSize: fontSize.lg, color: colors.text },
  sub: { fontFamily: fonts.regular, fontSize: fontSize.base, color: colors.textMuted },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  rowLabel: { fontFamily: fonts.regular, fontSize: fontSize.base, color: colors.textMuted },
  rowValue: {
    flex: 1,
    textAlign: 'right',
    fontFamily: fonts.medium,
    fontSize: fontSize.base,
    color: colors.text,
  },
  actions: { gap: spacing.sm + 2 },
});
