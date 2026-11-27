import { Tabs } from 'expo-router';

import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, fonts, fontSize } from '@/theme';

interface TabConfig {
  name: string;
  title: string;
  icon: IconName;
}

const TABS: readonly TabConfig[] = [
  { name: 'index', title: 'Trang chủ', icon: 'home-outline' },
  { name: 'calendar', title: 'Lịch', icon: 'calendar-outline' },
  { name: 'recipients', title: 'Người nhận', icon: 'people-outline' },
  { name: 'discover', title: 'Khám phá', icon: 'sparkles-outline' },
  { name: 'collection', title: 'Bộ sưu tập', icon: 'gift-outline' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.placeholder,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: fontSize.xs },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderSoft,
          borderTopWidth: 1,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused }) => (
              <Icon
                name={tab.icon}
                size={24}
                color={focused ? colors.primary : colors.placeholder}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
