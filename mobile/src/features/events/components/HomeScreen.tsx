import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Header } from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { Loading } from '@/components/ui/Loading';
import { Screen } from '@/components/ui/Screen';
import { useAuthStore } from '@/store/auth.store';
import { colors, fonts, fontSize, radius, spacing } from '@/theme';

import { setTaskDone } from '../api/event-detail.api';
import { useHome, type HomeData } from '../hooks/useHome';
import { EVENT_TYPE_ICONS } from '../types/events.types';
import { daysUntil, formatDate, formatDayLabel, formatDaysUntil, parseYmd } from '../utils/dates';
import { formatMoney, progressPercent } from '../utils/format';

import { OccurrenceRow, openOccurrence } from './OccurrenceRow';
import { ProgressBar } from './ProgressBar';
import { QuickAddSheet } from './QuickAddSheet';

function NextEventCard({ data }: { data: HomeData }) {
  const next = data.next;
  if (!next) return null;
  const days = daysUntil(next.date, data.today);
  const total = next.openTaskCount + next.doneTaskCount;
  const percent = progressPercent(next.doneTaskCount, total);
  const names = next.recipientNames.join(', ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Sự kiện gần nhất: ${next.title}, ${formatDaysUntil(days)}`}
      onPress={() => openOccurrence(next)}
    >
      <Card style={styles.nextCard}>
        <View style={styles.nextTop}>
          <View style={styles.nextIcon}>
            <Icon name={EVENT_TYPE_ICONS[next.eventType]} size={24} color={colors.primary} />
          </View>
          <View style={styles.nextText}>
            <Text numberOfLines={2} style={styles.nextTitle}>
              {next.title}
            </Text>
            <Text numberOfLines={1} style={styles.muted}>
              {[names ? `Cho ${names}` : null, formatDate(next.date)].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Badge label={formatDaysUntil(days)} tone={days <= 3 ? 'danger' : 'primary'} />
        </View>
        {total > 0 ? (
          <View style={styles.progress}>
            <View style={styles.progressLabels}>
              <Text style={styles.muted}>Tiến độ chuẩn bị</Text>
              <Text style={styles.progressValue}>{`${next.doneTaskCount}/${total} việc`}</Text>
            </View>
            <ProgressBar percent={percent} label="Tiến độ chuẩn bị" />
          </View>
        ) : (
          <Text style={styles.muted}>Chưa có việc chuẩn bị nào cho dịp này.</Text>
        )}
      </Card>
    </Pressable>
  );
}

function TodayTasks({ data, onToggle }: { data: HomeData; onToggle: (id: string) => void }) {
  if (data.tasks.length === 0) {
    return (
      <Card style={styles.sectionCard}>
        <Text style={styles.muted}>Hôm nay bạn không có việc nào cần làm.</Text>
      </Card>
    );
  }
  return (
    <Card style={styles.sectionCard}>
      {data.tasks.map((task) => (
        <Pressable
          key={task.id}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.isDone }}
          accessibilityLabel={`${task.title}, ${task.eventTitle}`}
          onPress={() => onToggle(task.id)}
          style={styles.task}
        >
          <Icon
            name={task.isDone ? 'checkbox' : 'square-outline'}
            size={22}
            color={task.isDone ? colors.primary : colors.textMuted}
          />
          <View style={styles.taskText}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <Text style={styles.muted}>{task.eventTitle}</Text>
          </View>
          {task.dueOn && task.dueOn < data.today ? <Badge label="Quá hạn" tone="danger" /> : null}
        </Pressable>
      ))}
    </Card>
  );
}

function BudgetCard({ data }: { data: HomeData }) {
  const { amount, spent } = data.budget;
  const year = parseYmd(data.today).year;
  const percent = amount ? progressPercent(spent, amount) : 0;
  return (
    <Card style={styles.sectionCard}>
      <View style={styles.progressLabels}>
        <Text style={styles.cardTitle}>{`Ngân sách năm ${year}`}</Text>
        {amount ? <Text style={styles.progressValue}>{`${percent}%`}</Text> : null}
      </View>
      {amount ? (
        <>
          <ProgressBar
            percent={percent}
            label={`Đã chi ${percent}% ngân sách năm`}
            tone={spent > amount ? 'danger' : 'primary'}
          />
          <Text
            style={styles.muted}
          >{`Đã chi ${formatMoney(spent)} / ${formatMoney(amount)}`}</Text>
        </>
      ) : (
        <Text style={styles.muted}>
          {spent > 0
            ? `Đã chi ${formatMoney(spent)}. Bạn chưa đặt ngân sách cho năm nay.`
            : 'Bạn chưa đặt ngân sách cho năm nay.'}
        </Text>
      )}
    </Card>
  );
}

