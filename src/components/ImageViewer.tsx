import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
} from 'react-native';
import { X } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type ImageViewerProps = {
  visible: boolean;
  imageUrls: string[];
  initialIndex?: number;
  onClose: () => void;
};

export function ImageViewer({ visible, imageUrls, initialIndex = 0, onClose }: ImageViewerProps) {
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible && imageUrls.length > 0 && initialIndex > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: initialIndex * SCREEN_WIDTH, animated: false });
      }, 50);
    }
  }, [visible, initialIndex, imageUrls.length]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={16}>
          <X size={28} color="#fff" />
        </TouchableOpacity>

        {imageUrls.length === 0 ? null : imageUrls.length === 1 ? (
          <View style={styles.singleWrap}>
            <Image source={{ uri: imageUrls[0] }} style={styles.image} resizeMode="contain" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={imageUrls}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
            renderItem={({ item }) => (
              <View style={styles.page}>
                <Image source={{ uri: item }} style={styles.image} resizeMode="contain" />
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    elevation: 10,
    zIndex: 1000,
  },
  closeBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleWrap: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  page: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});
