import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Button,
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

import { createIdea, updateGift } from '../api/gifts.api';
import { useGift } from '../hooks/useGift';
import { useGiftFormOptions } from '../hooks/useGiftFormOptions';
import type { Gift, GiftIdeaInput } from '../types/gifts.types';
import { formatVndInput, parseVndInput } from '../utils/formatVnd';
import { formatOccasion } from '../utils/giftDate';

interface Props {
  /** Có giá trị khi sửa ý tưởng; bỏ trống khi thêm mới. */
  giftId?: string;
}

/** Màn thêm/sửa ý tưởng quà thủ công (UC-11). */
export function GiftFormScreen({ giftId }: Props) {
  const profile = useAuthStore((s) => s.profile);
  const { gift, isLoading, errorMessage, reload } = useGift(giftId ? profile : null, giftId);

  if (!profile) return <Loading />;
  if (giftId) {
    if (isLoading) return <Loading />;
    if (errorMessage || !gift) {
      return (
        <Screen isFlush edges={['left', 'right', 'bottom']}>
          <Header variant="bar" title="Sửa ý tưởng quà" />
          <ErrorState
            message={errorMessage ?? 'Không tìm thấy món quà này.'}
            onRetry={() => reload()}
          />
        </Screen>
      );
    }
  }
  return <GiftForm profile={profile} gift={gift} />;
}

interface FormProps {
  profile: LocalProfile;
  gift: Gift | null;
}

function GiftForm({ profile, gift }: FormProps) {
  const params = useLocalSearchParams<{ recipientId?: string; occurrenceId?: string }>();
  const [recipientId, setRecipientId] = useState(gift?.recipientId ?? params.recipientId ?? '');
  const [occurrenceId, setOccurrenceId] = useState(gift?.occurrenceId ?? params.occurrenceId ?? '');
  const [name, setName] = useState(gift?.name ?? '');
  const [category, setCategory] = useState(gift?.category ?? '');
  const [amountText, setAmountText] = useState(
    gift?.estimatedAmountX100 ? formatVndInput(String(gift.estimatedAmountX100 / 100)) : '',
  );
  const [productUrl, setProductUrl] = useState(gift?.productUrl ?? '');
  const [note, setNote] = useState(gift?.note ?? '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const operationId = useRef(newOperationId('idea'));

  const { recipients, occurrences } = useGiftFormOptions(profile, recipientId || null);

  const recipientOptions = recipients.map((item) => ({ value: item.id, label: item.name }));
  const occurrenceOptions = [
    { value: '', label: 'Không gắn với dịp nào' },
    ...occurrences.map((item) => ({
      value: item.id,
      label: formatOccasion(item.title, item.date) ?? item.title,
    })),
  ];

  function validate(): GiftIdeaInput | null {
    const errors: Record<string, string> = {};
    const trimmedName = name.trim();
    if (!recipientId) errors.recipient = 'Hãy chọn người nhận.';
    if (trimmedName.length < 1 || trimmedName.length > 200) {
      errors.name = 'Tên món quà cần từ 1 đến 200 ký tự.';
    }
    if (category.trim().length > 80) errors.category = 'Nhóm quà tối đa 80 ký tự.';
    const estimatedVnd = parseVndInput(amountText);
    if (amountText.trim() !== '' && estimatedVnd === null) {
      errors.amount = 'Giá ước tính chưa hợp lệ.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return null;
    return {
      recipientId,
      occurrenceId: occurrenceId || null,
      name: trimmedName,
      category: category.trim() || null,
      estimatedVnd,
      productUrl: productUrl.trim() || null,
      note: note.trim() || null,
    };
  }

  async function handleSave() {
    const input = validate();
    if (!input) return;
    setIsSaving(true);
    setSubmitError(null);
    try {
      if (gift) {
        await updateGift(profile, gift.id, input);
        router.back();
        return;
      }
      const result = await createIdea(profile, input, operationId.current);
      if (result === 'limit-reached') {
        setIsLimitReached(true);
        setIsSaving(false);
        return;
      }
      router.back();
    } catch {
      setSubmitError('Không thể lưu ý tưởng quà. Vui lòng thử lại.');
      setIsSaving(false);
    }
  }

  return (
    <Screen isFlush edges={['left', 'right', 'bottom']}>
      <Header
        variant="bar"
        title={gift ? 'Sửa ý tưởng quà' : 'Thêm ý tưởng quà'}
        leftLabel="Huỷ"
        rightLabel="Lưu"
        onRightPress={() => void handleSave()}
        isRightDisabled={isSaving}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
            {recipients.length === 0 ? (
              <Text style={styles.hint}>
                Bạn chưa có người nhận nào. Hãy thêm người nhận trước khi lưu ý tưởng quà.
              </Text>
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
          <TextField
            label="Nhóm quà"
            optionalText="(không bắt buộc)"
            value={category}
            onChangeText={setCategory}
            placeholder="Ví dụ: Đồ gia dụng"
            maxLength={80}
            error={fieldErrors.category}
          />
          <TextField
            label="Giá ước tính (đ)"
            optionalText="(không bắt buộc)"
            value={amountText}
            onChangeText={(text) => setAmountText(formatVndInput(text))}
            placeholder="750.000"
            keyboardType="number-pad"
            hint="Giá này chỉ là ước tính, chưa tính vào chi tiêu."
            error={fieldErrors.amount}
          />
          <TextField
            label="Liên kết sản phẩm"
            optionalText="(không bắt buộc)"
            value={productUrl}
            onChangeText={setProductUrl}
            placeholder="https://"
            autoCapitalize="none"
            keyboardType="url"
          />
          <TextField
            label="Ghi chú"
            optionalText="(không bắt buộc)"
            value={note}
            onChangeText={setNote}
            placeholder="Nơi mua, lý do chọn…"
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
          <Button
            title={gift ? 'Lưu thay đổi' : 'Lưu ý tưởng'}
            onPress={() => void handleSave()}
            loading={isSaving}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.screen, gap: spacing.md, paddingBottom: spacing.xl },
  field: { gap: spacing.xs },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  error: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.danger },
  limit: {
    gap: spacing.sm + 4,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.warningSoft,
  },
  limitText: { fontFamily: fonts.medium, fontSize: fontSize.base, color: colors.warningText },
});
