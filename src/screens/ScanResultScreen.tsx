import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Dimensions,
  Alert,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  LayoutChangeEvent,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import {
  ChevronLeft,
  MoreHorizontal,
  Plus,
  X,
  Trash2,
  FolderPlus,
  Info,
  Sparkles,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
  CommonActions,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import type { MainStackParamList } from "../navigation/MainStack";
import { useThemeColors, useEffectiveColorScheme } from "../theme/useThemeColors";
import { LinearGradient } from "expo-linear-gradient";
import { triggerSelection } from "../lib/haptics";
import { supabase } from "../lib/supabase";
import { useSupabaseSession } from "../lib/useSupabaseSession";
import { searchEbayProducts, EbayItem } from "../lib/ebaySearch";
import { formatPriceRange } from "../lib/currency";
import { useSettingsStore } from "../store/settingsStore";
import Toast from "react-native-toast-message";
import Purchases from "react-native-purchases";
import type { CollectionRow } from "./tabs/CollectionsScreen";
import { useLocalCollectionStore } from "../store/localCollectionStore";
import { ChevronRight } from "lucide-react-native";
import CoinIllustration from "../../assets/home/coin.svg";

type Nav = NativeStackNavigationProp<MainStackParamList>;
type Route = RouteProp<MainStackParamList, "ScanResult">;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type CoinData = {
  id: number;
  name: string;
  country: string;
  year_start: number | null;
  year_end: number | null;
  front_image_url: string | null;
  back_image_url: string | null;
  mintage: number | null;
  composition: string | null;
  estimated_price_min: number | null;
  estimated_price_max: number | null;
  grade_label: string | null;
  grade_value: number | null;
  denomination: string | null;
  metal_composition_detailed: string | null;
  weight_grams: number | null;
  diameter_mm: number | null;
  thickness_mm: number | null;
  edge_type: string | null;
  designer: string | null;
  history_description: string | null;
  ai_opinion: string | null;
  dimension_illustration_url?: string | null;
};

type CoinImageRow = {
  id: number;
  front_image_url: string | null;
  back_image_url: string | null;
};

const GRADE_MARKS = [1, 4, 12, 20, 30, 45, 60, 70];
const TAB_KEYS = ["Details", "Dimensions", "History", "Products"] as const;
type TabKey = (typeof TAB_KEYS)[number];

const GRADE_DESCRIPTIONS: Record<string, string> = {
  P: "Barely identifiable; date may be worn smooth.",
  FR: "Mostly worn smooth but date and some detail visible.",
  AG: "Very heavily worn; outline visible, legends partial.",
  G: "Heavily worn; design visible but faint in spots.",
  VG: "Major design elements visible but soft; minor details worn away.",
  F: "Moderate to heavy wear; all lettering visible.",
  VF: "Moderate wear on high points; all major features sharp.",
  EF: "Light wear on high points; all design elements sharp.",
  AU: "Slight wear on highest points; near mint luster.",
  MS: "No trace of wear; may have contact marks or blemishes.",
};

function formatYear(start: number | null, end: number | null): string {
  if (start && end && start !== end) return `${start} ~ ${end}`;
  if (start) return `${start}`;
  if (end) return `${end}`;
  return "";
}

function formatMintage(m: number | null): string {
  if (!m) return "-";
  return m.toLocaleString();
}



function gradeValueToPosition(value: number): number {
  if (value <= GRADE_MARKS[0]) return 0;
  if (value >= GRADE_MARKS[GRADE_MARKS.length - 1]) return 100;
  for (let i = 0; i < GRADE_MARKS.length - 1; i++) {
    const a = GRADE_MARKS[i];
    const b = GRADE_MARKS[i + 1];
    if (value >= a && value <= b) {
      const t = (value - a) / (b - a);
      return ((i + t) / (GRADE_MARKS.length - 1)) * 100;
    }
  }
  return 50;
}

function GradeScale({
  value,
  label,
  onInfoPress,
  colors,
}: {
  value: number | null;
  label: string | null;
  onInfoPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const position =
    value != null ? Math.min(Math.max(gradeValueToPosition(value), 2), 98) : 0;
  return (
    <View style={gradeStyles.container}>
      <View style={gradeStyles.headerRow}>
        <Text style={[gradeStyles.headerLabel, { color: colors.text.textAlt }]}>Coin Grading</Text>
        <View style={gradeStyles.gradeValueRight}>
          <Text style={[gradeStyles.gradeValueLabel, { color: colors.text.textBase }]}>{label || "-"}</Text>
          <Text style={[gradeStyles.gradeValueNum, { color: colors.text.textBase }]}> ({value ?? "-"})</Text>
          <TouchableOpacity
            onPress={onInfoPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={gradeStyles.infoBtn}
          >
            <Info size={18} color={colors.text.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={[gradeStyles.scaleBar, { backgroundColor: colors.surface.onBgAlt }]}>
        <LinearGradient
          colors={["#F59E0B", "#2EDE8E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={gradeStyles.scaleFill}
        />
        {value != null && (
          <View
            style={[
              gradeStyles.scaleMarker,
              { left: `${position}%`, transform: [{ translateX: -1.5 }] },
            ]}
          >
            <View style={[gradeStyles.scaleMarkerLine, { backgroundColor: colors.text.textBase }]} />
          </View>
        )}
      </View>
      <View style={gradeStyles.scaleLabels}>
        {GRADE_MARKS.map((m) => (
          <Text key={m} style={[gradeStyles.scaleLabelText, { color: colors.text.textTertiary }]}>
            {m}
          </Text>
        ))}
      </View>
    </View>
  );
}

function SpecRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string | null;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={[specStyles.row, { borderBottomColor: colors.border.border2 }]}>
      <Text style={[specStyles.label, { color: colors.text.textAlt }]}>{label}:</Text>
      <Text style={[specStyles.value, { color: colors.text.textBase }]}>{value || "-"}</Text>
    </View>
  );
}

export default function ScanResultScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const colorScheme = useEffectiveColorScheme();
  const gradingScaleImage =
    colorScheme === "dark"
      ? require("../../assets/home/grandingScale.dark.png")
      : require("../../assets/home/grandingScale.png");
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const coin: CoinData = route.params.coin;
  const { session } = useSupabaseSession();
  const userId = session?.user?.id;
  const currency = useSettingsStore((s) => s.currency);
  const { generalCoinIds, addCoinToGeneral, addCoin, addToSnapHistory } = useLocalCollectionStore();

  const [activeTab, setActiveTab] = useState<TabKey>("Details");
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [coinsMap, setCoinsMap] = useState<Record<number, CoinImageRow>>({});
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    number | null
  >(null);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [creating, setCreating] = useState(false);
  const [ebayItems, setEbayItems] = useState<EbayItem[]>([]);
  const [ebayLoading, setEbayLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    (async () => {
      try {
        const info = await Purchases.getCustomerInfo();
        setIsPro(Object.keys(info.entitlements.active).length > 0);
      } catch {
        setIsPro(false);
      }
    })();
  }, []);
  const tabsScrollRef = useRef<ScrollView>(null);
  const moreSheetRef = useRef<BottomSheet>(null);
  const addToSheetRef = useRef<BottomSheet>(null);
  const guideSheetRef = useRef<BottomSheet>(null);
  const newCollectionSheetRef = useRef<BottomSheet>(null);

  const sectionOffsets = useRef<Record<TabKey, number>>({
    Details: 0,
    Dimensions: 0,
    History: 0,
    Products: 0,
  });
  const tabRowOffset = useRef(0); // Y in scroll content where sections start (below tab row)
  const tabRowHeight = useRef(48);
  const tabRowWidth = useRef(0);
  const tabLayouts = useRef<
    Partial<Record<TabKey, { x: number; width: number }>>
  >({});
  const isUserTap = useRef(false);

  const coinInCollection = useMemo(() => {
    // Check Supabase collections first (for logged-in users)
    const supabaseCollection = collections.find((c) => c.coin_ids?.includes(coin.id));
    if (supabaseCollection) return supabaseCollection;
    
    // Check local General collection (for non-logged users)
    if (!userId && generalCoinIds.includes(coin.id)) {
      return {
        id: -1,
        name: 'General',
        description: null,
        coin_ids: generalCoinIds,
        user_id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_default: true,
      } as CollectionRow;
    }
    
    return null;
  }, [collections, coin.id, userId, generalCoinIds]);


  const allCoinIds = useMemo(() => {
    const ids = new Set<number>();
    collections.forEach((c) => (c.coin_ids ?? []).forEach((id) => ids.add(id)));
    return Array.from(ids);
  }, [collections]);

  const fetchCollections = useCallback(async () => {
    if (!userId) return;
    setLoadingCollections(true);
    const { data, error } = await supabase
      .from("collections")
      .select(
        "id, name, description, coin_ids, user_id, created_at, updated_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setLoadingCollections(false);
    if (!error && data) setCollections(data as CollectionRow[]);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchCollections();
    }, [fetchCollections]),
  );

  // Add to local snap history for non-logged users
  useEffect(() => {
    if (!userId && coin?.id) {
      addCoin({
        id: coin.id,
        name: coin.name,
        country: coin.country,
        year_start: coin.year_start,
        year_end: coin.year_end,
        front_image_url: coin.front_image_url,
        back_image_url: coin.back_image_url,
        mintage: coin.mintage,
        composition: coin.composition,
        estimated_price_min: coin.estimated_price_min,
        estimated_price_max: coin.estimated_price_max,
        grade_label: coin.grade_label,
        grade_value: coin.grade_value,
        denomination: coin.denomination,
        metal_composition_detailed: coin.metal_composition_detailed,
        weight_grams: coin.weight_grams,
        diameter_mm: coin.diameter_mm,
        thickness_mm: coin.thickness_mm,
        edge_type: coin.edge_type,
        designer: coin.designer,
        history_description: coin.history_description,
        ai_opinion: coin.ai_opinion,
        created_at: new Date().toISOString(),
      });
      addToSnapHistory(coin.id);
    }
  }, [coin?.id, userId]);

  useEffect(() => {
    if (allCoinIds.length === 0) {
      setCoinsMap({});
      return;
    }
    supabase
      .from("coins")
      .select("id, front_image_url, back_image_url")
      .in("id", allCoinIds)
      .then(({ data }) => {
        if (data) {
          const map: Record<number, CoinImageRow> = {};
          data.forEach((c) => {
            map[c.id] = c;
          });
          setCoinsMap(map);
        }
      });
  }, [allCoinIds.join(",")]);

  // Fetch eBay products
  useEffect(() => {
    let cancelled = false;
    setEbayLoading(true);

    searchEbayProducts(coin.name, coin.country, coin.year_start)
      .then((result) => {
        if (cancelled) return;
        setEbayLoading(false);
        if (result?.ebay_items) {
          setEbayItems(result.ebay_items);
        }
      })
      .catch(() => {
        if (!cancelled) setEbayLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [coin.name, coin.country, coin.year_start]);

  const openEbayLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open link");
    });
  };

  const getCollectionCoins = (collection: CollectionRow): CoinImageRow[] => {
    return (collection.coin_ids ?? [])
      .slice(-4)
      .map((id) => coinsMap[id])
      .filter(Boolean);
  };

  const handleBack = () => {
    triggerSelection();
    navigation.goBack();
  };

  const openMoreSheet = () => {
    triggerSelection();
    moreSheetRef.current?.expand();
  };
  const closeMoreSheet = () => moreSheetRef.current?.close();

  const openAddToSheet = () => {
    triggerSelection();
    closeMoreSheet();
    setTimeout(() => addToSheetRef.current?.expand(), 200);
  };

  const openGuideSheet = () => {
    triggerSelection();
    closeMoreSheet();
    setTimeout(() => guideSheetRef.current?.expand(), 200);
  };

  const openNewCollectionSheet = () => {
    triggerSelection();
    if (!isPro) {
      addToSheetRef.current?.close();
      navigation.navigate('Pro');
      return;
    }
    if (!userId) {
      addToSheetRef.current?.close();
      navigation.dispatch(CommonActions.navigate({ name: 'GetStarted' }));
      return;
    }
    addToSheetRef.current?.close();
    setTimeout(() => newCollectionSheetRef.current?.expand(), 200);
  };

  const handleAddToCollection = () => {
    triggerSelection();
    if (!userId) {
      // Add to local General collection for non-logged users
      addCoin({
        id: coin.id,
        name: coin.name,
        country: coin.country,
        year_start: coin.year_start,
        year_end: coin.year_end,
        front_image_url: coin.front_image_url,
        back_image_url: coin.back_image_url,
        mintage: coin.mintage,
        composition: coin.composition,
        estimated_price_min: coin.estimated_price_min,
        estimated_price_max: coin.estimated_price_max,
        grade_label: coin.grade_label,
        grade_value: coin.grade_value,
        denomination: coin.denomination,
        metal_composition_detailed: coin.metal_composition_detailed,
        weight_grams: coin.weight_grams,
        diameter_mm: coin.diameter_mm,
        thickness_mm: coin.thickness_mm,
        edge_type: coin.edge_type,
        designer: coin.designer,
        history_description: coin.history_description,
        ai_opinion: coin.ai_opinion,
        created_at: new Date().toISOString(),
      });
      addCoinToGeneral(coin.id);
      Toast.show({ type: 'success', text1: 'Added to General collection' });
      return;
    }
    addToSheetRef.current?.expand();
  };

  const handleSeeCollection = () => {
    triggerSelection();
    if (coinInCollection)
      navigation.navigate("CollectionDetail", { collection: coinInCollection });
  };

  const handleConfirmAddToCollection = async () => {
    if (!selectedCollectionId) return;
    const col = collections.find((c) => c.id === selectedCollectionId);
    if (!col) return;

    // If coin is already in another collection, remove it first
    if (coinInCollection && coinInCollection.id !== selectedCollectionId) {
      const oldIds = (coinInCollection.coin_ids || []).filter(
        (id) => id !== coin.id,
      );
      await supabase
        .from("collections")
        .update({ coin_ids: oldIds, updated_at: new Date().toISOString() })
        .eq("id", coinInCollection.id);
    }

    // Add to new collection (if not already there)
    if (!(col.coin_ids || []).includes(coin.id)) {
      const newIds = [...(col.coin_ids || []), coin.id];
      await supabase
        .from("collections")
        .update({ coin_ids: newIds, updated_at: new Date().toISOString() })
        .eq("id", col.id);
    }

    addToSheetRef.current?.close();
    setSelectedCollectionId(null);
    fetchCollections();

    const message = coinInCollection
      ? `Coin moved to "${col.name}"`
      : `Coin added to "${col.name}"`;
    Alert.alert(coinInCollection ? "Moved" : "Added", message);
  };

  const handleCreateAndAdd = async () => {
    if (!newCollectionName.trim() || !userId) return;
    setCreating(true);

    // If coin is in another collection, remove it first
    if (coinInCollection) {
      const oldIds = (coinInCollection.coin_ids || []).filter(
        (id) => id !== coin.id,
      );
      await supabase
        .from("collections")
        .update({ coin_ids: oldIds, updated_at: new Date().toISOString() })
        .eq("id", coinInCollection.id);
    }

    const { data, error } = await supabase
      .from("collections")
      .insert({
        name: newCollectionName.trim(),
        user_id: userId,
        coin_ids: [coin.id],
      })
      .select()
      .single();
    setCreating(false);
    if (!error && data) {
      newCollectionSheetRef.current?.close();
      setNewCollectionName("");
      fetchCollections();
      Toast.show({ type: "success", text1: "Collection created successfully" });
    } else {
      Alert.alert("Error", "Failed to create collection.");
    }
  };

  const handleDelete = async () => {
    closeMoreSheet();
    Alert.alert(
      "Delete Coin",
      "Are you sure you want to delete this coin from your history?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await supabase.from("coins").delete().eq("id", coin.id);
            navigation.goBack();
          },
        },
      ],
    );
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  const yearStr = formatYear(coin.year_start, coin.year_end);
  const displayPrice = formatPriceRange(
    coin.estimated_price_min,
    coin.estimated_price_max,
    currency,
  );
  const priceSubtext =
    coin.estimated_price_min != null || coin.estimated_price_max != null
      ? "Market value"
      : null;

  const scrollToSection = (tab: TabKey) => {
    triggerSelection();
    isUserTap.current = true;
    setActiveTab(tab);
    const sectionYInWrap = sectionOffsets.current[tab];
    const sectionsStartY = tabRowOffset.current;
    const headerH = tabRowHeight.current;
    const targetY = Math.max(0, sectionsStartY + sectionYInWrap - headerH);
    scrollRef.current?.scrollTo({ y: targetY, animated: true });
    setTimeout(() => {
      isUserTap.current = false;
    }, 500);
  };

  const handleScroll = (event: any) => {
    if (isUserTap.current) return;
    const scrollY = event.nativeEvent.contentOffset.y;
    const base = tabRowOffset.current;
    const threshold = tabRowHeight.current + 20;
    const tabs: TabKey[] = ["Products", "History", "Dimensions", "Details"];
    for (const tab of tabs) {
      if (scrollY + threshold >= base + sectionOffsets.current[tab]) {
        setActiveTab(tab);
        return;
      }
    }
    setActiveTab("Details");
  };

  const onSectionLayout = (tab: TabKey) => (e: LayoutChangeEvent) => {
    sectionOffsets.current[tab] = e.nativeEvent.layout.y;
  };

  useEffect(() => {
    const layout = tabLayouts.current[activeTab];
    const containerWidth = tabRowWidth.current;
    if (!layout || !containerWidth) return;
    const targetX = Math.max(0, layout.x - (containerWidth - layout.width) / 2);
    tabsScrollRef.current?.scrollTo({ x: targetX, animated: true });
  }, [activeTab]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background.bgBaseElevated },
      ]}
    >
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={handleBack}>
          <ChevronLeft size={28} color={colors.text.textBase} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.textBase }]}>
          Result
        </Text>
        <TouchableOpacity style={styles.headerBtn} onPress={openMoreSheet}>
          <MoreHorizontal size={24} color={colors.text.textBase} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Top Section */}
        <View style={styles.topSection}>
          <View style={styles.coinImagesRow}>
            {coin.front_image_url && (
              <View
                style={[
                  styles.coinImageWrap,
                  { backgroundColor: colors.surface.surfaceElevatedExtra },
                ]}
              >
                <Image
                  source={{ uri: coin.front_image_url }}
                  style={styles.coinImage}
                  contentFit="contain"
                  cachePolicy="disk"
                  transition={200}
                />
              </View>
            )}
            {coin.back_image_url && (
              <View
                style={[
                  styles.coinImageWrap,
                  { backgroundColor: colors.surface.surfaceElevatedExtra },
                ]}
              >
                <Image
                  source={{ uri: coin.back_image_url }}
                  style={styles.coinImage}
                  contentFit="contain"
                  cachePolicy="disk"
                  transition={200}
                />
              </View>
            )}
          </View>

          <Text style={[styles.coinName, { color: colors.text.textBase }]}>
            {coin.name}
          </Text>
          <Text style={[styles.coinOrigin, { color: colors.text.textAlt }]}>
            {coin.country}
            {yearStr ? `, ${yearStr}` : ""}
          </Text>

          <View style={styles.statsRow}>
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.surface.onBgBase },
              ]}
            >
              <Text style={[styles.statValue, { color: colors.text.textBase }]}>
                {formatMintage(coin.mintage)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.textAlt }]}>
                Mintage
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.surface.onBgBase },
              ]}
            >
              <Text
                style={[styles.statValue, { color: colors.text.textBase }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {coin.composition || "-"}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.textAlt }]}>
                Composition
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.priceRow,
              { backgroundColor: colors.surface.onBgBase },
            ]}
          >
            <View style={[styles.priceSection]}>
              <Text
                style={[styles.priceText, { color: colors.text.textBase }]}
              >
                {displayPrice}
              </Text>
              {priceSubtext && (
                <Text
                  style={[
                    styles.priceSubtext,
                    { color: colors.text.textAlt },
                  ]}
                >
                  {priceSubtext}
                </Text>
              )}
            </View>

            <GradeScale
              value={coin.grade_value}
              label={coin.grade_label}
              onInfoPress={() => guideSheetRef.current?.expand()}
              colors={colors}
            />
          </View>
        </View>

        {/* Sticky Tab Row */}
        <View
          style={[
            styles.tabsRow,
            {
              backgroundColor: colors.background.bgBaseElevated,
            },
          ]}
          onLayout={(e) => {
            const { y, height } = e.nativeEvent.layout;
            tabRowOffset.current = y + height;
            tabRowHeight.current = height;
          }}
        >
          <ScrollView
            ref={tabsScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsInner}
            onLayout={(e) => {
              tabRowWidth.current = e.nativeEvent.layout.width;
            }}
          >
            {TAB_KEYS.map((tab) => (
              <TouchableOpacity
                key={tab}
                activeOpacity={0.85}
                style={[
                  styles.tab,
                  {
                    backgroundColor:
                      activeTab === tab
                        ? colors.background.bgInverse
                        : "transparent",
                    borderColor:
                      activeTab === tab
                        ? colors.background.bgInverse
                        : colors.border.border4,
                  },
                ]}
                onLayout={(e) => {
                  const { x, width } = e.nativeEvent.layout;
                  tabLayouts.current[tab] = { x, width };
                }}
                onPress={() => scrollToSection(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        activeTab === tab
                          ? colors.text.textInverse
                          : colors.text.textAlt,
                    },
                    activeTab === tab && { fontWeight: "700" },
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* All Sections */}
        <View style={styles.sectionsWrap}>
          {/* Details / Specifications */}
          <View
            onLayout={onSectionLayout("Details")}
            style={[
              styles.sectionBlock,
              { backgroundColor: colors.surface.onBgBase, marginTop: 12 },
            ]}
          >
            <Text
              style={[styles.sectionTitle, { color: colors.text.textBase }]}
            >
              Specifications
            </Text>
            <SpecRow label="Denomination" value={coin.denomination} colors={colors} />
            <SpecRow label="Metal" value={coin.metal_composition_detailed} colors={colors} />
            <SpecRow
              label="Weight"
              value={coin.weight_grams ? `${coin.weight_grams} grams` : null}
              colors={colors}
            />
            <SpecRow
              label="Diameter"
              value={coin.diameter_mm ? `${coin.diameter_mm} mm` : null}
              colors={colors}
            />
            <SpecRow
              label="Thickness"
              value={coin.thickness_mm ? `~${coin.thickness_mm} mm` : null}
              colors={colors}
            />
            <SpecRow label="Edge" value={coin.edge_type} colors={colors} />
          </View>

          {/* Dimensions */}
          <View
            onLayout={onSectionLayout("Dimensions")}
            style={[
              styles.sectionBlock,
              {
                backgroundColor: colors.surface.onBgBase,
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 20,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.sectionTitle, { color: colors.text.textBase }]}
              >
                Dimensions
              </Text>
              <View style={styles.dimensionsCard}>
                <View>
                  <View style={styles.dimRow}>
                    <Text style={styles.dimLabel}>Weight:</Text>
                    <Text style={[styles.dimValue, {color: colors.text.textBase}]}>
                      {coin.weight_grams ? `${coin.weight_grams} grams` : "-"}
                    </Text>
                  </View>
                  <View style={styles.dimRow}>
                    <Text style={styles.dimLabel}>Diameter:</Text>
                    <Text style={[styles.dimValue, {color: colors.text.textBase}]}>
                      {coin.diameter_mm ? `${coin.diameter_mm} mm` : "-"}
                    </Text>
                  </View>
                  <View style={styles.dimRow}>
                    <Text style={styles.dimLabel}>Thickness:</Text>
                    <Text style={[styles.dimValue, {color: colors.text.textBase}]}>
                      {coin.thickness_mm ? `~${coin.thickness_mm} mm` : "-"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            <CoinIllustration width={120} height={120} />
          </View>

          {/* History */}
          <View
            onLayout={onSectionLayout("History")}
            style={[
              styles.sectionBlock,
              { backgroundColor: colors.surface.onBgBase },
            ]}
          >
            <Text
              style={[styles.sectionTitle, { color: colors.text.textBase }]}
            >
              History
            </Text>
            <Text
              style={[styles.historyText, { color: colors.text.textBase }]}
              numberOfLines={historyExpanded ? undefined : 5}
            >
              {coin.history_description || "No history available."}
            </Text>
            {coin.history_description &&
              coin.history_description.length > 200 && (
                <TouchableOpacity
                  onPress={() => setHistoryExpanded(!historyExpanded)}
                >
                  <Text
                    style={[styles.moreBtn, { color: colors.text.textBrand }]}
                  >
                    {historyExpanded ? "Less" : "More"}
                  </Text>
                </TouchableOpacity>
              )}
          </View>

          {/* AI Opinion */}
          {coin.ai_opinion && (
            <View
              style={[
                styles.sectionBlock,
                { backgroundColor: colors.surface.onBgBase },
              ]}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.cardIconWrap,
                    { backgroundColor: "rgba(212, 160, 18, 0.12)" },
                  ]}
                >
                  <Sparkles size={20} color="#D4A012" />
                </View>
                <Text
                  style={[styles.cardTitle, { color: colors.text.textBase }]}
                >
                  AI Opinion
                </Text>
              </View>
              <Text style={[styles.aiText, { color: colors.text.textBase }]}>
                {coin.ai_opinion}
              </Text>
            </View>
          )}

          {/* Products */}
          <View
            onLayout={onSectionLayout("Products")}
            style={[styles.sectionBlock, { padding: 0 }]}
          >
            <Text
              style={[styles.sectionTitle, { color: colors.text.textBase }]}
            >
              Similar Products from Ebay
            </Text>
            <View style={styles.productsGrid}>
              {ebayLoading ? (
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.productCard,
                        { backgroundColor: colors.surface.onBgBase },
                      ]}
                    >
                      <View
                        style={[
                          styles.productImagePlaceholder,
                          { backgroundColor: colors.surface.onBgAlt },
                        ]}
                      />
                      <View
                        style={[
                          styles.productNamePlaceholder,
                          { backgroundColor: colors.surface.onBgAlt },
                        ]}
                      />
                      <View
                        style={[
                          styles.productPricePlaceholder,
                          { backgroundColor: colors.surface.onBgAlt },
                        ]}
                      />
                    </View>
                  ))}
                </>
              ) : ebayItems.length === 0 ? (
                <Text
                  style={[
                    styles.noProductsText,
                    { color: colors.text.textTertiary },
                  ]}
                >
                  No similar products found
                </Text>
              ) : (
                ebayItems.slice(0, 4).map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.productCard,
                      { backgroundColor: colors.surface.onBgBase },
                    ]}
                    onPress={() => openEbayLink(item.itemWebUrl)}
                    activeOpacity={0.8}
                  >
                    {item.imageUrl ? (
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.productImagePlaceholder,
                          { backgroundColor: colors.surface.onBgAlt },
                        ]}
                      />
                    )}
                    <Text
                      style={[
                        styles.productName,
                        { color: colors.text.textBase },
                      ]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <View style={styles.productPriceRow}>
                      <Text
                        style={[
                          styles.productPrice,
                          { color: colors.background.brand },
                        ]}
                      >
                        ${item.price ?? "—"}
                      </Text>
                      <ChevronRight
                        size={16}
                        color={colors.text.textTertiary}
                      />
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>

          <Text
            style={[styles.disclaimer, { color: colors.text.textTertiary }]}
          >
            This content generated by Artificial Intelligence
          </Text>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View
        style={[
          styles.bottomCta,
          {
            paddingBottom: insets.bottom + 12,
            backgroundColor: colors.surface.onBgBase,
          },
        ]}
      >
        {coinInCollection ? (
          <TouchableOpacity
            style={[
              styles.addBtn,
              { backgroundColor: colors.background.brand },
            ]}
            onPress={handleSeeCollection}
            activeOpacity={0.8}
          >
            <Text style={[styles.addBtnText, { color: colors.text.textInverse }]}>See your Collection</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.addBtn,
              { backgroundColor: colors.background.brand },
            ]}
            onPress={handleAddToCollection}
            activeOpacity={0.8}
          >
            <Plus size={20} color={colors.text.textInverse} style={{ marginRight: 8 }} />
            <Text style={[styles.addBtnText, { color: colors.text.textInverse }]}>Add to Collection</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* More Bottom Sheet */}
      <BottomSheet
        ref={moreSheetRef}
        index={-1}
        snapPoints={[220]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface.onBgBase }}
        handleIndicatorStyle={{
          backgroundColor: colors.border.border3,
          width: 36,
          height: 4,
          borderRadius: 2,
        }}
      >
        <BottomSheetView style={[sheetStyles.container, {paddingLeft: 20}]}>
          <TouchableOpacity style={sheetStyles.row} onPress={openAddToSheet}>
            <FolderPlus size={22} color={colors.text.textBase} />
            <Text
              style={[sheetStyles.rowText, { color: colors.text.textBase }]}
            >
              {coinInCollection ? "Change collection" : "Add to"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={sheetStyles.row} onPress={openGuideSheet}>
            <Info size={22} color={colors.text.textBase} />
            <Text
              style={[sheetStyles.rowText, { color: colors.text.textBase }]}
            >
              Grading Info
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={sheetStyles.row} onPress={handleDelete}>
            <Trash2 size={22} color={colors.state.red} />
            <Text style={[sheetStyles.rowText, { color: colors.state.red }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>

      {/* Add to Collection Bottom Sheet */}
      <BottomSheet
        ref={addToSheetRef}
        index={-1}
        enableDynamicSizing
        snapPoints={[320]}
        maxDynamicContentSize={SCREEN_HEIGHT}
        enablePanDownToClose
        enableOverDrag={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: colors.surface.onBgBase,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
        }}
        handleIndicatorStyle={{
          backgroundColor: colors.border.border3,
          width: 40,
        }}
      >
        <BottomSheetView>
          <View style={sheetStyles.headerRow}>
            <Text style={[sheetStyles.title, { color: colors.text.textBase }]}>
              {coinInCollection ? "Change collection" : "Add to"}
            </Text>
            <TouchableOpacity onPress={() => addToSheetRef.current?.close()}>
              <X size={24} color={colors.text.textBase} />
            </TouchableOpacity>
          </View>
          <View
            style={[
              sheetStyles.divider,
              { backgroundColor: colors.border.border3 },
            ]}
          />
          {loadingCollections ? (
            <ActivityIndicator
              size="small"
              color={colors.text.textBase}
              style={{ marginVertical: 20 }}
            />
          ) : (
            <BottomSheetScrollView
              style={{ maxHeight: SCREEN_HEIGHT * 0.55 }}
              contentContainerStyle={sheetStyles.scrollContent}
            >
              {collections.filter((c) => c.id !== coinInCollection?.id).map((col) => {
                const isSelected = selectedCollectionId === col.id;
                const coinImages = getCollectionCoins(col);
                return (
                  <TouchableOpacity
                    key={col.id}
                    style={[
                      sheetStyles.collectionRow,
                      {
                        borderColor: isSelected
                          ? colors.text.textBase
                          : colors.border.border3,
                        backgroundColor: colors.surface.onBgBase,
                      },
                      isSelected && { borderWidth: 2 },
                    ]}
                    onPress={() => setSelectedCollectionId(col.id)}
                    activeOpacity={0.7}
                  >
                    <View>
                      <Text
                        style={[
                          sheetStyles.collectionName,
                          { color: colors.text.textBase },
                        ]}
                      >
                        {col.name}
                      </Text>
                      <Text
                        style={[
                          sheetStyles.collectionCount,
                          { color: colors.text.textTertiary },
                        ]}
                      >
                        {col.coin_ids?.length ?? 0} items
                      </Text>
                    </View>
                    <View style={sheetStyles.collectionCoins}>
                      {(() => {
                        const placeholder = (key: string, ml: boolean) => (
                          <View
                            key={key}
                            style={[
                              sheetStyles.collectionCoinImg,
                              {
                                marginLeft: ml ? -12 : 0,
                                borderColor: colors.surface.onBgBase,
                                backgroundColor: colors.border.border3,
                              },
                            ]}
                          />
                        );

                        if (coinImages.length === 0) {
                          return [placeholder('p0', false), placeholder('p1', true), placeholder('p2', true), placeholder('p3', true)];
                        }

                        const els: React.ReactNode[] = [];
                        const last2 = coinImages.slice(-2);
                        last2.forEach((c) => {
                          const ml = els.length > 0;
                          if (c.front_image_url) {
                            els.push(
                              <Image key={`${c.id}-f`} source={{ uri: c.front_image_url }} style={[sheetStyles.collectionCoinImg, { marginLeft: ml ? -12 : 0, borderColor: colors.surface.onBgBase }]} cachePolicy="disk" />
                            );
                          } else {
                            els.push(placeholder(`${c.id}-fp`, ml));
                          }
                          if (c.back_image_url) {
                            els.push(
                              <Image key={`${c.id}-b`} source={{ uri: c.back_image_url }} style={[sheetStyles.collectionCoinImg, { marginLeft: -12, borderColor: colors.surface.onBgBase }]} cachePolicy="disk" />
                            );
                          } else {
                            els.push(placeholder(`${c.id}-bp`, true));
                          }
                        });
                        while (els.length < 4) {
                          els.push(placeholder(`p${els.length}`, els.length > 0));
                        }
                        return els.slice(0, 4);
                      })()}
                    </View>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[
                  sheetStyles.newFolderRow,
                  {
                    borderColor: colors.border.border3,
                    backgroundColor: colors.surface.onBgBase,
                  },
                ]}
                onPress={openNewCollectionSheet}
              >
                <View>
                  <Text
                    style={[
                      sheetStyles.collectionName,
                      { color: colors.text.textBase },
                    ]}
                  >
                    New Folder
                  </Text>
                  <Text
                    style={[
                      sheetStyles.collectionCount,
                      { color: colors.text.textTertiary },
                    ]}
                  >
                    Tap to create new
                  </Text>
                </View>
                <View
                  style={[
                    sheetStyles.plusCircle,
                    { backgroundColor: colors.border.border3 },
                  ]}
                >
                  <Plus size={22} color={colors.text.textBase} />
                </View>
              </TouchableOpacity>
            </BottomSheetScrollView>
          )}
          <View
            style={[
              sheetStyles.divider,
              { backgroundColor: colors.border.border3 },
            ]}
          />
          <TouchableOpacity
            style={[
              sheetStyles.confirmBtn,
              {
                backgroundColor: selectedCollectionId
                  ? colors.background.bgInverse
                  : colors.border.border3,
                marginBottom: 16,
              },
            ]}
            onPress={handleConfirmAddToCollection}
            disabled={!selectedCollectionId}
            activeOpacity={0.8}
          >
            <Text
              style={[
                sheetStyles.confirmBtnText,
                {
                  color: selectedCollectionId
                    ? colors.text.textInverse
                    : colors.text.textTertiary,
                },
              ]}
            >
              Confirm
            </Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>

      {/* Guide Bottom Sheet */}
      <BottomSheet
        ref={guideSheetRef}
        index={-1}
        snapPoints={["55%"]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface.onBgBase }}
        handleIndicatorStyle={{ backgroundColor: colors.border.border3 }}
      >
        <BottomSheetView style={sheetStyles.guideContainer}>
          <Text
            style={[sheetStyles.guideTitle, { color: colors.text.textBase }]}
          >
            Understanding the Sheldon Coin Grading Scale
          </Text>
          <Text
            style={[
              sheetStyles.guideSubtitle,
              { color: colors.text.textTertiary },
            ]}
          >
            The standard system for grading numismatic coins from Poor (1) - to
            Perfect (70)
          </Text>
          <Image
            source={gradingScaleImage}
            style={sheetStyles.guideCoinImg}
            resizeMode="cover"
          />
          <Text
            style={[
              sheetStyles.guideGradeText,
              { color: colors.text.textBase },
            ]}
          >
            {coin.grade_value ?? "-"} → {coin.grade_label ?? "-"}
          </Text>
          <Text
            style={[
              sheetStyles.guideGradeDesc,
              { color: colors.text.textTertiary },
            ]}
          >
            {GRADE_DESCRIPTIONS[coin.grade_label ?? ""] ||
              "Grade description not available."}
          </Text>
          <TouchableOpacity
            style={[
              sheetStyles.confirmBtn,
              { backgroundColor: colors.background.bgInverse, marginTop: 20 },
            ]}
            onPress={() => guideSheetRef.current?.close()}
            activeOpacity={0.8}
          >
            <Text style={[sheetStyles.confirmBtnText, { color: colors.text.textInverse }]}>Understand</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>

      {/* New Collection Bottom Sheet */}
      <BottomSheet
        ref={newCollectionSheetRef}
        index={-1}
        snapPoints={["33%"]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: colors.surface.onBgBase,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
        }}
        handleIndicatorStyle={{ backgroundColor: colors.border.border3, width: 40 }}
        keyboardBehavior="interactive"
        android_keyboardInputMode="adjustResize"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <BottomSheetView style={sheetStyles.newCollectionContainer}>
            <View style={sheetStyles.headerRow}>
              <Text
                style={[sheetStyles.title, { color: colors.text.textBase }]}
              >
                New Collection
              </Text>
              <TouchableOpacity
                onPress={() => newCollectionSheetRef.current?.close()}
              >
                <X size={24} color={colors.text.textBase} />
              </TouchableOpacity>
            </View>
            <View
              style={[
                sheetStyles.divider,
                { backgroundColor: colors.border.border3 },
              ]}
            />
            <View style={sheetStyles.newCollectionBody}>
            <Text
              style={[sheetStyles.inputLabel, { color: colors.text.textBase }]}
            >
              Collection name
            </Text>
            <TextInput
              style={[
                sheetStyles.input,
                {
                  backgroundColor: colors.background.bgAlt,
                  color: colors.text.textBase,
                  borderColor: colors.border.border3,
                },
              ]}
              placeholder="Ancient collection"
              placeholderTextColor={colors.text.textTertiary}
              value={newCollectionName}
              onChangeText={setNewCollectionName}
            />
            </View>
            <TouchableOpacity
              style={[
                sheetStyles.confirmBtn,
                sheetStyles.newCollectionFooter,
                {
                  backgroundColor: newCollectionName.trim()
                    ? colors.background.bgInverse
                    : colors.border.border3,
                },
              ]}
              onPress={handleCreateAndAdd}
              disabled={!newCollectionName.trim() || creating}
              activeOpacity={0.8}
            >
              {creating ? (
                <ActivityIndicator size="small" color={colors.text.textInverse} />
              ) : (
                <Text
                  style={[
                    sheetStyles.confirmBtnText,
                    {
                      color: newCollectionName.trim()
                        ? colors.text.textInverse
                        : colors.text.textTertiary,
                    },
                  ]}
                >
                  Create & Add
                </Text>
              )}
            </TouchableOpacity>
          </BottomSheetView>
        </KeyboardAvoidingView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 16 },
  topSection: { paddingHorizontal: 20 },

  coinImagesRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 16,
  },
  coinImageWrap: {
    width: 140,
    height: 140,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  coinImage: { width: 110, height: 110, borderRadius: 55 },
  coinName: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  coinOrigin: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },

  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 4,
  },
  statValue: { fontSize: 16, fontWeight: "700" },
  statLabel: { fontSize: 12, marginTop: 2 },

  priceRow: {
    marginBottom: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  priceSection: {
    alignItems: "center",
    paddingVertical: 14,
    marginBottom: 16,
  },
  priceText: { fontSize: 28, fontWeight: "700" },
  priceSubtext: { fontSize: 14, marginTop: 2 },

  tabsRow: {
    paddingTop: 10,
    paddingBottom: 12,
    zIndex: 10,
  },
  tabsInner: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
  },
  tab: {
    height: 36,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
  },
  tabText: { fontSize: 14, fontWeight: "600" },

  sectionsWrap: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  sectionBlock: { marginTop: 16, borderRadius: 12, padding: 16 },

  dimensionsCard: { flexDirection: "row", alignItems: "center" },
  dimRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  dimLabel: { fontSize: 14, color: "#666" },
  dimValue: { fontSize: 14, color: "#333", fontWeight: "500", paddingLeft: 12 },

  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  historyText: { fontSize: 14, lineHeight: 22 },
  moreBtn: { fontSize: 14, fontWeight: "600", marginTop: 6 },

  aiCard: { borderRadius: 16, padding: 16, marginTop: 24, marginBottom: 8 },
  aiText: { fontSize: 14, lineHeight: 22 },

  productsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  productCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    borderRadius: 12,
    overflow: "hidden",
    paddingBottom: 12,
  },
  productImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
  },
  productImagePlaceholder: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: "500",
    paddingHorizontal: 8,
    paddingTop: 10,
    lineHeight: 20,
  },
  productNamePlaceholder: {
    height: 16,
    borderRadius: 4,
    marginHorizontal: 8,
    marginTop: 10,
    width: "80%",
  },
  productPricePlaceholder: {
    height: 14,
    borderRadius: 4,
    marginHorizontal: 8,
    marginTop: 6,
    width: "40%",
  },
  productPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "600",
  },
  noProductsText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 24,
    width: "100%",
  },

  disclaimer: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 24,
    paddingHorizontal: 30,
  },

  bottomCta: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  addBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  addBtnText: { fontSize: 17, fontWeight: "700" },
});

