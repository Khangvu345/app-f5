import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ErrorState } from '@/components/ui/ErrorState';
import { Header } from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { Loading } from '@/components/ui/Loading';
import { Screen } from '@/components/ui/Screen';
import { colors, fonts, fontSize, radius, spacing } from '@/theme';

import { useRecipientProfile } from '../hooks/useRecipientProfile';
import { RELATIONSHIP_LABELS, type RecipientDetail } from '../types/recipients.types';

import { GiftHistoryList } from './GiftHistoryList';

type ProfileTab = 'overview' | 'history' | 'ideas';

interface Props {
  recipientId: string;
}

const IDEA_STATUS_LABELS: Record<string, string> = {
  IDEA: 'Ý tưởng',
  CONSIDERING: 'Đang cân nhắc',
  SELECTED: 'Đã chọn',
};

function subtitleOf(detail: RecipientDetail): string {
  const parts: string[] = [RELATIONSHIP_LABELS[detail.relationship]];
  if (detail.birthDay !== null && detail.birthMonth !== null) {
    const base = `Sinh nhật ${detail.birthDay}/${detail.birthMonth}`;
    parts.push(
      detail.birthYear === null ? `${base} (không lưu năm)` : `${base}/${detail.birthYear}`,
    );
  } else if (detail.nextOccasion) {
    parts.push(detail.nextOccasion.label);
  }
  return parts.join(' · ');
}

