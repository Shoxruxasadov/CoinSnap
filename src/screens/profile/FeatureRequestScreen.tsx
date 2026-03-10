import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/MainStack';
import { ChevronLeft, ChevronUp, Plus } from 'lucide-react-native';
import { useThemeColors } from '../../theme/useThemeColors';
import { supabase } from '../../lib/supabase';
import { useSupabaseSession } from '../../lib/useSupabaseSession';
import { triggerSelection, triggerImpact } from '../../lib/haptics';

type Nav = NativeStackNavigationProp<MainStackParamList>;

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  votes: number;
  created_at: string;
  user_id: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getFullYear()}, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function FeatureRequestScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const colors = useThemeColors();
  const { session } = useSupabaseSession();
  const userId = session?.user?.id;

  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('feature_requests')
      .select('*')
      .order('votes', { ascending: false });

    setRequests((data as FeatureRequest[]) ?? []);
    setLoading(false);
  };

  const handleBack = () => {
    triggerSelection();
    navigation.goBack();
  };

  const handleUpvote = async (id: string) => {
    if (votedIds.has(id)) return;
    triggerImpact();

    setVotedIds((prev) => new Set(prev).add(id));
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, votes: r.votes + 1 } : r))
    );

    await supabase.rpc('increment_feature_votes', { request_id: id });
  };

  const handleSendIdea = () => {
    triggerSelection();
    navigation.navigate('SendIdea');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background.bgAlt }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <ChevronLeft size={28} color={colors.text.textBase} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text.textBase }]}>Feature Request</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text.textTertiary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {requests.map((req) => (
            <View
              key={req.id}
              style={[styles.requestCard, { backgroundColor: colors.background.bgWhite, borderColor: colors.border.border3 }]}
            >
              <View style={styles.requestContent}>
                <Text style={[styles.requestTitle, { color: colors.text.textBase }]}>{req.title}</Text>
                <Text style={[styles.requestDesc, { color: colors.text.textTertiary }]} numberOfLines={2}>
                  {req.description}
                </Text>
                <Text style={[styles.requestDate, { color: colors.text.textTertiary }]}>
                  {formatDate(req.created_at)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.voteBtn}
                onPress={() => handleUpvote(req.id)}
                activeOpacity={0.7}
              >
                <ChevronUp size={20} color={colors.text.textBase} />
                <Text style={[styles.voteCount, { color: colors.text.textBase }]}>{req.votes}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: colors.background.brand }]}
          onPress={handleSendIdea}
          activeOpacity={0.85}
        >
          <Plus size={20} color={colors.text.textWhite} />
          <Text style={[styles.sendBtnText, { color: colors.text.textWhite }]}>Send your idea</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 44,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  requestCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  requestContent: {
    flex: 1,
    marginRight: 16,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  requestDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  requestDate: {
    fontSize: 12,
  },
  voteBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
  },
  voteCount: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 12,
    gap: 8,
  },
  sendBtnText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
