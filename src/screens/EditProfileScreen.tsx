import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ChevronLeft, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import type { MainStackParamList } from '../navigation/MainStack';
import { supabase } from '../lib/supabase';
import { useSupabaseSession } from '../lib/useSupabaseSession';
import { useThemeColors } from '../theme/useThemeColors';
import { triggerSelection, triggerImpact } from '../lib/haptics';
import AvatarPlaceholderSvg from '../../assets/profile/avatar.svg';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const navigation = useNavigation<Nav>();
  const { session } = useSupabaseSession();
  const userId = session?.user?.id;

  const [fullName, setFullName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const email = session?.user?.email ?? '';

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', userId)
          .single();

        if (cancelled) return;
        if (data) {
          setFullName(data.full_name ?? '');
          setAvatarUrl(data.avatar_url ?? null);
        } else {
          const name =
            session?.user?.user_metadata?.full_name ||
            session?.user?.user_metadata?.name;
          setFullName(name ?? '');
          setAvatarUrl(
            session?.user?.user_metadata?.avatar_url ||
              session?.user?.user_metadata?.picture ||
              null
          );
        }
      } catch {
        if (cancelled) return;
        const name =
          session?.user?.user_metadata?.full_name ||
          session?.user?.user_metadata?.name;
        setFullName(name ?? '');
        setAvatarUrl(
          session?.user?.user_metadata?.avatar_url ||
            session?.user?.user_metadata?.picture ||
            null
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, session?.user?.user_metadata]);

  const displayAvatar = avatarUri ?? avatarUrl;

  const handleChangePhoto = async () => {
    triggerSelection();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string): Promise<string | null> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const contentType = fileExt === 'png' ? 'image/png' : 'image/jpeg';
      const filename = `${userId}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filename, decode(base64), {
          contentType,
          upsert: false,
        });

      if (error) {
        console.error('Avatar upload error:', error);
        return null;
      }

      const { data: publicData } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path);

      return publicData.publicUrl;
    } catch (err) {
      console.error('Avatar upload error:', err);
      return null;
    }
  };

  const handleSave = async () => {
    if (!userId || saving) return;

    setSaving(true);
    triggerImpact();

    try {
      let finalAvatarUrl = avatarUrl;
      if (avatarUri) {
        const url = await uploadAvatar(avatarUri);
        if (url) finalAvatarUrl = url;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          avatar_url: finalAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim() || undefined,
          avatar_url: finalAvatarUrl || undefined,
        },
      });

      navigation.goBack();
    } catch (err) {
      console.error('Error saving profile:', err);
      Alert.alert('Error', 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background.bgAlt }]}>
        <ActivityIndicator size="large" color={colors.text.textBrand} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background.bgAlt, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => {
            triggerSelection();
            navigation.goBack();
          }}
        >
          <ChevronLeft size={28} color={colors.text.textBase} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.textBase }]}>Edit Profile</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.text.textBrand} />
          ) : (
            <Check size={26} color={colors.text.textBrand} strokeWidth={2.5} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.avatarSection} onPress={handleChangePhoto}>
          {displayAvatar ? (
            <Image source={{ uri: displayAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <AvatarPlaceholderSvg width={100} height={100} />
            </View>
          )}
          <Text style={[styles.changePhotoText, { color: colors.text.textBrand }]}>
            Change Profile Photo
          </Text>
        </TouchableOpacity>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text.textBase }]}>Full Name</Text>
          <TextInput
            style={[styles.input, { color: colors.text.textBase, borderColor: colors.border.border3 }]}
            placeholder="Full Name"
            placeholderTextColor={colors.text.textTertiary}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text.textBase }]}>Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background.bgBaseElevated, color: colors.text.textAlt, borderColor: colors.border.border3 }]}
            value={email}
            editable={false}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoText: {
    fontSize: 16,
    fontWeight: '500',
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
  },
});
