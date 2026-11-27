import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { colors } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

interface Props {
  name: IconName;
  size?: number;
  color?: ComponentProps<typeof Ionicons>['color'];
}

export function Icon({ name, size = 20, color = colors.text }: Props) {
  return <Ionicons name={name} size={size} color={color} />;
}
