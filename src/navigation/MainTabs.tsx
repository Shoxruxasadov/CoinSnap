import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { House, Folder, ChatCircle, User } from 'phosphor-react-native';
import HomeScreen from '../screens/tabs/HomeScreen';
import CollectionsScreen from '../screens/tabs/CollectionsScreen';
import ScanScreen from '../screens/tabs/ScanScreen';
import CommunityScreen from '../screens/tabs/CommunityScreen';
import ProfileScreen from '../screens/tabs/ProfileScreen';

const ACCENT = '#c9a227';

export type MainTabParamList = {
  Home: undefined;
  Collections: undefined;
  Scan: undefined;
  Community: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_CONFIG = [
  { name: 'Home' as const, label: 'Home', Icon: House },
  { name: 'Collections' as const, label: 'Collections', Icon: Folder },
  { name: 'Scan' as const, label: '', Icon: null },
  { name: 'Community' as const, label: 'Community', Icon: ChatCircle },
  { name: 'Profile' as const, label: 'Profile', Icon: User },
];

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom + 8 }]}>
      {state.routes.map((route: { name: string; key: string }, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const config = TAB_CONFIG[index];

        const triggerTabHaptic = () => {
          try {
            Haptics.selectionAsync();
          } catch (_) {}
        };

        if (config.name === 'Scan') {
          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabCenter}
              onPress={() => {
                triggerTabHaptic();
                navigation.navigate(route.name);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.scanButton}>
                <View style={styles.scanIcon} />
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
        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tab}
            onPress={onPress}
            activeOpacity={0.7}
          >
            {IconComponent && (
              <IconComponent
                size={22}
                color={isFocused ? '#000' : '#999'}
                weight="regular"
                style={styles.tabIcon}
              />
            )}
            <Text style={[styles.tabLabel, isFocused && styles.tabActive]}>{config.label}</Text>
            {isFocused && <View style={styles.tabIndicator} />}
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
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabIcon: {
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    color: '#999',
  },
  tabActive: {
    color: '#000',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -2,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#000',
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
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -8,
  },
  scanIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#000',
  },
});
