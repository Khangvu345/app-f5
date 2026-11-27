import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, fonts, fontSize, radius, spacing } from '@/theme';

interface Props {
  isVisible: boolean;
  onClose: () => void;
}

interface QuickAction {
  label: string;
  hint: string;
  icon: IconName;
  href: string;
}

const ACTIONS: readonly QuickAction[] = [
  {
    label: 'Người nhận',
    hint: 'Thêm người thân, bạn bè',
    icon: 'person-add-outline',
    href: '/recipients/new',
  },
  {
    label: 'Sự kiện',
    hint: 'Sinh nhật, kỷ niệm, ngày lễ',
    icon: 'calendar-outline',
    href: '/events/new',
  },
  {
    label: 'Ý tưởng quà',
    hint: 'Lưu món quà định tặng',
    icon: 'bulb-outline',
    href: '/gifts/new',
  },
  {
    label: 'Ghi nhận quà',
    hint: 'Đánh dấu quà đã tặng',
    icon: 'gift-outline',
    href: '/(app)/(tabs)/collection',
  },
];

export function QuickAddSheet({ isVisible, onClose }: Props) {
  function handleSelect(href: string) {
    onClose();
    router.push(href as never);
  }

  return (
    <BottomSheet isVisible={isVisible} title="Thêm nhanh" onClose={onClose}>
      <View style={styles.list}>
        {ACTIONS.map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            accessibilityLabel={`${action.label}. ${action.hint}`}
            onPress={() => handleSelect(action.href)}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <View style={styles.iconWrap}>
              <Icon name={action.icon} size={22} color={colors.primary} />
            </View>
            <View style={styles.text}>
              <Text style={styles.label}>{action.label}</Text>
              <Text style={styles.hint}>{action.hint}</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.7 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  text: { flex: 1, gap: 2 },
  label: { fontFamily: fonts.semiBold, fontSize: fontSize.md, color: colors.text },
  hint: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.textMuted },
});