export function HomeScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { state, reload } = useHome();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  async function handleToggleTask(taskId: string) {
    if (!profile) return;
    await setTaskDone(profile, taskId, true);
    reload();
  }

  function renderBody() {
    if (!profile || state.status === 'loading') return <Loading />;
    if (state.status === 'error') return <ErrorState message={state.message} onRetry={reload} />;
    const data = state.data;
    if (!data.hasEvents || !data.next) {
      return (
        <EmptyState
          icon="calendar-outline"
          title="Chưa có sự kiện sắp tới"
          description="Thêm sinh nhật, kỷ niệm hay ngày lễ để GiftMate nhắc bạn chuẩn bị quà đúng lúc."
          actionTitle="Thêm sự kiện"
          onAction={() => router.push('/events/new')}
        />
      );
    }
    return (
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Sự kiện gần nhất</Text>
        <NextEventCard data={data} />
        <Text style={styles.sectionTitle}>Việc hôm nay</Text>
        <TodayTasks data={data} onToggle={(id) => void handleToggleTask(id)} />
        <BudgetCard data={data} />
        <Text style={styles.sectionTitle}>Trong 30 ngày tới</Text>
        {data.upcoming.length === 0 ? (
          <Card style={styles.sectionCard}>
            <Text style={styles.muted}>Không có sự kiện nào khác trong 30 ngày tới.</Text>
          </Card>
        ) : (
          <View style={styles.list}>
            {data.upcoming.map((item) => (
              <OccurrenceRow key={item.id} item={item} today={data.today} />
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  const today = state.status === 'ready' ? state.data.today : null;

  return (
    <Screen isFlush edges={['left', 'right']}>
      <Header
        title="Hôm nay"
        subtitle={today ? formatDayLabel(today) : undefined}
        actionIcon="person-outline"
        actionLabel="Cá nhân"
        onActionPress={() => router.push('/(app)/profile')}
      />
      {renderBody()}
      <View style={styles.fabWrap} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thêm nhanh"
          onPress={() => setIsQuickAddOpen(true)}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        >
          <Icon name="add" size={22} color={colors.primaryText} />
          <Text style={styles.fabLabel}>Thêm nhanh</Text>
        </Pressable>
      </View>
      <QuickAddSheet isVisible={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: 96,
    gap: spacing.sm + 4,
  },
  sectionTitle: {
    marginTop: spacing.sm,
    fontFamily: fonts.semiBold,
    fontSize: fontSize.lg,
    color: colors.text,
  },
  cardTitle: { fontFamily: fonts.semiBold, fontSize: fontSize.md, color: colors.text },
  muted: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.textMuted },
  nextCard: { padding: spacing.md, gap: spacing.md },
  nextTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nextIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  nextText: { flex: 1, gap: 2 },
  nextTitle: { fontFamily: fonts.bold, fontSize: fontSize.lg, color: colors.text },
  progress: { gap: spacing.sm },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressValue: { fontFamily: fonts.semiBold, fontSize: fontSize.sm, color: colors.text },
  sectionCard: { padding: spacing.md, gap: spacing.sm + 4 },
  task: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  taskText: { flex: 1, gap: 2 },
  taskTitle: { fontFamily: fonts.medium, fontSize: fontSize.md, color: colors.text },
  list: { gap: spacing.sm },
  fabWrap: { position: 'absolute', right: spacing.screen, bottom: spacing.md },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 52,
    paddingHorizontal: spacing.md + 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  fabPressed: { opacity: 0.85 },
  fabLabel: { fontFamily: fonts.semiBold, fontSize: fontSize.md, color: colors.primaryText },
});
