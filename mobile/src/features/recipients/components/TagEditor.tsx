import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { colors, fonts, fontSize, radius, spacing } from '@/theme';

import { PREFERENCE_MAX } from '../utils/recipientForm';

interface Props {
  title: string;
  optionalText?: string;
  tags: readonly string[];
  tone: 'primary' | 'warning';
  placeholder: string;
  onChange: (tags: string[]) => void;
}

/**
 * Sở thích (`primary`): luôn hiện ô nhập kèm nút Thêm.
 * Điều cần tránh (`warning`): chip "+ Thêm" mở ô nhập.
 */
export function TagEditor({ title, optionalText, tags, tone, placeholder, onChange }: Props) {
  const [draft, setDraft] = useState('');
  const [isInputOpen, setIsInputOpen] = useState(tone === 'primary');
  const isDuplicate = tags.some((tag) => tag.toLowerCase() === draft.trim().toLowerCase());

  function handleAdd() {
    const value = draft.trim();
    if (!value || isDuplicate) return;
    onChange([...tags, value]);
    setDraft('');
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>
        {title}
        {optionalText ? <Text style={styles.optional}> {optionalText}</Text> : null}
      </Text>
      <View style={styles.chips}>
        {tags.map((tag) => (
          <Chip
            key={tag}
            label={tag}
            tone={tone}
            onRemove={() => onChange(tags.filter((item) => item !== tag))}
          />
        ))}
        {tone === 'warning' && !isInputOpen ? (
          <Chip label="+ Thêm" tone="add" onPress={() => setIsInputOpen(true)} />
        ) : null}
      </View>
      {isInputOpen ? (
        <View style={styles.inputRow}>
          <TextInput
            accessibilityLabel={placeholder}
            placeholder={placeholder}
            placeholderTextColor={colors.placeholder}
            value={draft}
            maxLength={PREFERENCE_MAX}
            returnKeyType="done"
            onChangeText={setDraft}
            onSubmitEditing={handleAdd}
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Thêm ${title.toLowerCase()}`}
            disabled={!draft.trim() || isDuplicate}
            onPress={handleAdd}
            style={[styles.add, (!draft.trim() || isDuplicate) && styles.addDisabled]}
          >
            <Text style={styles.addLabel}>Thêm</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm + 2 },
  title: { fontFamily: fonts.semiBold, fontSize: fontSize.sm, color: colors.text },
  optional: { fontFamily: fonts.regular, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  inputRow: { flexDirection: 'row', gap: spacing.sm },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm + 4,
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: colors.text,
  },
  add: {
    minHeight: 44,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  addDisabled: { opacity: 0.5 },
  addLabel: { fontFamily: fonts.semiBold, fontSize: fontSize.base, color: colors.primary },
});
