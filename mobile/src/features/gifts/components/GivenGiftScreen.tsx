import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  ErrorState,
  Header,
  Loading,
  Screen,
  SelectField,
  TextField,
} from '@/components/ui';
import { newOperationId } from '@/services/storage/local-db';
import type { LocalProfile } from '@/services/storage/local-storage';
import { useAuthStore } from '@/store/auth.store';
import { colors, fonts, fontSize, radius, spacing } from '@/theme';

import { createGivenGift } from '../api/gifts.api';
import { useGift } from '../hooks/useGift';
import { useGiftFormOptions } from '../hooks/useGiftFormOptions';
import { useGiftsStore } from '../store/gifts.store';
import type { Gift, GiftReaction } from '../types/gifts.types';
import { formatEstimateFromX100, formatVndInput, parseVndInput } from '../utils/formatVnd';
import { displayToIso, formatOccasion, isoToDisplay, todayIso } from '../utils/giftDate';
import { getTransitionPath } from '../utils/giftStatus';

import { ReactionChips } from './ReactionChips';
import { SegmentedControl } from './SegmentedControl';

type Mode = 'PURCHASED' | 'GIVEN';

/**
 * Ghi nhận quà (SCR-13): đánh dấu một món đã có là đã mua/đã tặng,
 * hoặc ghi nhận món đã tặng chưa từng lưu (khi không có `giftId`).
 */
export function GivenGiftScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { giftId } = useLocalSearchParams<{ giftId?: string }>();
  const { gift, isLoading, errorMessage, reload } = useGift(giftId ? profile : null, giftId);

  if (!profile) return <Loading />;
  if (giftId) {
    if (isLoading) return <Loading />;
    const canRecord = gift ? getTransitionPath(gift.status, 'GIVEN') : null;
    if (errorMessage || !gift || !canRecord || canRecord.length === 0) {
      return (
        <Screen isFlush edges={['left', 'right', 'bottom']}>
          <Header variant="bar" title="Ghi nhận quà" leftLabel="Huỷ" />
          <ErrorState
            message={errorMessage ?? 'Món quà này không thể ghi nhận là đã tặng.'}
            onRetry={errorMessage ? () => reload() : undefined}
          />
        </Screen>
      );
    }
  }
  return <GivenGiftForm profile={profile} gift={gift} />;
}

interface FormProps {
  profile: LocalProfile;
  gift: Gift | null;
}

