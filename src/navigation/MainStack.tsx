import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabs from './MainTabs';
import SnapHistoryScreen from '../screens/SnapHistoryScreen';
import BlogScreen from '../screens/BlogScreen';
import BlogItemScreen from '../screens/BlogItemScreen';
import CollectionDetailScreen from '../screens/CollectionDetailScreen';
import CommunityPostScreen from '../screens/CommunityPostScreen';
import CommunityNewPostScreen from '../screens/CommunityNewPostScreen';
import CommunityReplyScreen from '../screens/CommunityReplyScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ScannerScreen from '../screens/ScannerScreen';
import ScanResultScreen from '../screens/ScanResultScreen';
import type { BlogPost } from '../types/blog';
import type { CollectionRow } from '../screens/tabs/CollectionsScreen';
import type { CommunityPost } from '../types/community';

export type MainStackParamList = {
  MainTabs: undefined;
  SnapHistory: undefined;
  Blog: undefined;
  BlogItem: { post: BlogPost };
  CollectionDetail: { collection: CollectionRow };
  CommunityPost: { post: CommunityPost };
  CommunityNewPost: { post?: CommunityPost };
  CommunityReply: { post: CommunityPost };
  EditProfile: undefined;
  ScannerScreen: undefined;
  ScanResult: { coin: any };
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fff' },
        animation: 'slide_from_right',
        fullScreenGestureEnabled: true,
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="SnapHistory" component={SnapHistoryScreen} />
      <Stack.Screen name="Blog" component={BlogScreen} />
      <Stack.Screen name="BlogItem" component={BlogItemScreen} />
      <Stack.Screen name="CollectionDetail" component={CollectionDetailScreen} />
      <Stack.Screen name="CommunityPost" component={CommunityPostScreen} />
      <Stack.Screen name="CommunityNewPost" component={CommunityNewPostScreen} />
      <Stack.Screen name="CommunityReply" component={CommunityReplyScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="ScannerScreen" component={ScannerScreen} />
      <Stack.Screen name="ScanResult" component={ScanResultScreen} />
    </Stack.Navigator>
  );
}
