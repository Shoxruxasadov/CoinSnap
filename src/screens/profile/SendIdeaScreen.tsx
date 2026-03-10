import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { useThemeColors } from '../../theme/useThemeColors';
import { supabase } from '../../lib/supabase';
import { useSupabaseSession } from '../../lib/useSupabaseSession';
import { triggerSelection, triggerImpact } from '../../lib/haptics';

export default function SendIdeaScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const { session } = useSupabaseSession();
  const userId = session?.user?.id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);

  const handleBack = () => {
    triggerSelection();
    navigation.goBack();
  };

  const handleSend = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please describe your idea');
      return;
    }

    triggerImpact();
    setSending(true);

    const { error } = await supabase.from('feature_requests').insert({
      title: title.trim(),
      description: description.trim(),
      user_id: userId ?? null,
      votes: 0,
    });

    setSending(false);

    if (error) {
      Alert.alert('Error', 'Failed to send your idea. Please try again.');
      return;
    }

    Alert.alert('Success', 'Your idea has been submitted!', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  const canSend = title.trim().length > 0 && description.trim().length > 0 && !sending;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background.bgAlt}]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <ChevronLeft size={28} color={colors.text.textBase} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.textBase }]}>Send Idea</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.text.textBase }]}>Title</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface.onBgAlt, color: colors.text.textBase }]}
          placeholder="Write a title"
          placeholderTextColor={colors.text.textTertiary}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />

        <Text style={[styles.label, { color: colors.text.textBase, marginTop: 20 }]}>Idea</Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            { backgroundColor: colors.surface.onBgAlt, color: colors.text.textBase },
          ]}
          placeholder="Describe your idea"
          placeholderTextColor={colors.text.textTertiary}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          maxLength={1000}
        />
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: canSend ? colors.background.brand : colors.border.border2 },
          ]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.sendBtnText,
              { color: canSend ? colors.text.textWhite : colors.text.textTertiary },
            ]}
          >
            {sending ? 'Sending...' : 'Send'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 56,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    paddingTop: 14,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sendBtn: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
