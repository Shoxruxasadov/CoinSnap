import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { Heart, ChatCircle, ArrowsDownUp, Plus } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACCENT = '#c9a227';

const POSTS = [
  {
    id: '1',
    name: 'Emily Carter',
    date: '16.02.2026',
    text: 'I picked up this 1921 Morgan Silver Dollar today at a local market. Weight shows 26.7g, but some edge details look unusually soft....',
    likes: 20,
    comments: 12,
  },
  {
    id: '2',
    name: 'James Walker',
    date: '16.02.2026',
    text: 'Finally got my hands on a 1943 Walking Liberty Half Dollar. Condition seems really good. The app estimated $18-$25. For tho...',
    likes: 20,
    comments: 12,
    hasImages: true,
  },
];

function PostCard({
  name,
  date,
  text,
  likes,
  comments,
  hasImages,
}: {
  name: string;
  date: string;
  text: string;
  likes: number;
  comments: number;
  hasImages?: boolean;
}) {
  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.avatar} />
        <View style={styles.postMeta}>
          <Text style={styles.postName}>{name}</Text>
          <Text style={styles.postDate}>{date}</Text>
        </View>
      </View>
      <Text style={styles.postText}>{text}</Text>
      {hasImages && (
        <View style={styles.postImages}>
          <View style={styles.postImage} />
          <View style={styles.postImage} />
        </View>
      )}
      <View style={styles.postActions}>
        <View style={styles.actionRow}>
          <Heart size={16} color="#666" weight="regular" />
          <Text style={styles.actionText}> {likes}</Text>
        </View>
        <View style={styles.actionRow}>
          <ChatCircle size={16} color="#666" weight="regular" />
          <Text style={styles.actionText}> {comments}</Text>
        </View>
      </View>
    </View>
  );
}

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Community</Text>
          <Text style={styles.subtitle}>Discuss with 10000+ collectors</Text>
        </View>
        <TouchableOpacity style={styles.sortBtn}>
          <ArrowsDownUp size={22} color="#333" weight="regular" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {POSTS.map((p) => (
          <PostCard
            key={p.id}
            name={p.name}
            date={p.date}
            text={p.text}
            likes={p.likes}
            comments={p.comments}
            hasImages={p.hasImages}
          />
        ))}
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 80 }]}>
        <Plus size={28} color="#fff" weight="bold" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  sortBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 16,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  postMeta: {
    marginLeft: 12,
  },
  postName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  postDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  postText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  postImages: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  postImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#e8e8e2',
  },
  postActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
