import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ChevronLeft, X, Send, ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useThemeColors } from '../theme/useThemeColors';
import { useAssistantStore, AssistantMessage } from '../stores/useAssistantStore';
import { chatWithGemini } from '../lib/gemini';
import { triggerSelection } from '../lib/haptics';

const SUGGESTIONS = [
  'How can I identify a rare coin?',
  'What affects a coin\'s value?',
  'How do I grade my coins?',
];

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (_) {
    return '';
  }
}

function stripMarkdown(text: string) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^\s*\*\s+/gm, '• ');
}

type PendingImage = {
  uri: string;
  base64: string;
  mimeType: string;
} | null;

export default function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const messages = useAssistantStore((s) => s.messages);
  const addMessage = useAssistantStore((s) => s.addMessage);
  const listRef = useRef<FlatList>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState<PendingImage>(null);
  const [imageCaption, setImageCaption] = useState('');

  const userMessageCount = messages.filter((m) => m.role === 'user').length;
  const hasUserSentAny = userMessageCount > 0;
  const showSuggestions = !hasUserSentAny;
  const prevMessageCountRef = useRef(0);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.surface.onBgBase },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: colors.surface.onBgBase,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border.border3,
        },
        backBtn: { padding: 4 },
        headerTitle: { fontWeight: '700', fontSize: 18, color: colors.text.textBase },
        headerRight: { width: 32 },
        keyboardView: { flex: 1 },
        chatArea: { flex: 1, paddingHorizontal: 16, backgroundColor: colors.background.bgBaseElevated },
        list: { flex: 1 },
        messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16 },
        loadingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
        avatar: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', marginRight: 12 },
        avatarImage: { width: 40, height: 40 },
        bubbleWrapLeft: { flex: 1, alignItems: 'flex-start' },
        bubbleLeft: {
          backgroundColor: colors.surface.onBgBase,
          borderRadius: 16,
          borderBottomLeftRadius: 4,
          paddingVertical: 10,
          paddingHorizontal: 14,
          maxWidth: '85%',
        },
        bubbleText: { fontSize: 15, color: colors.text.textBase, lineHeight: 22 },
        timeInBubble: {
          fontSize: 11,
          color: colors.text.textTertiary,
          marginTop: 4,
          alignSelf: 'flex-end',
        },
        messageRowUser: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 },
        bubbleWrapRight: { maxWidth: '85%', alignItems: 'flex-end' },
        bubbleRight: {
          backgroundColor: colors.background.brand,
          borderRadius: 16,
          borderBottomRightRadius: 4,
          paddingVertical: 10,
          paddingHorizontal: 10,
          paddingLeft: 14,
        },
        bubbleRightImage: {
          backgroundColor: colors.background.brand,
          borderRadius: 16,
          borderBottomRightRadius: 4,
          overflow: 'hidden',
          maxWidth: 280,
        },
        msgImage: {
          width: 280,
          aspectRatio: 1,
          backgroundColor: colors.background.bgWhite,
          borderWidth: 8,
          borderRadius: 16,
          borderColor: colors.background.brand,
        },
        bubbleTextUser: {
          minWidth: 160,
          fontSize: 15,
          color: colors.text.textWhite,
          lineHeight: 22,
          paddingRight: 4,
        },
        timeInBubbleRight: {
          fontSize: 11,
          color: 'rgba(255,255,255,0.85)',
          marginTop: 4,
          marginRight: 4,
          alignSelf: 'flex-end',
        },
        suggestionsWrap: { paddingBottom: 12 },
        quickReply: {
          alignSelf: 'flex-start',
          backgroundColor: colors.background.brand,
          paddingVertical: 12,
          paddingHorizontal: 18,
          borderRadius: 20,
          marginBottom: 10,
        },
        quickReplyText: { fontWeight: '500', fontSize: 14, color: colors.text.textWhite },
        inputBar: {
          flexDirection: 'row',
          alignItems: 'flex-end',
          paddingHorizontal: 12,
          paddingTop: 12,
          backgroundColor: colors.surface.onBgBase,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border.border3,
        },
        inputBarIcon: {
          width: 44,
          height: 44,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.border.border2,
          borderRadius: 22,
          padding: 8,
          marginRight: 8,
        },
        inputBarInputWrap: {
          flex: 1,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.border.border2,
          flexDirection: 'row',
        },
        input: {
          flex: 1,
          fontSize: 16,
          color: colors.text.textBase,
          backgroundColor: colors.border.border2,
          borderRadius: 22,
          paddingVertical: 12,
          paddingLeft: 16,
        },
        sendBtn: {
          width: 44,
          height: 44,
          borderRadius: 22,
          justifyContent: 'center',
          alignItems: 'center',
        },
        sendBtnDisabled: { opacity: 0.5 },
        pendingImageBar: {
          flexDirection: 'row',
          alignItems: 'flex-end',
          paddingHorizontal: 12,
          paddingTop: 12,
          backgroundColor: colors.surface.onBgBase,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border.border3,
        },
        pendingPreview: {
          width: 44,
          height: 44,
          borderRadius: 8,
          marginRight: 8,
          overflow: 'hidden',
        },
        pendingThumb: { width: 44, height: 44, backgroundColor: colors.surface.onBgBase },
        removeImage: {
          position: 'absolute',
          top: 3,
          right: 3,
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: 'rgba(0,0,0,0.8)',
          justifyContent: 'center',
          alignItems: 'center',
        },
        captionInput: {
          flex: 1,
          fontSize: 16,
          color: colors.text.textBase,
          backgroundColor: colors.border.border2,
          borderRadius: 22,
          paddingVertical: 12,
          paddingLeft: 16,
        },
      }),
    [colors]
  );

  useEffect(() => {
    const count = messages.length;
    const prev = prevMessageCountRef.current;
    prevMessageCountRef.current = count;
    if (count > prev || pendingImage) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length, pendingImage]);

  // Scroll to bottom on initial mount
  useEffect(() => {
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: false });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = (text || '').trim();
      const caption = (imageCaption || '').trim();
      if (!trimmed && !pendingImage) return;

      triggerSelection();
      setInput('');
      const userText = trimmed || caption;
      const userMsg = {
        role: 'user' as const,
        text: userText,
        imageUri: pendingImage?.uri ?? null,
        timestamp: new Date().toISOString(),
      };
      addMessage(userMsg);
      const base64ToSend = pendingImage?.base64 ?? null;
      const mimeToSend = pendingImage?.mimeType ?? null;
      setPendingImage(null);
      setImageCaption('');
      setLoading(true);

      try {
        const history = messages
          .filter((m) => {
            if (m.role !== 'user' && m.role !== 'assistant') return false;
            if (
              m.role === 'assistant' &&
              (m.text || '').trim() === 'Sorry, something went wrong. Please try again.'
            )
              return false;
            return true;
          })
          .map((m) => ({
            role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
            text: m.text || '',
          }));

        const reply = await chatWithGemini(history, {
          text: userText || undefined,
          imageBase64: base64ToSend || undefined,
          mimeType: mimeToSend || undefined,
        });

        addMessage({
          role: 'assistant',
          text: reply,
          timestamp: new Date().toISOString(),
        });
      } catch (e: any) {
        const errMessage = e?.message || 'Unknown error';
        if (__DEV__) console.warn('Assistant error', errMessage, e);
        const isNetworkError =
          /network request failed|failed to fetch|network error|timeout|econnreset|enotfound/i.test(
            errMessage
          );
        const displayMessage = isNetworkError
          ? 'Please check your internet connection and try again.'
          : __DEV__
          ? `Error: ${errMessage}`
          : 'Sorry, something went wrong. Please try again.';
        addMessage({
          role: 'assistant',
          text: displayMessage,
          timestamp: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    },
    [messages, addMessage, pendingImage, imageCaption]
  );

  const onSend = () => {
    if (pendingImage) {
      sendText(imageCaption.trim());
      return;
    }
    sendText(input);
  };

  const onSuggestionPress = (text: string) => {
    setInput(text);
    sendText(text);
  };

  const openGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow access to photos to send images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setPendingImage({
        uri: asset.uri,
        base64: asset.base64 ?? '',
        mimeType: asset.uri?.toLowerCase?.().endsWith('.png') ? 'image/png' : 'image/jpeg',
      });
      setImageCaption('');
    } catch (e) {
      Alert.alert('Error', 'Could not pick image.');
    }
  };

  const renderItem = ({ item }: { item: AssistantMessage }) => {
    if (item.role === 'assistant' || item.id === 'welcome') {
      return (
        <View style={styles.messageRow}>
          <View style={styles.avatar}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          </View>
          <View style={styles.bubbleWrapLeft}>
            <View style={styles.bubbleLeft}>
              <Text style={styles.bubbleText}>
                {item.id === 'welcome'
                  ? "Hello! I'm your personal coin expert. Ask me anything about coins, their history, value, grading, or share a photo for analysis."
                  : stripMarkdown(item.text)}
              </Text>
              <Text style={styles.timeInBubble}>{formatTime(item.timestamp)}</Text>
            </View>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.messageRowUser}>
        <View style={styles.bubbleWrapRight}>
          {item.imageUri ? (
            <View style={styles.bubbleRightImage}>
              <Image source={{ uri: item.imageUri }} style={styles.msgImage} resizeMode="contain" />
              {item.text ? (
                <Text style={[styles.bubbleTextUser, { paddingHorizontal: 14, paddingVertical: 0 }]}>
                  {item.text}
                </Text>
              ) : null}
              <Text
                style={[styles.timeInBubbleRight, { paddingHorizontal: 10, paddingBottom: 10 }]}
              >
                {formatTime(item.timestamp)}
              </Text>
            </View>
          ) : (
            <View style={styles.bubbleRight}>
              <Text style={styles.bubbleTextUser}>{item.text}</Text>
              <Text style={styles.timeInBubbleRight}>{formatTime(item.timestamp)}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const listFooter = (
    <>
      {showSuggestions && (
        <View style={styles.suggestionsWrap}>
          {SUGGESTIONS.map((text, i) => (
            <Pressable key={i} style={styles.quickReply} onPress={() => onSuggestionPress(text)}>
              <Text style={styles.quickReplyText} numberOfLines={2}>
                {text}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {loading && (
        <View style={styles.loadingRow}>
          <View style={styles.avatar}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          </View>
          <View style={styles.bubbleLeft}>
            <ActivityIndicator size="small" color={colors.background.brand} />
          </View>
        </View>
      )}
    </>
  );

  const handleBack = () => {
    triggerSelection();
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={handleBack}>
          <ChevronLeft size={28} color={colors.text.textBase} />
        </Pressable>
        <Text style={styles.headerTitle}>Coin Expert</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.chatArea}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            ListFooterComponent={listFooter}
            style={styles.list}
            contentContainerStyle={{ paddingVertical: 16, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        </View>

        {pendingImage ? (
          <View style={[styles.pendingImageBar, { paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.pendingPreview}>
              <Image
                source={{ uri: pendingImage.uri }}
                style={styles.pendingThumb}
                resizeMode="cover"
              />
              <Pressable style={styles.removeImage} onPress={() => setPendingImage(null)}>
                <X size={16} color="#fff" />
              </Pressable>
            </View>
            <View style={styles.inputBarInputWrap}>
              <TextInput
                style={styles.captionInput}
                placeholder="Add a caption..."
                placeholderTextColor={colors.text.textTertiary}
                value={imageCaption}
                onChangeText={setImageCaption}
                numberOfLines={1}
                maxLength={300}
              />
              <Pressable style={styles.sendBtn} onPress={onSend}>
                <Send size={20} color={colors.text.textBase} />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={[styles.inputBar, { paddingBottom: insets.bottom + 12 }]}>
            <Pressable style={styles.inputBarIcon} onPress={openGallery}>
              <ImageIcon size={24} color={colors.text.textAlt} />
            </Pressable>
            <View style={styles.inputBarInputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Ask anything about coins..."
                placeholderTextColor={colors.text.textTertiary}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={onSend}
                numberOfLines={1}
                maxLength={500}
              />
              <Pressable
                style={[styles.sendBtn, !input.trim() && !loading && styles.sendBtnDisabled]}
                onPress={onSend}
                disabled={!input.trim() && !loading}
              >
                <Send size={20} color={colors.text.textBase} />
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}