function GivenGiftForm({ profile, gift }: FormProps) {
  const params = useLocalSearchParams<{ recipientId?: string; occurrenceId?: string }>();
  const transition = useGiftsStore((s) => s.transition);

  const canMarkPurchased = gift
    ? gift.status !== 'PURCHASED' && (getTransitionPath(gift.status, 'PURCHASED')?.length ?? 0) > 0
    : false;
  const [mode, setMode] = useState<Mode>('GIVEN');
  const [recipientId, setRecipientId] = useState(params.recipientId ?? '');
  const [occurrenceId, setOccurrenceId] = useState(params.occurrenceId ?? '');
  const [name, setName] = useState('');
  const [dateText, setDateText] = useState(isoToDisplay(todayIso()));
  const [amountText, setAmountText] = useState('');
  const [extraText, setExtraText] = useState('');
  const [reaction, setReaction] = useState<GiftReaction | null>(gift?.reaction ?? null);
  const [note, setNote] = useState(gift?.note ?? '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const operationId = useRef(newOperationId('idea'));

  const { recipients, occurrences } = useGiftFormOptions(
    gift ? null : profile,
    gift ? null : recipientId || null,
  );
  const recipientOptions = recipients.map((item) => ({ value: item.id, label: item.name }));
  const occurrenceOptions = [
    { value: '', label: 'Không gắn với dịp nào' },
    ...occurrences.map((item) => ({
      value: item.id,
      label: formatOccasion(item.title, item.date) ?? item.title,
    })),
  ];

  const isGiven = mode === 'GIVEN';
  const dateLabel = isGiven ? 'Ngày tặng' : 'Ngày mua';
  const saveTitle = isGiven ? 'Lưu – đánh dấu đã tặng' : 'Lưu – đánh dấu đã mua';

  async function handleSave() {
    const errors: Record<string, string> = {};
    const date = displayToIso(dateText);
    if (!date) errors.date = 'Ngày chưa hợp lệ. Hãy nhập theo dạng 03/11/2026.';
    const amountVnd = parseVndInput(amountText);
    if (amountText.trim() !== '' && amountVnd === null) errors.amount = 'Giá chưa hợp lệ.';
    const extraVnd = parseVndInput(extraText);
    if (extraText.trim() !== '' && extraVnd === null) errors.extra = 'Chi phí chưa hợp lệ.';
    const trimmedName = name.trim();
    if (!gift) {
      if (!recipientId) errors.recipient = 'Hãy chọn người nhận.';
      if (trimmedName.length < 1 || trimmedName.length > 200) {
        errors.name = 'Tên món quà cần từ 1 đến 200 ký tự.';
      }
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !date) return;

    setIsSaving(true);
    setSubmitError(null);
    try {
      if (gift) {
        await transition(profile, gift.id, {
          to: mode,
          date,
          amountVnd,
          extraVnd,
          reaction: isGiven ? reaction : null,
          note: note.trim() || null,
        });
      } else {
        const result = await createGivenGift(
          profile,
          {
            recipientId,
            occurrenceId: occurrenceId || null,
            name: trimmedName,
            givenOn: date,
            amountVnd,
            extraVnd,
            reaction,
            note: note.trim() || null,
          },
          operationId.current,
        );
        if (result === 'limit-reached') {
          setIsLimitReached(true);
          setIsSaving(false);
          return;
        }
      }
      router.back();
    } catch {
      setSubmitError('Không thể lưu. Vui lòng thử lại.');
      setIsSaving(false);
    }
  }

  const occasion = gift ? formatOccasion(gift.occasionTitle, gift.occasionDate) : null;

  return (
    <Screen isFlush edges={['left', 'right', 'bottom']}>
      <Header variant="bar" title="Ghi nhận quà" leftLabel="Huỷ" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {gift ? (
            <Card style={styles.summary}>
              <Text numberOfLines={2} style={styles.summaryName}>
                {gift.name}
              </Text>
              <Text style={styles.summarySub}>
                {occasion ? `${gift.recipientName} · ${occasion}` : gift.recipientName}
              </Text>
            </Card>
          ) : (
            <>
              <View style={styles.field}>
                <SelectField
                  label="Người nhận"
                  isRequired
                  value={recipientId || null}
                  options={recipientOptions}
                  placeholder="Chọn người nhận"
                  onChange={(value) => {
                    setRecipientId(value);
                    setOccurrenceId('');
                  }}
                />
                {fieldErrors.recipient ? (
                  <Text style={styles.error}>{fieldErrors.recipient}</Text>
                ) : null}
              </View>
              <SelectField
                label="Dịp tặng"
                optionalText="(không bắt buộc)"
                value={occurrenceId}
                options={occurrenceOptions}
                placeholder="Không gắn với dịp nào"
                onChange={setOccurrenceId}
              />
              <TextField
                label="Tên món quà"
                isRequired
                value={name}
                onChangeText={setName}
                placeholder="Ví dụ: Bộ ấm trà gốm men lam"
                maxLength={200}
                error={fieldErrors.name}
              />
            </>
          )}
          {canMarkPurchased ? (
            <SegmentedControl
              options={[
                { value: 'PURCHASED', label: 'Đã mua' },
                { value: 'GIVEN', label: 'Đã tặng' },
              ]}
              value={mode}
              onChange={setMode}
            />
          ) : null}
          <TextField
            label={dateLabel}
            value={dateText}
            onChangeText={setDateText}
            placeholder="03/11/2026"
            keyboardType="numbers-and-punctuation"
            error={fieldErrors.date}
          />
          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <TextField
                label="Giá thực tế (đ)"
                value={amountText}
                onChangeText={(text) => setAmountText(formatVndInput(text))}
                placeholder="820.000"
                keyboardType="number-pad"
                error={fieldErrors.amount}
              />
            </View>
            <View style={styles.column}>
              <TextField
                label="Chi phí phụ (đ)"
                value={extraText}
                onChangeText={(text) => setExtraText(formatVndInput(text))}
                placeholder="Gói quà, ship…"
                keyboardType="number-pad"
                error={fieldErrors.extra}
              />
            </View>
          </View>
          <Text style={styles.hint}>
            {gift?.estimatedAmountX100
              ? `Giá ước tính trước đó: ${formatEstimateFromX100(gift.estimatedAmountX100).slice(1)}. `
              : ''}
            Chỉ giá thực tế bạn nhập mới được tính vào chi tiêu.
          </Text>
          {isGiven ? (
            <View style={styles.field}>
              <Text style={styles.label}>
                Phản hồi của người nhận <Text style={styles.optional}>(không bắt buộc)</Text>
              </Text>
              <ReactionChips value={reaction} onChange={setReaction} />
            </View>
          ) : null}
          <TextField
            label="Ghi chú"
            optionalText="(không bắt buộc)"
            value={note}
            onChangeText={setNote}
            placeholder="Nơi mua, bảo hành…"
            multiline
          />
          {isLimitReached ? (
            <View style={styles.limit}>
              <Text style={styles.limitText}>
                Bạn đã hết lượt dùng thử cho ý tưởng quà. Đăng nhập để lưu thêm không giới hạn.
              </Text>
              <Button
                title="Đăng nhập"
                variant="secondary"
                onPress={() => router.push('/(auth)/login')}
              />
            </View>
          ) : null}
          {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
        </ScrollView>
        <View style={styles.footer}>
          <Button title={saveTitle} onPress={() => void handleSave()} loading={isSaving} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.screen, gap: spacing.md, paddingBottom: spacing.lg },
  field: { gap: spacing.sm },
  summary: { paddingHorizontal: 14, paddingVertical: 12, gap: 2 },
  summaryName: { fontFamily: fonts.semiBold, fontSize: fontSize.lg - 1, color: colors.text },
  summarySub: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.textMuted },
  twoColumns: { flexDirection: 'row', gap: 10 },
  column: { flex: 1 },
  label: { fontFamily: fonts.semiBold, fontSize: fontSize.sm, color: colors.text },
  optional: { fontFamily: fonts.regular, color: colors.textMuted },
  hint: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted },
  error: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.danger },
  footer: {
    paddingHorizontal: spacing.screen,
    paddingTop: 12,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.background,
  },
  limit: {
    gap: spacing.sm + 4,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.warningSoft,
  },
  limitText: { fontFamily: fonts.medium, fontSize: fontSize.base, color: colors.warningText },
});
