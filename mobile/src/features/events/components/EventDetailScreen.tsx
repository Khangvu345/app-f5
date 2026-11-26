import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Header } from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { Loading } from '@/components/ui/Loading';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useAuthStore } from '@/store/auth.store';
import { colors, fonts, fontSize, radius, spacing } from '@/theme';

import { addTask, setTaskDone } from '../api/event-detail.api';
import { useEventDetail, type EventDetailData } from '../hooks/useEventDetail';
import { EVENT_TYPE_ICONS, EVENT_TYPE_LABELS } from '../types/events.types';
import { daysUntil, formatDate, formatDaysUntil, todayVn } from '../utils/dates';
import { formatMoney, progressPercent } from '../utils/format';

import { ProgressBar } from './ProgressBar';

interface Props {
  eventId: string;
  occurrenceId?: string;
}

const REMINDER_LABELS: Record<number, string> = {
  14: '14 ngày trước',
  7: '7 ngày trước',
  3: '3 ngày trước',
  1: '1 ngày trước',
  0: 'Vào ngày diễn ra',
};

function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Text style={styles.link}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

function DetailBody({ data, onChanged }: { data: EventDetailData; onChanged: () => void }) {
  const profile = useAuthStore((s) => s.profile);
  const [taskTitle, setTaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { event, occurrence, tasks, gifts, budget, reminders } = data;
  const today = todayVn();
  const doneCount = tasks.filter((task) => task.isDone).length;
  const percent = progressPercent(doneCount, tasks.length);
  const names = event.recipients.map((item) => item.name).join(', ');

  async function handleToggle(taskId: string, isDone: boolean) {
    if (!profile) return;
    await setTaskDone(profile, taskId, !isDone);
    onChanged();
  }

  async function handleAddTask() {
    if (!profile || !occurrence || taskTitle.trim().length === 0) return;
    setIsAdding(true);
    try {
      await addTask(profile, occurrence.id, taskTitle, occurrence.date);
      setTaskTitle('');
      onChanged();
    } finally {
      setIsAdding(false);
    }
  }

  const spentPercent = budget.planned ? progressPercent(budget.spent, budget.planned) : 0;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Card style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.iconWrap}>
            <Icon name={EVENT_TYPE_ICONS[event.eventType]} size={26} color={colors.primary} />
          </View>
          <View style={styles.topText}>
            <Text style={styles.title}>{event.title}</Text>
            <Text style={styles.muted}>{EVENT_TYPE_LABELS[event.eventType]}</Text>
          </View>
          {occurrence ? (
            <Badge
              label={formatDaysUntil(daysUntil(occurrence.date, today))}
              tone={daysUntil(occurrence.date, today) <= 3 ? 'danger' : 'primary'}
            />
          ) : null}
        </View>
        <View style={styles.metaRow}>
          <Icon name="person-outline" size={16} color={colors.textMuted} />
          <Text style={styles.metaText}>{names || 'Chưa có người nhận'}</Text>
        </View>
        {occurrence ? (
          <View style={styles.metaRow}>
            <Icon name="calendar-outline" size={16} color={colors.textMuted} />
            <Text style={styles.metaText}>
              {`${formatDate(occurrence.date)}${event.calendarType === 'LUNAR' ? ` · ${event.day}/${event.month} âm lịch` : ''}`}
            </Text>
          </View>
        ) : (
          <Text style={styles.muted}>Sự kiện này chưa có lần diễn ra nào.</Text>
        )}
        {event.notes ? <Text style={styles.notes}>{event.notes}</Text> : null}
      </Card>

      <SectionHeader title="Tiến độ chuẩn bị" />
      <Card style={styles.card}>
        {tasks.length > 0 ? (
          <>
            <View style={styles.rowBetween}>
              <Text style={styles.muted}>Đã hoàn thành</Text>
              <Text style={styles.strong}>{`${doneCount}/${tasks.length} việc`}</Text>
            </View>
            <ProgressBar percent={percent} label="Tiến độ chuẩn bị" />
            {tasks.map((task) => (
              <Pressable
                key={task.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: task.isDone }}
                onPress={() => void handleToggle(task.id, task.isDone)}
                style={styles.task}
              >
                <Icon
                  name={task.isDone ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={task.isDone ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.taskText, task.isDone && styles.taskDone]}>{task.title}</Text>
              </Pressable>
            ))}
          </>
        ) : (
          <Text style={styles.muted}>Chưa có việc chuẩn bị nào. Thêm việc đầu tiên bên dưới.</Text>
        )}
        {occurrence ? (
          <>
            <TextField
              label="Việc cần chuẩn bị"
              placeholder="Ví dụ: Đặt hoa"
              maxLength={200}
              value={taskTitle}
              onChangeText={setTaskTitle}
            />
            <Button
              title="Thêm việc"
              variant="secondary"
              loading={isAdding}
              disabled={taskTitle.trim().length === 0}
              onPress={() => void handleAddTask()}
            />
          </>
        ) : null}
      </Card>

      <SectionHeader title="Ngân sách sự kiện" />
      <Card style={styles.card}>
        {budget.planned ? (
          <>
            <View style={styles.rowBetween}>
              <Text style={styles.muted}>{`Đã chi ${formatMoney(budget.spent)}`}</Text>
              <Text style={styles.strong}>{formatMoney(budget.planned)}</Text>
            </View>
            <ProgressBar
              percent={spentPercent}
              label={`Đã chi ${spentPercent}% ngân sách sự kiện`}
              tone={budget.spent > budget.planned ? 'danger' : 'primary'}
            />
          </>
        ) : (
          <Text style={styles.muted}>
            {budget.spent > 0
              ? `Đã chi ${formatMoney(budget.spent)}. Chưa đặt ngân sách cho sự kiện này.`
              : 'Chưa đặt ngân sách cho sự kiện này.'}
          </Text>
        )}
      </Card>

      <SectionHeader title="Ý tưởng quà" />
      <Card style={styles.card}>
        {gifts.length === 0 ? (
          <Text style={styles.muted}>Chưa có ý tưởng quà nào gắn với dịp này.</Text>
        ) : (
          gifts.map((gift) => (
            <View key={gift.id} style={styles.giftRow}>
              <Icon name="gift-outline" size={20} color={colors.primary} />
              <View style={styles.giftText}>
                <Text style={styles.taskText}>{gift.name}</Text>
                <Text style={styles.muted}>
                  {gift.estimatedAmount !== null
                    ? `${gift.recipientName} · ${formatMoney(gift.estimatedAmount)}`
                    : gift.recipientName}
                </Text>
              </View>
            </View>
          ))
        )}
        <Button
          title="Gợi ý quà bằng AI"
          icon="sparkles-outline"
          onPress={() => router.push('/(app)/(tabs)/discover')}
        />
      </Card>

      <SectionHeader
        title="Nhắc nhở"
        actionLabel="Tùy chỉnh"
        onAction={() => router.push(`/events/${event.id}/reminders`)}
      />
      <Card style={styles.card}>
        {reminders.length === 0 ? (
          <Text style={styles.muted}>Chưa có nhắc nhở nào cho sự kiện này.</Text>
        ) : (
          reminders.map((rule) => (
            <View key={rule.id} style={styles.rowBetween}>
              <View style={styles.metaRow}>
                <Icon name="notifications-outline" size={18} color={colors.textMuted} />
                <Text style={styles.taskText}>
                  {`${REMINDER_LABELS[rule.daysBefore]} · ${rule.reminderTime}`}
                </Text>
              </View>
              <Badge
                label={rule.isEnabled ? 'Bật' : 'Tắt'}
                tone={rule.isEnabled ? 'primary' : 'neutral'}
              />
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

export function EventDetailScreen({ eventId, occurrenceId }: Props) {
  const { state, reload } = useEventDetail(eventId, occurrenceId ?? null);

  function handleEdit() {
    const suffix = occurrenceId ? `?occurrence=${occurrenceId}` : '';
    router.push(`/events/${eventId}/edit${suffix}`);
  }

  function renderBody() {
    if (state.status === 'loading') return <Loading />;
    if (state.status === 'error') return <ErrorState message={state.message} onRetry={reload} />;
    if (!state.data) return <ErrorState message="Sự kiện này không còn tồn tại." />;
    return <DetailBody data={state.data} onChanged={reload} />;
  }

  return (
    <Screen isFlush edges={['left', 'right']}>
      <Header
        variant="bar"
        title="Chi tiết sự kiện"
        rightLabel="Sửa"
        isRightDisabled={state.status !== 'ready' || !state.data}
        onRightPress={handleEdit}
      />
      {renderBody()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.screen, gap: spacing.sm + 4, paddingBottom: spacing.xl },
  card: { padding: spacing.md, gap: spacing.sm + 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  topText: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.bold, fontSize: fontSize.lg, color: colors.text },
  muted: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.textMuted },
  strong: { fontFamily: fonts.semiBold, fontSize: fontSize.sm, color: colors.text },
  notes: { fontFamily: fonts.regular, fontSize: fontSize.base, color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  metaText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.base,
    color: colors.text,
    flexShrink: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sectionTitle: { fontFamily: fonts.semiBold, fontSize: fontSize.lg, color: colors.text },
  link: { fontFamily: fonts.semiBold, fontSize: fontSize.md, color: colors.primary },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  task: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  taskText: { fontFamily: fonts.medium, fontSize: fontSize.md, color: colors.text, flexShrink: 1 },
  taskDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  giftRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  giftText: { flex: 1, gap: 2 },
});