export function RecipientProfileScreen({ recipientId }: Props) {
  const { status, detail, gifts, ideas, reload } = useRecipientProfile(recipientId);
  const [tab, setTab] = useState<ProfileTab>('overview');

  if (status === 'loading') {
    return (
      <Screen isFlush edges={['left', 'right']}>
        <Header variant="bar" title="" />
        <Loading />
      </Screen>
    );
  }
  if (status !== 'ready' || !detail) {
    return (
      <Screen isFlush edges={['left', 'right']}>
        <Header variant="bar" title="" />
        <ErrorState
          message={
            status === 'notFound'
              ? 'Không tìm thấy hồ sơ người nhận này.'
              : 'Không tải được hồ sơ người nhận.'
          }
          onRetry={status === 'notFound' ? undefined : reload}
        />
      </Screen>
    );
  }

  const tabs: { key: ProfileTab; label: string }[] = [
    { key: 'overview', label: 'Tổng quan' },
    { key: 'history', label: 'Lịch sử quà' },
    { key: 'ideas', label: `Ý tưởng (${ideas.length})` },
  ];
  const hasProfileInfo =
    detail.likes.length > 0 || detail.avoids.length > 0 || Boolean(detail.notes?.trim());

  return (
    <Screen isFlush edges={['left', 'right']}>
      <Header
        variant="bar"
        title=""
        rightLabel="Sửa"
        onRightPress={() => router.push(`/recipients/${detail.id}/edit`)}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{detail.name.trim().charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.heroText}>
            <Text style={styles.name}>{detail.name}</Text>
            <Text style={styles.subtitle}>{subtitleOf(detail)}</Text>
          </View>
        </View>

        <View style={styles.tabs}>
          {tabs.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === item.key }}
              onPress={() => setTab(item.key)}
              style={[styles.tab, tab === item.key && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, tab === item.key && styles.tabLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'overview' ? (
          <View style={styles.sections}>
            {detail.likes.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sở thích</Text>
                <View style={styles.chips}>
                  {detail.likes.map((like) => (
                    <View key={like} style={styles.likeChip}>
                      <Text style={styles.likeText}>{like}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
            {detail.avoids.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Điều cần tránh</Text>
                <View style={styles.chips}>
                  {detail.avoids.map((avoid) => (
                    <View key={avoid} style={styles.avoidChip}>
                      <Icon name="ban-outline" size={14} color={colors.warningText} />
                      <Text style={styles.avoidText}>{avoid}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
            {detail.notes?.trim() ? (
              <Card style={styles.notes}>
                <View style={styles.notesHeader}>
                  <Icon name="lock-closed-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.sectionTitle}>Ghi chú riêng tư</Text>
                </View>
                <Text style={styles.notesText}>{detail.notes}</Text>
              </Card>
            ) : null}
            {!hasProfileInfo ? (
              <Text style={styles.hint}>
                Chưa có sở thích hay ghi chú. Bấm Sửa để bổ sung giúp gợi ý quà chính xác hơn.
              </Text>
            ) : null}
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Quà đã tặng gần đây</Text>
                {gifts.length > 3 ? (
                  <Pressable accessibilityRole="button" onPress={() => setTab('history')}>
                    <Text style={styles.link}>Xem tất cả</Text>
                  </Pressable>
                ) : null}
              </View>
              {gifts.length > 0 ? (
                <GiftHistoryList gifts={gifts.slice(0, 3)} />
              ) : (
                <Text style={styles.hint}>Bạn chưa tặng món quà nào cho người này.</Text>
              )}
            </View>
          </View>
        ) : null}

        {tab === 'history' ? (
          gifts.length > 0 ? (
            <GiftHistoryList gifts={gifts} />
          ) : (
            <Text style={styles.hint}>Bạn chưa tặng món quà nào cho người này.</Text>
          )
        ) : null}

        {tab === 'ideas' ? (
          ideas.length > 0 ? (
            <Card>
              {ideas.map((idea, index) => (
                <View
                  key={idea.id}
                  style={[styles.ideaRow, index < ideas.length - 1 && styles.ideaSeparator]}
                >
                  <Text numberOfLines={1} style={styles.ideaName}>
                    {idea.name}
                  </Text>
                  <Chip label={IDEA_STATUS_LABELS[idea.status] ?? idea.status} tone="primary" />
                </View>
              ))}
            </Card>
          ) : (
            <Text style={styles.hint}>Chưa có ý tưởng quà nào cho người này.</Text>
          )
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        <Button
          title={`Gợi ý quà cho ${detail.name}`}
          icon="sparkles-outline"
          onPress={() => router.push('/(app)/(tabs)/discover')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.screen,
    paddingTop: spacing.sm,
    gap: spacing.md + 1,
    paddingBottom: spacing.lg,
  },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md + 2 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.bold, fontSize: fontSize.xl, color: colors.primaryDark },
  heroText: { flex: 1, gap: spacing.xs },
  name: { fontFamily: fonts.bold, fontSize: fontSize.xl, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: fontSize.base, color: colors.textMuted },
  tabs: {
    flexDirection: 'row',
    gap: spacing.screen,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  tab: {
    minHeight: 44,
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.primary },
  tabLabel: { fontFamily: fonts.medium, fontSize: fontSize.md, color: colors.textMuted },
  tabLabelActive: { fontFamily: fonts.semiBold, color: colors.text },
  sections: { gap: spacing.md + 2 },
  section: { gap: spacing.sm + 2 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: fonts.semiBold, fontSize: fontSize.base, color: colors.textMuted },
  link: { fontFamily: fonts.medium, fontSize: fontSize.base, color: colors.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  likeChip: {
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  likeText: { fontFamily: fonts.regular, fontSize: fontSize.base, color: colors.text },
  avoidChip: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: colors.warningSoft,
  },
  avoidText: { fontFamily: fonts.regular, fontSize: fontSize.base, color: colors.warningText },
  notes: { borderRadius: radius.xl - 2, padding: 14, gap: spacing.sm },
  notesHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  notesText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    lineHeight: 22.5,
    color: colors.text,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: fontSize.base,
    lineHeight: 21,
    color: colors.textMuted,
  },
  ideaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: 14,
  },
  ideaSeparator: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  ideaName: { flex: 1, fontFamily: fonts.semiBold, fontSize: fontSize.md, color: colors.text },
  footer: {
    padding: spacing.screen,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.background,
  },
});
