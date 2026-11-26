import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ErrorState } from '@/components/ui/ErrorState';
import { Header } from '@/components/ui/Header';
import { Loading } from '@/components/ui/Loading';
import { Screen } from '@/components/ui/Screen';
import { SelectField, type SelectOption } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { colors, fonts, fontSize, radius, spacing } from '@/theme';

import { useEventForm } from '../hooks/useEventForm';
import {
  EVENT_TYPE_LABELS,
  LEAP_DAY_POLICY_LABELS,
  type EventType,
  type LeapDayPolicy,
} from '../types/events.types';
import { formatDate } from '../utils/dates';
import { draftFromFields, ruleFromDraft } from '../utils/eventDraft';
import { formatMoneyInput, parseMoneyInput } from '../utils/format';
import { occurrenceDatesInYear } from '../utils/occurrences';

import { DeleteEventSheet } from './DeleteEventSheet';
import { EventTrialLimitSheet } from './EventTrialLimitSheet';

interface Props {
  /** Có giá trị = sửa sự kiện, không có = tạo mới. */
  eventId?: string;
  initialRecipientId?: string;
  occurrenceId?: string;
}

const TYPE_OPTIONS: readonly SelectOption<EventType>[] = (
  Object.keys(EVENT_TYPE_LABELS) as EventType[]
).map((value) => ({ value, label: EVENT_TYPE_LABELS[value] }));

const POLICY_OPTIONS: readonly SelectOption<LeapDayPolicy>[] = (
  Object.keys(LEAP_DAY_POLICY_LABELS) as LeapDayPolicy[]
).map((value) => ({ value, label: LEAP_DAY_POLICY_LABELS[value] }));

