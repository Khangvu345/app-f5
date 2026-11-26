import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Header } from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { Loading } from '@/components/ui/Loading';
import { Screen } from '@/components/ui/Screen';
import { useAuthStore } from '@/store/auth.store';
import { colors, fonts, fontSize, radius, spacing } from '@/theme';

import { filterRecipients, useRecipientsStore } from '../store/recipients.store';
import { RELATIONSHIP_LABELS, RELATIONSHIPS } from '../types/recipients.types';

import { RecipientRow } from './RecipientRow';

export function RecipientListScreen() {
  const profile = useAuthStore((state) => state.profile);
  const items = useRecipientsStore((state) => state.items);
  const status = useRecipientsStore((state) => state.status);
  const query = useRecipientsStore((state) => state.query);
  const relationship = useRecipientsStore((state) => state.relationship);
  const load = useRecipientsStore((state) => state.load);
  const setQuery = useRecipientsStore((state) => state.setQuery);
  const setRelationship = useRecipientsStore((state) => state.setRelationship);

  const reload = useCallback(() => {
    if (profile) void load(profile);
  }, [profile, load]);
  useFocusEffect(reload);

  const visible = useMemo(
    () => filterRecipients(items, query, relationship),
    [items, query, relationship],
  );

  function renderBody() {
    if (!profile || status === 'idle' || status === 'loading') return <Loading />;
    if (status === 'error') {
      return <ErrorState message="Không tải được danh sách người nhận." onRetry={reload} />;
    }
    if (items.length === 0) {
      return (
        <EmptyState
          icon="people-outline"
          title="Chưa có người nhận"
          description="Thêm người thân, bạn bè để nhận nhắc nhở và gợi ý quà đúng dịp."
          actionTitle="Thêm người nhận"
          onAction={() => router.push('/recipients/new')}
        />
      );
    }
    return (
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text style={styles.count}>{`${visible.length} người · sắp xếp theo dịp gần nhất`}</Text>
        }
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title="Không tìm thấy người nhận"
            description="Thử đổi từ khóa hoặc bộ lọc quan hệ."
          />
        }
        renderItem={({ item, index }) => (
          <RecipientRow item={item} isFirst={index === 0} isLast={index === visible.length - 1} />
        )}
      />
    );
  }

  return (
    <Screen isFlush edges={['left', 'right']}>
      <Header
        title="Người nhận"
        actionIcon="add"
        actionLabel="Thêm người nhận"
        onActionPress={() => router.push('/recipients/new')}
      />
      <View style={styles.search}>
        <Icon name="search-outline" size={20} color={colors.textMuted} />
        <TextInput
          accessibilityLabel="Tìm theo tên"
          placeholder="Tìm theo tên"
          placeholderTextColor={colors.placeholder}
          value={query}
          returnKeyType="search"
          onChangeText={setQuery}
          style={styles.searchInput}
        />
      </View>
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.filters}
        >
          <Chip
            label="Tất cả"
            isSelected={relationship === null}
            onPress={() => setRelationship(null)}
          />
          {RELATIONSHIPS.map((value) => (
            <Chip
              key={value}
              label={RELATIONSHIP_LABELS[value]}
              isSelected={relationship === value}
              onPress={() => setRelationship(value)}
            />
          ))}
        </ScrollView>
      </View>
      {renderBody()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    marginHorizontal: spacing.screen,
    marginTop: spacing.sm,
    marginBottom: spacing.md - 2,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: fontSize.md, color: colors.text },
  filters: { gap: spacing.sm, paddingHorizontal: spacing.screen },
  listContent: { padding: spacing.screen, paddingTop: spacing.md - 2, gap: 0 },
  count: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.md - 2,
  },
});
