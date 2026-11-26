import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Header } from '@/components/ui/Header';
import { IconButton } from '@/components/ui/IconButton';
import { Loading } from '@/components/ui/Loading';
import { Screen } from '@/components/ui/Screen';
import { useAuthStore } from '@/store/auth.store';
import { colors, fonts, fontSize, radius, spacing } from '@/theme';

import { groupByDate, useCalendarMonth } from '../hooks/useCalendar';
import type { OccurrenceItem } from '../types/events.types';
import { buildMonthGrid, shiftMonth } from '../utils/calendarGrid';
import { formatDayLabel, parseYmd, todayVn } from '../utils/dates';

import { OccurrenceRow } from './OccurrenceRow';

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;

type ViewMode = 'month' | 'list';

interface GridProps {
  year: number;
  month: number;
  today: string;
  selected: string | null;
  grouped: Record<string, OccurrenceItem[]>;
  onSelect: (date: string) => void;
}

function MonthGrid({ year, month, today, selected, grouped, onSelect }: GridProps) {
  const weeks = useMemo(() => buildMonthGrid(year, month), [year, month]);
  return (
    <View style={styles.grid}>
      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={styles.weekday}>
            {label}
          </Text>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week.map((cell) => cell ?? '-').join('')} style={styles.weekRow}>
          {week.map((cell, index) => {
            if (!cell) return <View key={`empty-${index}`} style={styles.cell} />;
            const count = grouped[cell]?.length ?? 0;
            const isSelected = cell === selected;
            return (
              <Pressable
                key={cell}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${formatDayLabel(cell)}${count > 0 ? `, ${count} sự kiện` : ''}`}
                onPress={() => onSelect(cell)}
                style={styles.cell}
              >
                <View
                  style={[
                    styles.dayCircle,
                    cell === today && styles.todayCircle,
                    isSelected && styles.selectedCircle,
                  ]}
                >
                  <Text style={[styles.dayText, isSelected && styles.selectedText]}>
                    {parseYmd(cell).day}
                  </Text>
                </View>
                <View style={[styles.dot, count > 0 && styles.dotActive]} />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export function CalendarScreen() {
  const profile = useAuthStore((s) => s.profile);
  const today = todayVn();
  const initial = parseYmd(today);
  const [cursor, setCursor] = useState({ year: initial.year, month: initial.month });
  const [mode, setMode] = useState<ViewMode>('month');
  const [selected, setSelected] = useState<string | null>(today);
  const { state, reload } = useCalendarMonth(cursor.year, cursor.month);

  const items = useMemo(() => (state.status === 'ready' ? state.data : []), [state]);
  const grouped = useMemo(() => groupByDate(items), [items]);

  function moveMonth(delta: number) {
    setCursor((current) => shiftMonth(current.year, current.month, delta));
    setSelected(null);
  }

  function goToday() {
    setCursor({ year: initial.year, month: initial.month });
    setSelected(today);
  }

  const selectedItems = selected ? (grouped[selected] ?? []) : [];

  function renderEvents() {
    if (mode === 'list') {
      if (items.length === 0) {
        return (
          <EmptyState
            icon="calendar-outline"
            title="Tháng này chưa có sự kiện"
            description="Thêm sinh nhật, kỷ niệm hay ngày lễ để không bỏ lỡ dịp nào."
            actionTitle="Thêm sự kiện"
            onAction={() => router.push('/events/new')}
          />
        );
      }
      return (
        <View style={styles.list}>
          {items.map((item) => (
            <OccurrenceRow key={item.id} item={item} today={today} />
          ))}
        </View>
      );
    }
    return (
      <View style={styles.list}>
        <Text style={styles.sectionTitle}>
          {selected ? formatDayLabel(selected) : 'Chọn một ngày'}
        </Text>
        {selectedItems.length === 0 ? (
          <Text style={styles.muted}>Không có sự kiện nào trong ngày này.</Text>
        ) : (
          selectedItems.map((item) => (
            <OccurrenceRow key={item.id} item={item} today={today} isBadgeHidden />
          ))
        )}
      </View>
    );
  }

  function renderBody() {
    if (!profile || state.status === 'loading') return <Loading />;
    if (state.status === 'error') return <ErrorState message={state.message} onRetry={reload} />;
    return (
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {mode === 'month' ? (
          <MonthGrid
            year={cursor.year}
            month={cursor.month}
            today={today}
            selected={selected}
            grouped={grouped}
            onSelect={setSelected}
          />
        ) : null}
        {renderEvents()}
      </ScrollView>
    );
  }

  return (
    <Screen isFlush edges={['left', 'right']}>
      <Header
        title="Lịch"
        actionIcon="add"
        actionLabel="Thêm sự kiện"
        onActionPress={() => router.push('/events/new')}
      />
      <View style={styles.monthBar}>
        <IconButton icon="chevron-back" label="Tháng trước" onPress={() => moveMonth(-1)} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Về tháng hiện tại"
          onPress={goToday}
        >
          <Text style={styles.monthTitle}>{`Tháng ${cursor.month} · ${cursor.year}`}</Text>
        </Pressable>
        <IconButton icon="chevron-forward" label="Tháng sau" onPress={() => moveMonth(1)} />
      </View>
      <View style={styles.modes}>
        <Chip label="Tháng" isSelected={mode === 'month'} onPress={() => setMode('month')} />
        <Chip label="Danh sách" isSelected={mode === 'list'} onPress={() => setMode('list')} />
      </View>
      {renderBody()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  monthTitle: { fontFamily: fonts.semiBold, fontSize: fontSize.lg, color: colors.text },
  modes: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.sm,
  },
  content: { padding: spacing.screen, paddingTop: spacing.sm, gap: spacing.md, paddingBottom: 96 },
  grid: {
    padding: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  weekRow: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  cell: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: { borderWidth: 1, borderColor: colors.primary },
  selectedCircle: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { fontFamily: fonts.medium, fontSize: fontSize.base, color: colors.text },
  selectedText: { color: colors.primaryText },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'transparent' },
  dotActive: { backgroundColor: colors.danger },
  list: { gap: spacing.sm },
  sectionTitle: { fontFamily: fonts.semiBold, fontSize: fontSize.lg, color: colors.text },
  muted: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.textMuted },
});
