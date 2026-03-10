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
  Image,
  Dimensions,
  Alert,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  LayoutChangeEvent,
} from "react-native";
import Animated from "react-native-reanimated";
import {
  ChevronLeft,
  MoreHorizontal,
  Plus,
  X,
  Trash2,
  FolderPlus,
  Info,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import type { MainStackParamList } from "../navigation/MainStack";
import { useThemeColors } from "../theme/useThemeColors";
import { triggerSelection } from "../lib/haptics";
import { supabase } from "../lib/supabase";
import { useSupabaseSession } from "../lib/useSupabaseSession";
import type { CollectionRow } from "./tabs/CollectionsScreen";

type Nav = NativeStackNavigationProp<MainStackParamList>;
type Route = RouteProp<MainStackParamList, "ScanResult">;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

function formatPrice(min: number | null, max: number | null): string {
  if (min != null && max != null)
    return `$${min.toFixed(2)} - $${max.toFixed(2)}`;
  if (min != null) return `$${min.toFixed(2)}`;
  if (max != null) return `$${max.toFixed(2)}`;
  return "-";
}

function GradeScale({
  value,
  label,
  onInfoPress,
}: {
  value: number | null;
  label: string | null;
  onInfoPress: () => void;
}) {
  const position = value ? Math.min(Math.max((value / 70) * 100, 2), 98) : 0;
  return (
    <View style={gradeStyles.container}>
      <View style={gradeStyles.headerRow}>
        <View style={gradeStyles.headerLeft}>
          <Text style={gradeStyles.headerLabel}>Coin Grading</Text>
          <TouchableOpacity
            onPress={onInfoPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Info size={16} color="#999" />
          </TouchableOpacity>
        </View>
        <View style={gradeStyles.gradeValuePill}>
          <Text style={gradeStyles.gradeValueLabel}>{label || "-"}</Text>
          <Text style={gradeStyles.gradeValueNum}>({value ?? "-"})</Text>
          <View style={gradeStyles.gradeDot} />
        </View>
      </View>
      <View style={gradeStyles.scaleBar}>
        <View style={gradeStyles.scaleFill} />
        {value != null && (
          <View style={[gradeStyles.scaleMarker, { left: `${position}%` }]}>
            <View style={gradeStyles.scaleMarkerDot} />
          </View>
        )}
      </View>
      <View style={gradeStyles.scaleLabels}>
        {GRADE_MARKS.map((m) => (
          <Text key={m} style={gradeStyles.scaleLabelText}>
            {m}
          </Text>
        ))}
      </View>
    </View>
  );
}

function SpecRow({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={specStyles.row}>
      <Text style={specStyles.label}>{label}:</Text>
      <Text style={specStyles.value}>{value || "-"}</Text>
    </View>
  );
}

export default function ScanResultScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const coin: CoinData = route.params.coin;
  const { session } = useSupabaseSession();
  const userId = session?.user?.id;

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

  const scrollRef = useRef<ScrollView>(null);
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
  const tabRowOffset = useRef(0);
  const isUserTap = useRef(false);

  const coinInCollection = useMemo(() => {
    return collections.find((c) => c.coin_ids?.includes(coin.id)) ?? null;
  }, [collections, coin.id]);

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
    addToSheetRef.current?.close();
    setTimeout(() => newCollectionSheetRef.current?.expand(), 200);
  };

  const handleAddToCollection = () => {
    triggerSelection();
    if (!userId) {
      Alert.alert(
        "Sign in required",
        "Please sign in to add coins to your collection.",
      );
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
    const newIds = [...(col.coin_ids || []), coin.id];
    await supabase
      .from("collections")
      .update({ coin_ids: newIds, updated_at: new Date().toISOString() })
      .eq("id", col.id);
    addToSheetRef.current?.close();
    setSelectedCollectionId(null);
    fetchCollections();
    Alert.alert("Added", `Coin added to "${col.name}"`);
  };

  const handleCreateAndAdd = async () => {
    if (!newCollectionName.trim() || !userId) return;
    setCreating(true);
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
      Alert.alert(
        "Created",
        `Collection "${data.name}" created and coin added.`,
      );
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

  const scrollToSection = (tab: TabKey) => {
    triggerSelection();
    isUserTap.current = true;
    setActiveTab(tab);
    const offset = sectionOffsets.current[tab];
    scrollRef.current?.scrollTo({ y: offset - 60, animated: true });
    setTimeout(() => {
      isUserTap.current = false;
    }, 500);
  };

  const handleScroll = (event: any) => {
    if (isUserTap.current) return;
    const y = event.nativeEvent.contentOffset.y + 70;
    const tabs: TabKey[] = ["Products", "History", "Dimensions", "Details"];
    for (const tab of tabs) {
      if (y >= sectionOffsets.current[tab]) {
        setActiveTab(tab);
        return;
      }
    }
    setActiveTab("Details");
  };

  const onSectionLayout = (tab: TabKey) => (e: LayoutChangeEvent) => {
    sectionOffsets.current[tab] = e.nativeEvent.layout.y;
  };

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
                <Animated.Image
                  source={{ uri: coin.front_image_url }}
                  style={styles.coinImage}
                  resizeMode="contain"
                  sharedTransitionTag={`coin-front-${coin.id}`}
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
                <Animated.Image
                  source={{ uri: coin.back_image_url }}
                  style={styles.coinImage}
                  resizeMode="contain"
                  sharedTransitionTag={`coin-back-${coin.id}`}
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
                { backgroundColor: colors.background.bgAlt },
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
                { backgroundColor: colors.background.bgAlt },
              ]}
            >
              <Text style={[styles.statValue, { color: colors.text.textBase }]}>
                {coin.composition || "-"}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.textAlt }]}>
                Composition
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.priceSection,
              { borderColor: colors.border.border3 },
            ]}
          >
            <Text style={[styles.priceText, { color: colors.text.textBase }]}>
              {formatPrice(coin.estimated_price_min, coin.estimated_price_max)}
            </Text>
            <Text style={[styles.priceSubtext, { color: colors.text.textAlt }]}>
              Price depends on eBay
            </Text>
          </View>

          <GradeScale
            value={coin.grade_value}
            label={coin.grade_label}
            onInfoPress={() => guideSheetRef.current?.expand()}
          />
        </View>

        {/* Sticky Tab Row */}
        <View
          style={[
            styles.tabsRow,
            {
              backgroundColor: colors.background.bgBaseElevated,
              borderBottomColor: colors.border.border3,
            },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsInner}
          >
            {TAB_KEYS.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  activeTab === tab && {
                    borderBottomColor: colors.text.textBrand,
                    borderBottomWidth: 2,
                  },
                ]}
                onPress={() => scrollToSection(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        activeTab === tab
                          ? colors.text.textBase
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
          <View onLayout={onSectionLayout("Details")}>
            <Text
              style={[styles.sectionTitle, { color: colors.text.textBase }]}
            >
              Specifications
            </Text>
            <SpecRow label="Denomination" value={coin.denomination} />
            <SpecRow label="Metal" value={coin.metal_composition_detailed} />
            <SpecRow
              label="Weight"
              value={coin.weight_grams ? `${coin.weight_grams} grams` : null}
            />
            <SpecRow
              label="Diameter"
              value={coin.diameter_mm ? `${coin.diameter_mm} mm` : null}
            />
            <SpecRow
              label="Thickness"
              value={coin.thickness_mm ? `~${coin.thickness_mm} mm` : null}
            />
            <SpecRow label="Edge" value={coin.edge_type} />
          </View>

          {/* Dimensions */}
          <View
            onLayout={onSectionLayout("Dimensions")}
            style={styles.sectionBlock}
          >
            <Text
              style={[styles.sectionTitle, { color: colors.text.textBase }]}
            >
              Dimensions
            </Text>
            <View style={styles.dimensionsCard}>
              <View style={styles.dimContent}>
                <View style={styles.dimRow}>
                  <Text style={styles.dimLabel}>Weight:</Text>
                  <Text style={styles.dimValue}>
                    {coin.weight_grams ? `${coin.weight_grams} grams` : "-"}
                  </Text>
                </View>
                <View style={styles.dimRow}>
                  <Text style={styles.dimLabel}>Diameter:</Text>
                  <Text style={styles.dimValue}>
                    {coin.diameter_mm ? `${coin.diameter_mm} mm` : "-"}
                  </Text>
                </View>
                <View style={styles.dimRow}>
                  <Text style={styles.dimLabel}>Thickness:</Text>
                  <Text style={styles.dimValue}>
                    {coin.thickness_mm ? `~${coin.thickness_mm} mm` : "-"}
                  </Text>
                </View>
              </View>
              {coin.back_image_url && (
                <Image
                  source={{ uri: coin.back_image_url }}
                  style={styles.dimCoinImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </View>

          {/* History */}
          <View
            onLayout={onSectionLayout("History")}
            style={styles.sectionBlock}
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
            <View style={[styles.aiCard, { backgroundColor: "#FFF8EC" }]}>
              <Text style={[styles.aiTitle, { color: colors.text.textBrand }]}>
                AI Opinion
              </Text>
              <Text style={[styles.aiText, { color: colors.text.textBase }]}>
                {coin.ai_opinion}
              </Text>
            </View>
          )}

          {/* Products */}
          <View
            onLayout={onSectionLayout("Products")}
            style={styles.sectionBlock}
          >
            <Text
              style={[styles.sectionTitle, { color: colors.text.textBase }]}
            >
              Similar Products from Ebay
            </Text>
            <View style={styles.productsGrid}>
              <View
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
                <Text
                  style={[
                    styles.productName,
                    { color: colors.text.textTertiary },
                  ]}
                >
                  Coming soon
                </Text>
              </View>
              <View
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
                <Text
                  style={[
                    styles.productName,
                    { color: colors.text.textTertiary },
                  ]}
                >
                  Coming soon
                </Text>
              </View>
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
            backgroundColor: colors.background.bgBase,
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
            <Text style={styles.addBtnText}>See your Collection</Text>
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
            <Plus size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.addBtnText}>Add to Collection</Text>
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
        backgroundStyle={{ backgroundColor: colors.background.bgBase }}
        handleIndicatorStyle={{ backgroundColor: colors.border.border3, width: 36, height: 4, borderRadius: 2 }}
      >
        <BottomSheetView style={sheetStyles.container}>
          <TouchableOpacity style={sheetStyles.row} onPress={openAddToSheet}>
            <FolderPlus size={22} color={colors.text.textBase} />
            <Text
              style={[sheetStyles.rowText, { color: colors.text.textBase }]}
            >
              Add to
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
            <Trash2 size={22} color="#E53935" />
            <Text style={[sheetStyles.rowText, { color: "#E53935" }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>

      {/* Add to Collection Bottom Sheet */}
      <BottomSheet
        ref={addToSheetRef}
        index={-1}
        snapPoints={["55%"]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.background.bgBase }}
        handleIndicatorStyle={{ backgroundColor: colors.border.border3 }}
      >
        <BottomSheetView style={sheetStyles.container}>
          <View style={sheetStyles.headerRow}>
            <Text style={[sheetStyles.title, { color: colors.text.textBase }]}>
              Add to
            </Text>
            <TouchableOpacity onPress={() => addToSheetRef.current?.close()}>
              <X size={24} color={colors.text.textBase} />
            </TouchableOpacity>
          </View>
          {loadingCollections ? (
            <ActivityIndicator
              size="small"
              color={colors.text.textBase}
              style={{ marginVertical: 20 }}
            />
          ) : (
            <BottomSheetScrollView style={{ flex: 1 }}>
              {collections.map((col) => {
                const isSelected = selectedCollectionId === col.id;
                const coinImages = getCollectionCoins(col);
                return (
                  <TouchableOpacity
                    key={col.id}
                    style={[
                      sheetStyles.collectionRow,
                      {
                        borderColor: isSelected
                          ? colors.text.textBrand
                          : colors.border.border3,
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
                      {coinImages.map((c, idx) => (
                        <Image
                          key={c.id}
                          source={{
                            uri: c.front_image_url || c.back_image_url || "",
                          }}
                          style={[
                            sheetStyles.collectionCoinImg,
                            { marginLeft: idx > 0 ? -12 : 0 },
                          ]}
                        />
                      ))}
                    </View>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={sheetStyles.newFolderRow}
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
                    { backgroundColor: colors.background.bgAlt },
                  ]}
                >
                  <Plus size={20} color={colors.text.textBase} />
                </View>
              </TouchableOpacity>
            </BottomSheetScrollView>
          )}
          <TouchableOpacity
            style={[
              sheetStyles.confirmBtn,
              {
                backgroundColor: selectedCollectionId
                  ? "#1C1C1E"
                  : colors.border.border3,
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
                    ? "#fff"
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
        snapPoints={["60%"]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.background.bgBase }}
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={sheetStyles.guideCoinsScroll}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
          >
            {[coin.front_image_url, coin.back_image_url]
              .filter(Boolean)
              .map((url, idx) => (
                <Image
                  key={idx}
                  source={{ uri: url! }}
                  style={sheetStyles.guideCoinImg}
                />
              ))}
          </ScrollView>
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
              { backgroundColor: "#1C1C1E", marginTop: 20 },
            ]}
            onPress={() => guideSheetRef.current?.close()}
            activeOpacity={0.8}
          >
            <Text style={sheetStyles.confirmBtnText}>Understand</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>

      {/* New Collection Bottom Sheet */}
      <BottomSheet
        ref={newCollectionSheetRef}
        index={-1}
        snapPoints={["40%"]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.background.bgBase }}
        handleIndicatorStyle={{ backgroundColor: colors.border.border3 }}
        keyboardBehavior="interactive"
        android_keyboardInputMode="adjustResize"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <BottomSheetView style={sheetStyles.container}>
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
            <TouchableOpacity
              style={[
                sheetStyles.confirmBtn,
                {
                  backgroundColor: newCollectionName.trim()
                    ? colors.background.brand
                    : colors.border.border3,
                },
              ]}
              onPress={handleCreateAndAdd}
              disabled={!newCollectionName.trim() || creating}
              activeOpacity={0.8}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  style={[
                    sheetStyles.confirmBtnText,
                    {
                      color: newCollectionName.trim()
                        ? "#fff"
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
  },
  statValue: { fontSize: 16, fontWeight: "700" },
  statLabel: { fontSize: 12, marginTop: 2 },

  priceSection: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 14,
    marginBottom: 16,
  },
  priceText: { fontSize: 24, fontWeight: "800" },
  priceSubtext: { fontSize: 12, marginTop: 2 },

  tabsRow: { borderBottomWidth: 1, paddingHorizontal: 20, zIndex: 10 },
  tabsInner: { flexDirection: "row", gap: 0 },
  tab: { paddingHorizontal: 16, paddingVertical: 12, alignItems: "center" },
  tabText: { fontSize: 14 },

  sectionsWrap: { paddingHorizontal: 20, paddingTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  sectionBlock: { marginTop: 24 },

  dimensionsCard: { flexDirection: "row", alignItems: "center" },
  dimContent: { flex: 1 },
  dimRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  dimLabel: { fontSize: 14, color: "#666" },
  dimValue: { fontSize: 14, color: "#333", fontWeight: "500" },
  dimCoinImage: { width: 80, height: 80, borderRadius: 40, marginLeft: 16 },

  historyText: { fontSize: 14, lineHeight: 22 },
  moreBtn: { fontSize: 14, fontWeight: "600", marginTop: 6 },

  aiCard: { borderRadius: 16, padding: 16, marginTop: 24, marginBottom: 8 },
  aiTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  aiText: { fontSize: 14, lineHeight: 22 },

  productsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  productCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  productImagePlaceholder: { width: "100%", aspectRatio: 1, borderRadius: 8 },
  productName: { fontSize: 13, padding: 8 },

  disclaimer: { fontSize: 12, textAlign: "center", marginTop: 24 },

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
  addBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});

const gradeStyles = StyleSheet.create({
  container: { marginBottom: 16 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerLabel: { fontSize: 14, color: "#666" },
  gradeValuePill: { flexDirection: "row", alignItems: "center", gap: 4 },
  gradeValueLabel: { fontSize: 14, color: "#333", fontWeight: "500" },
  gradeValueNum: { fontSize: 14, color: "#333" },
  gradeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#DFAC4C",
  },
  scaleBar: {
    height: 6,
    backgroundColor: "#E8E8E8",
    borderRadius: 3,
    marginBottom: 6,
    position: "relative",
    overflow: "visible",
  },
  scaleFill: {
    position: "absolute",
    left: 0,
    top: 0,
    height: 6,
    backgroundColor: "#DFAC4C",
    borderRadius: 3,
    width: "100%",
  },
  scaleMarker: { position: "absolute", top: -5, marginLeft: -8 },
  scaleMarkerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#DFAC4C",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  scaleLabels: { flexDirection: "row", justifyContent: "space-between" },
  scaleLabelText: { fontSize: 11, color: "#999" },
});

const specStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  label: { fontSize: 14, color: "#666" },
  value: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    textAlign: "right",
    flex: 1,
    marginLeft: 16,
  },
});

const sheetStyles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  collectionName: { fontSize: 16, fontWeight: "600" },
  collectionCount: { fontSize: 13, marginTop: 2 },
  collectionCoins: { flexDirection: "row", alignItems: "center" },
  collectionCoinImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#fff",
  },
  newFolderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  plusCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12,
  },
  confirmBtnText: { color: "#fff", fontSize: 17, fontWeight: "700", paddingHorizontal: 20 },
  inputLabel: { fontSize: 15, fontWeight: "500", marginBottom: 8 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  guideContainer: { flex: 1, paddingHorizontal: 20, alignItems: "center" },
  guideTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  guideSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  guideCoinsScroll: { marginBottom: 20 },
  guideCoinImg: { width: 80, height: 80, borderRadius: 40 },
  guideGradeText: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  guideGradeDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
