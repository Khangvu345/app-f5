import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '@/theme';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  optionalText?: string;
  isRequired?: boolean;
}

export function TextField({
  label,
  error,
  hint,
  optionalText,
  isRequired,
  multiline,
  style,
  ...inputProps
}: Props) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {isRequired ? <Text style={styles.required}> *</Text> : null}
        {optionalText ? <Text style={styles.optional}> {optionalText}</Text> : null}
      </View>
      <TextInput
        placeholderTextColor={colors.placeholder}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          styles.input,
          multiline ? styles.multiline : null,
          error ? styles.inputError : null,
          style,
        ]}
        {...inputProps}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm - 2 },
  labelRow: { flexDirection: 'row', alignItems: 'center' },
  label: { fontFamily: fonts.semiBold, fontSize: fontSize.sm, color: colors.text },
  required: { fontFamily: fonts.semiBold, fontSize: fontSize.sm, color: colors.danger },
  optional: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.textMuted },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm + 4,
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: colors.text,
  },
  multiline: { minHeight: 79, paddingTop: 10 },
  inputError: { borderColor: colors.danger },
  error: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.danger },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
});
