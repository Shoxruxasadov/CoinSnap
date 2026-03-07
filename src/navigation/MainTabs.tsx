import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { triggerSelection } from '../lib/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/tabs/HomeScreen';
import CollectionsScreen from '../screens/tabs/CollectionsScreen';
import ScanScreen from '../screens/tabs/ScanScreen';
import CommunityScreen from '../screens/tabs/CommunityScreen';
import ProfileScreen from '../screens/tabs/ProfileScreen';
import { useThemeColors } from '../theme/useThemeColors';
import {
  HomeIcon,
  FolderIcon,
  ScanIcon,
  MessageIcon,
  UserIcon,
} from '../components/icons/NavigationIcons';

export type MainTabParamList = {
  Home: undefined;
  Collections: undefined;
  Scan: undefined;
  Community: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_CONFIG = [
  { name: 'Home' as const, label: 'Home', Icon: HomeIcon },
  { name: 'Collections' as const, label: 'Collections', Icon: FolderIcon },
  { name: 'Scan' as const, label: '', Icon: null },
  { name: 'Community' as const, label: 'Community', Icon: MessageIcon },
  { name: 'Profile' as const, label: 'Profile', Icon: UserIcon },
];

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.tabBar,
        {
          paddingBottom: insets.bottom + 8,
          backgroundColor: colors.background.bgAlt,
        },
      ]}
    >
      {state.routes.map((route: { name: string; key: string }, index: number) => {
        const isFocused = state.index === index;
        const config = TAB_CONFIG[index];

        const triggerTabHaptic = () => {
          triggerSelection();
        };

        if (config.name === 'Scan') {
          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabCenter}
              onPress={() => {
                triggerTabHaptic();
                const parent = navigation.getParent();
                if (parent) {
                  parent.navigate('ScannerScreen');
                } else {
                  navigation.navigate(route.name);
                }
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.scanButton, { backgroundColor: colors.background.brand }]}>
                <ScanIcon size={28} color={colors.text.textWhite} />
              </View>
            </TouchableOpacity>
          );
        }

        const onPress = () => {
          triggerTabHaptic();
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const IconComponent = config.Icon;
        const iconColor = isFocused ? colors.text.textBase : colors.text.textTertiary;

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tab}
            onPress={onPress}
            activeOpacity={0.7}
          >
            {IconComponent && <IconComponent size={24} color={iconColor} />}
            <Text
              style={[
                styles.tabLabel,
                { color: isFocused ? colors.text.textBase : colors.text.textTertiary },
              ]}
            >
              {config.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Collections" component={CollectionsScreen} />
      <Tab.Screen name="Scan" component={ScanScreen} />
      <Tab.Screen name="Community" component={CommunityScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: 12,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 12,
  },
  tabCenter: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  scanButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -8,
  },
});
