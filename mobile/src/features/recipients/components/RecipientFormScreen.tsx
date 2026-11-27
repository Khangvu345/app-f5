import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Header } from '@/components/ui/Header';
import { Loading } from '@/components/ui/Loading';
import { Screen } from '@/components/ui/Screen';
import { SelectField, type SelectOption } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { colors, fonts, fontSize, spacing } from '@/theme';

import { useRecipientForm } from '../hooks/useRecipientForm';
import {
  AGE_GROUP_LABELS,
  RELATIONSHIP_LABELS,
  RELATIONSHIPS,
  type AgeGroup,
  type Relationship,
} from '../types/recipients.types';
import { NAME_MAX, NOTES_MAX } from '../utils/recipientForm';

import { DeleteRecipientDialog } from './DeleteRecipientDialog';
import { TagEditor } from './TagEditor';
import { TrialLimitSheet } from './TrialLimitSheet';

type AgeChoice = AgeGroup | 'NONE';

interface Props {
  /** Có `recipientId` là sửa, không có là tạo mới. */
  recipientId?: string;
}

const RELATIONSHIP_OPTIONS: readonly SelectOption<Relationship>[] = RELATIONSHIPS.map((value) => ({
  value,
  label: RELATIONSHIP_LABELS[value],
}));

const AGE_OPTIONS: readonly SelectOption<AgeChoice>[] = [
  { value: 'NONE', label: 'Không chọn' },
  ...(Object.keys(AGE_GROUP_LABELS) as AgeGroup[]).map((value) => ({
    value,
    label: AGE_GROUP_LABELS[value],
  })),
];

export function RecipientFormScreen({ recipientId }: Props) {
  const form = useRecipientForm(recipientId);
  const { values, errors, setValue } = form;

  if (form.status === 'loading') {
    return (
      <Screen isFlush edges={['left', 'right']}>
        <Header variant="bar" title="Sửa người nhận" leftLabel="Huỷ" />
        <Loading />
      </Screen>
    );
  }
  if (form.status === 'notFound' || form.status === 'error') {
    return (
      <Screen isFlush edges={['left', 'right']}>
        <Header variant="bar" title="Sửa người nhận" leftLabel="Huỷ" />
        <ErrorState
          message={
            form.status === 'notFound'
              ? 'Không tìm thấy hồ sơ người nhận này.'
              : 'Không tải được hồ sơ người nhận.'
          }
        />
      </Screen>
    );
  }

  return (
    <Screen isFlush edges={['left', 'right']}>
      <Header
        variant="bar"
        title={form.isEditing ? 'Sửa người nhận' : 'Thêm người nhận'}
        leftLabel="Huỷ"
        rightLabel="Lưu"
        onRightPress={form.submit}
        isRightDisabled={form.isSaving}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <TextField
            label="Tên hoặc cách gọi"
            isRequired
            value={values.name}
            maxLength={NAME_MAX}
            error={errors.name}
            onChangeText={(text) => setValue('name', text)}
          />
          <View style={styles.pair}>
            <View style={styles.half}>
              <SelectField
                label="Quan hệ"
                value={values.relationship}
                options={RELATIONSHIP_OPTIONS}
                onChange={(value) => setValue('relationship', value)}
              />
            </View>
            <View style={styles.half}>
              <SelectField
                label="Nhóm tuổi"
                optionalText="(tùy chọn)"
                value={values.ageGroup ?? 'NONE'}
                options={AGE_OPTIONS}
                onChange={(value) => setValue('ageGroup', value === 'NONE' ? null : value)}
              />
            </View>
          </View>

          <View style={styles.birth}>
            <Text style={styles.birthTitle}>
              Ngày sinh<Text style={styles.optional}> (tùy chọn)</Text>
            </Text>
            <View style={styles.birthRow}>
              <View style={styles.dayMonth}>
                <TextField
                  label="Ngày"
                  value={values.birthDay}
                  keyboardType="number-pad"
                  maxLength={2}
                  onChangeText={(text) => setValue('birthDay', text)}
                />
              </View>
              <View style={styles.dayMonth}>
                <TextField
                  label="Tháng"
                  value={values.birthMonth}
                  keyboardType="number-pad"
                  maxLength={2}
                  onChangeText={(text) => setValue('birthMonth', text)}
                />
              </View>
              <View style={styles.year}>
                <TextField
                  label="Năm"
                  value={values.birthYear}
                  keyboardType="number-pad"
                  maxLength={4}
                  onChangeText={(text) => setValue('birthYear', text)}
                />
              </View>
            </View>
            {errors.birth ? <Text style={styles.error}>{errors.birth}</Text> : null}
          </View>

          <TagEditor
            title="Sở thích"
            tags={values.likes}
            tone="primary"
            placeholder="Thêm sở thích, VD: đọc sách"
            onChange={(tags) => setValue('likes', tags)}
          />
          <TagEditor
            title="Điều cần tránh"
            optionalText="(dị ứng, không thích…)"
            tags={values.avoids}
            tone="warning"
            placeholder="Thêm điều cần tránh, VD: hoa phấn"
            onChange={(tags) => setValue('avoids', tags)}
          />

          <TextField
            label="Ghi chú riêng tư"
            multiline
            value={values.notes}
            maxLength={NOTES_MAX}
            error={errors.notes}
            hint="Chỉ mình bạn thấy. Không gửi cho AI."
            onChangeText={(text) => setValue('notes', text)}
          />

          {form.saveError ? <Text style={styles.error}>{form.saveError}</Text> : null}
          {form.isEditing ? (
            <Button
              title="Xóa người nhận"
              variant="danger"
              icon="trash-outline"
              onPress={form.requestDelete}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <DeleteRecipientDialog
        isVisible={form.deleteImpact !== null}
        name={values.name.trim() || 'người này'}
        impact={form.deleteImpact}
        isDeleting={form.isDeleting}
        onCancel={form.cancelDelete}
        onConfirm={form.confirmDelete}
      />
      <TrialLimitSheet isVisible={form.isLimitReached} onClose={form.dismissLimit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: spacing.screen,
    paddingTop: 14,
    gap: spacing.md + 4,
    paddingBottom: spacing.xl,
  },
  pair: { flexDirection: 'row', gap: spacing.sm + 2 },
  half: { flex: 1 },
  birth: { gap: spacing.sm },
  birthTitle: { fontFamily: fonts.semiBold, fontSize: fontSize.sm, color: colors.text },
  optional: { fontFamily: fonts.regular, color: colors.textMuted },
  birthRow: { flexDirection: 'row', gap: spacing.sm + 2 },
  dayMonth: { flex: 1 },
  year: { flex: 1.4 },
  error: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.danger },
});