const gradeStyles = StyleSheet.create({
  container: { marginBottom: 16, gap: 8 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerLabel: { fontSize: 14, fontWeight: "500" },
  gradeValueRight: { flexDirection: "row", alignItems: "center" },
  gradeValueLabel: { fontSize: 14, fontWeight: "500" },
  gradeValueNum: { fontSize: 14 },
  infoBtn: { marginLeft: 6 },
  scaleBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
    position: "relative",
    overflow: "visible",
  },
  scaleFill: {
    position: "absolute",
    left: 0,
    top: 0,
    height: 8,
    borderRadius: 4,
    width: "100%",
  },
  scaleMarker: { position: "absolute", top: -4, marginLeft: -1 },
  scaleMarkerLine: {
    width: 3,
    height: 16,
    borderRadius: 1.5,
  },
  scaleLabels: { flexDirection: "row", justifyContent: "space-between" },
  scaleLabelText: { fontSize: 11 },
});

const specStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 14 },
  value: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "right",
    flex: 1,
    marginLeft: 16,
  },
});

const sheetStyles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 18,
  },
  divider: { height: StyleSheet.hairlineWidth, width: "100%" },
  scrollContent: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 20 },
  title: { fontSize: 20, fontWeight: "700" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  rowText: { fontSize: 16, fontWeight: "500" },
  collectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 0,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    minHeight: 84,
  },
  collectionName: { fontSize: 18, fontWeight: "500" },
  collectionCount: { fontSize: 15, marginTop: 4 },
  collectionCoins: { flexDirection: "row", alignItems: "center" },
  collectionCoinImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
  },
  newFolderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 0,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginBottom: 14,
    minHeight: 84,
    borderWidth: 2,
    borderStyle: "dashed",
  },
  plusCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtn: {
    borderRadius: 18,
    width: "90%",
    paddingVertical: 16,
    alignItems: "center",
    marginHorizontal: 24,
    marginTop: 18,
  },
  confirmBtnText: {
    fontSize: 17,
    fontWeight: "700",
    paddingHorizontal: 20,
  },
  inputLabel: { fontSize: 15, fontWeight: "500", marginBottom: 8 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  guideContainer: { flex: 1, paddingHorizontal: 0, alignItems: "center" },
  newCollectionContainer: { flex: 1 },
  newCollectionBody: { paddingHorizontal: 24, paddingTop: 18 },
  newCollectionFooter: {
    marginTop: "auto",
  },
  guideTitle: {
    paddingHorizontal: 20,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  guideSubtitle: {
    paddingHorizontal: 20,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  guideCoinsScroll: { marginBottom: 20, paddingHorizontal: 20, },
  guideCoinImg: { width: "100%", height: 144, marginBottom: 24 },
  guideGradeText: { fontSize: 18, fontWeight: "700", marginBottom: 8, paddingHorizontal: 20, },
  guideGradeDesc: { fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 20, },
});