interface SwitchRowProps {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

function SwitchRow({ label, hint, value, onChange }: SwitchRowProps) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchText}>
        <Text style={styles.switchLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

export function EventFormScreen({ eventId, initialRecipientId, occurrenceId }: Props) {
  const form = useEventForm({
    eventId: eventId ?? null,
    initialRecipientId,
    occurrenceId,
  });
  const { fields, errors, recipients } = form;
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const isEdit = Boolean(eventId);
  const draft = draftFromFields(fields);
  const isLeapDay = fields.calendarType === 'SOLAR' && fields.day === '29' && fields.month === '2';
  const lunarHint = (() => {
    if (fields.calendarType !== 'LUNAR' || Object.keys(errors).length > 0) return undefined;
    if (!(draft.day >= 1 && draft.day <= 30 && draft.month >= 1 && draft.month <= 12)) {
      return undefined;
    }
    const year = new Date().getFullYear();
    const [date] = occurrenceDatesInYear(ruleFromDraft(draft), year);
    return date ? `Năm ${year} rơi vào ngày ${formatDate(date)} dương lịch.` : undefined;
  })();

  function renderBody() {
    if (form.status === 'loading') return <Loading />;
    if (form.status === 'error') {
      return (
        <ErrorState message="Không tải được dữ liệu sự kiện." onRetry={() => void form.reload()} />
      );
    }
    if (form.status === 'not-found') {
      return <ErrorState message="Sự kiện này không còn tồn tại." />;
    }
    const selected = recipients.filter((item) => fields.recipientIds.includes(item.id));
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TextField
            label="Tiêu đề"
            isRequired
            placeholder="Ví dụ: Sinh nhật mẹ"
            value={fields.title}
            maxLength={150}
            error={errors.title}
            onChangeText={(value) => form.setField('title', value)}
          />
          <SelectField
            label="Loại sự kiện"
            isRequired
            value={fields.eventType}
            options={TYPE_OPTIONS}
            onChange={(value) => form.setField('eventType', value)}
          />

          <View style={styles.group}>
            <Text style={styles.groupLabel}>
              Người nhận <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.chips}>
              {selected.map((item) => (
                <Chip
                  key={item.id}
                  tone={item.id === fields.primaryRecipientId ? 'primary' : 'add'}
                  label={item.id === fields.primaryRecipientId ? `${item.name} · Chính` : item.name}
                  onPress={() => form.setField('primaryRecipientId', item.id)}
                  onRemove={() => form.toggleRecipient(item.id)}
                />
              ))}
              <Chip
                tone="add"
                label={selected.length === 0 ? '+ Chọn người nhận' : '+ Thêm'}
                onPress={() => setIsPickerOpen(true)}
              />
            </View>
            {selected.length > 1 ? (
              <Text style={styles.hint}>Chạm vào một người để đặt làm người nhận chính.</Text>
            ) : null}
            {recipients.length === 0 ? (
              <Text style={styles.hint}>
                Bạn chưa có người nhận nào. Hãy thêm người nhận trước.
              </Text>
            ) : null}
            {errors.recipients ? <Text style={styles.error}>{errors.recipients}</Text> : null}
          </View>

          <View style={styles.group}>
            <Text style={styles.groupLabel}>Loại lịch</Text>
            <View style={styles.chips}>
              <Chip
                label="Dương lịch"
                isSelected={fields.calendarType === 'SOLAR'}
                onPress={() => form.setField('calendarType', 'SOLAR')}
              />
              <Chip
                label="Âm lịch"
                isSelected={fields.calendarType === 'LUNAR'}
                onPress={() => form.setField('calendarType', 'LUNAR')}
              />
            </View>
          </View>
          <View style={styles.dateRow}>
            <View style={styles.dateCell}>
              <TextField
                label="Ngày"
                isRequired
                keyboardType="number-pad"
                maxLength={2}
                placeholder="DD"
                value={fields.day}
                onChangeText={(value) => form.setField('day', value)}
              />
            </View>
            <View style={styles.dateCell}>
              <TextField
                label="Tháng"
                isRequired
                keyboardType="number-pad"
                maxLength={2}
                placeholder="MM"
                value={fields.month}
                onChangeText={(value) => form.setField('month', value)}
              />
            </View>
            <View style={styles.dateCellWide}>
              <TextField
                label="Năm"
                optionalText={fields.isRecurring ? '(không bắt buộc)' : undefined}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="YYYY"
                value={fields.year}
                onChangeText={(value) => form.setField('year', value)}
              />
            </View>
          </View>
          {errors.date ? <Text style={styles.error}>{errors.date}</Text> : null}
          {errors.year ? <Text style={styles.error}>{errors.year}</Text> : null}
          {lunarHint ? <Text style={styles.hint}>{lunarHint}</Text> : null}
          {fields.calendarType === 'LUNAR' ? (
            <SwitchRow
              label="Tháng nhuận"
              hint="Chỉ áp dụng khi sự kiện rơi vào tháng nhuận âm lịch."
              value={fields.isLeapMonth}
              onChange={(value) => form.setField('isLeapMonth', value)}
            />
          ) : null}
          <SwitchRow
            label="Lặp lại hằng năm"
            value={fields.isRecurring}
            onChange={(value) => form.setField('isRecurring', value)}
          />
          {isLeapDay && fields.isRecurring ? (
            <SelectField
              label="Năm không có ngày 29/2"
              value={fields.leapDayPolicy}
              options={POLICY_OPTIONS}
              onChange={(value) => form.setField('leapDayPolicy', value)}
            />
          ) : null}

          <TextField
            label="Ngân sách mặc định"
            optionalText="(VND)"
            keyboardType="number-pad"
            placeholder="Ví dụ: 500.000"
            value={formatMoneyInput(parseMoneyInput(fields.budget))}
            error={errors.budget}
            onChangeText={(value) => form.setField('budget', value)}
          />
          <TextField
            label="Ghi chú"
            optionalText="(không bắt buộc)"
            multiline
            maxLength={500}
            placeholder="Thêm ghi chú về sự kiện"
            value={fields.notes}
            error={errors.notes}
            onChangeText={(value) => form.setField('notes', value)}
          />
          {form.submitError ? <Text style={styles.error}>{form.submitError}</Text> : null}
          <Button
            title={isEdit ? 'Lưu thay đổi' : 'Lưu sự kiện'}
            loading={form.isSaving}
            onPress={() => void form.submit()}
          />
          {isEdit ? (
            <Button
              title="Xóa sự kiện"
              variant="danger"
              disabled={form.isSaving}
              onPress={() => setIsDeleteOpen(true)}
            />
          ) : null}
        </ScrollView>

        <BottomSheet
          isVisible={isPickerOpen}
          title="Chọn người nhận"
          onClose={() => setIsPickerOpen(false)}
        >
          <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled">
            {recipients.map((item) => (
              <View key={item.id} style={styles.pickerRow}>
                <Chip
                  label={item.name}
                  isSelected={fields.recipientIds.includes(item.id)}
                  onPress={() => form.toggleRecipient(item.id)}
                />
              </View>
            ))}
          </ScrollView>
          <Button title="Xong" onPress={() => setIsPickerOpen(false)} />
        </BottomSheet>
      </KeyboardAvoidingView>
    );
  }

  return (
    <Screen isFlush edges={['left', 'right']}>
      <Header
        variant="bar"
        title={isEdit ? 'Sửa sự kiện' : 'Thêm sự kiện'}
        leftLabel="Hủy"
        rightLabel="Lưu"
        isRightDisabled={form.status !== 'ready' || form.isSaving}
        onRightPress={() => void form.submit()}
      />
      {renderBody()}
      <EventTrialLimitSheet isVisible={form.isLimitReached} onClose={form.closeLimit} />
      <DeleteEventSheet
        isVisible={isDeleteOpen}
        title={fields.title}
        isRecurring={fields.isRecurring}
        hasOccurrence={Boolean(occurrenceId)}
        isBusy={form.isSaving}
        onClose={() => setIsDeleteOpen(false)}
        onDelete={(scope) => {
          void form.remove(scope).then((isDeleted) => {
            if (!isDeleted) setIsDeleteOpen(false);
          });
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.screen, gap: spacing.md, paddingBottom: spacing.xl },
  group: { gap: spacing.sm },
  groupLabel: { fontFamily: fonts.medium, fontSize: fontSize.base, color: colors.text },
  required: { color: colors.danger },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dateRow: { flexDirection: 'row', gap: spacing.sm },
  dateCell: { flex: 1 },
  dateCellWide: { flex: 1.4 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  switchText: { flex: 1, gap: 2 },
  switchLabel: { fontFamily: fonts.medium, fontSize: fontSize.md, color: colors.text },
  hint: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.textMuted },
  error: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.danger },
  pickerList: { maxHeight: 320 },
  pickerRow: { flexDirection: 'row', paddingVertical: spacing.xs },
});
