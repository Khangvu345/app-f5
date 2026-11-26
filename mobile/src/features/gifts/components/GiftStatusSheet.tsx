import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button, TextField } from '@/components/ui';
import { colors, fonts, fontSize, spacing } from '@/theme';

import type { Gift, GiftStatus, GiftTransitionInput } from '../types/gifts.types';
import { formatEstimateFromX100, formatVndInput, parseVndInput } from '../utils/formatVnd';
import { displayToIso, formatOccasion, isoToDisplay, todayIso } from '../utils/giftDate';
import {
  getNextStatuses,
  GIFT_STATUS_HINTS,
  GIFT_STATUS_LABELS,
  GIFT_STATUS_TRANSITIONS,
} from '../utils/giftStatus';

interface Props {
  gift: Gift;
  onClose: () => void;
  /** Lưu việc chuyển trạng thái; ném lỗi nếu thất bại. */
  onSubmit: (input: GiftTransitionInput) => Promise<void>;
  /** Chuyển sang màn ghi nhận đã tặng (cần ngày tặng, giá, phản hồi). */
  onRecordGiven: () => void;
}

const STATUS_ORDER = Object.keys(GIFT_STATUS_TRANSITIONS) as GiftStatus[];

export function GiftStatusSheet({ gift, onClose, onSubmit, onRecordGiven }: Props) {
  const [selected, setSelected] = useState<GiftStatus>(gift.status);
  const [dateText, setDateText] = useState(isoToDisplay(todayIso()));
  const [amountText, setAmountText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const allowed = getNextStatuses(gift.status);
  const options = STATUS_ORDER.filter(
    (status) => status === gift.status || allowed.includes(status),
  );
  const occasion = formatOccasion(gift.occasionTitle, gift.occasionDate);
  const subtitleParts = [gift.recipientName];
  if (occasion) subtitleParts.push(occasion);
  if (gift.estimatedAmountX100 !== null) {
    subtitleParts.push(`${formatEstimateFromX100(gift.estimatedAmountX100)} ước tính`);
  }

  const isUnchanged = selected === gift.status;
  const buttonTitle = selected === 'GIVEN' ? 'Tiếp tục ghi nhận' : 'Cập nhật trạng thái';

  async function handleSubmit() {
    if (selected === 'GIVEN') {
      onRecordGiven();
      return;
    }
    const date = displayToIso(dateText);
    if (selected === 'PURCHASED' && !date) {
      setErrorMessage('Ngày mua chưa hợp lệ. Hãy nhập theo dạng 03/11/2026.');
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await onSubmit({
        to: selected,
        date: date ?? todayIso(),
        amountVnd: selected === 'PURCHASED' ? parseVndInput(amountText) : null,
      });
    } catch {
      setErrorMessage('Không thể cập nhật trạng thái. Vui lòng thử lại.');
      setIsSaving(false);
    }
  }

  return (
    <BottomSheet isVisible onClose={onClose}>
      <View style={styles.header}>
        <Text numberOfLines={2} style={styles.title}>
          {gift.name}
        </Text>
        <Text style={styles.subtitle}>{subtitleParts.join(' · ')}</Text>
      </View>
      <View>
        {options.map((status) => {
          const isCurrent = status === gift.status;
          const isSelected = status === selected;
          return (
            <Pressable
              key={status}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              onPress={() => {
                setSelected(status);
                setErrorMessage(null);
              }}
              style={styles.option}
            >
              <View style={[styles.radio, isSelected && styles.radioSelected]} />
              <View style={styles.optionText}>
                <Text style={styles.optionLabel}>{GIFT_STATUS_LABELS[status]}</Text>
                <Text style={styles.optionHint}>{GIFT_STATUS_HINTS[status]}</Text>
              </View>
              {isCurrent ? <Text style={styles.optionHint}>Hiện tại</Text> : null}
            </Pressable>
          );
        })}
      </View>
      {selected === 'PURCHASED' ? (
        <View style={styles.fields}>
          <TextField
            label="Ngày mua"
            isRequired
            value={dateText}
            onChangeText={setDateText}
            placeholder="03/11/2026"
            keyboardType="numbers-and-punctuation"
          />
          <TextField
            label="Giá thực tế (đ)"
            optionalText="(không bắt buộc)"
            value={amountText}
            onChangeText={(text) => setAmountText(formatVndInput(text))}
            placeholder="820.000"
            keyboardType="number-pad"
          />
        </View>
      ) : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      <Button
        title={buttonTitle}
        onPress={() => void handleSubmit()}
        loading={isSaving}
        disabled={isUnchanged}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  title: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: fontSize.base, color: colors.textMuted },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.dashed,
  },
  radioSelected: { borderWidth: 7, borderColor: colors.primary },
  optionText: { flex: 1 },
  optionLabel: { fontFamily: fonts.semiBold, fontSize: fontSize.md, color: colors.text },
  optionHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  fields: { gap: spacing.md },
  error: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.danger },
});
