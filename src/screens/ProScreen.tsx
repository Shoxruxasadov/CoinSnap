import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Linking,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Check } from 'lucide-react-native';
import { triggerSelection, triggerImpact } from '../lib/haptics';
import Purchases, { PurchasesPackage } from 'react-native-purchases';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Plan = 'monthly' | 'annual';

const FEATURES = [
  'Unlimited Coin Identification',
  'Real Market Value from eBay',
  'Organize Your Collection in One Place',
  'Join a Community of 10,000+ Collectors',
];

export default function ProScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [selectedPlan, setSelectedPlan] = useState<Plan>('monthly');
  const [monthlyPkg, setMonthlyPkg] = useState<PurchasesPackage | null>(null);
  const [annualPkg, setAnnualPkg] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const offerings = await Purchases.getOfferings();
        const current = offerings.current;
        if (current) {
          setMonthlyPkg(current.monthly ?? null);
          setAnnualPkg(current.annual ?? null);
        }
      } catch (e) {
        console.warn('Failed to fetch offerings:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const monthlyPrice = monthlyPkg?.product?.priceString ?? '$4.99';
  const annualPrice = annualPkg?.product?.priceString ?? '$29.99';
  const annualRaw = annualPkg?.product?.price ?? 29.99;
  const weeklyFromAnnual = (annualRaw / 52).toFixed(2);
  const currencySymbol = (annualPkg?.product?.priceString ?? '$29.99').replace(/[\d.,\s]/g, '') || '$';
  const weeklyPrice = `${currencySymbol}${weeklyFromAnnual}`;

  const handleBack = () => {
    triggerSelection();
    navigation.goBack();
  };

  const handleSelectPlan = (plan: Plan) => {
    triggerSelection();
    setSelectedPlan(plan);
  };

  const handlePurchase = async () => {
    triggerImpact();
    const pkg = selectedPlan === 'monthly' ? monthlyPkg : annualPkg;
    if (!pkg) return;

    setPurchasing(true);
    try {
      await Purchases.purchasePackage(pkg);
      navigation.goBack();
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Error', e.message || 'Purchase failed');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    triggerSelection();
    setPurchasing(true);
    try {
      const info = await Purchases.restorePurchases();
      const hasActive = Object.keys(info.entitlements.active).length > 0;
      if (hasActive) {
        Alert.alert('Restored', 'Your subscription has been restored.');
        navigation.goBack();
      } else {
        Alert.alert('No Subscription', 'No active subscription found.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Restore failed');
    } finally {
      setPurchasing(false);
    }
  };

  const handleTerms = () => Linking.openURL('https://example.com/terms');
  const handlePrivacy = () => Linking.openURL('https://example.com/privacy');

  const priceDescription = selectedPlan === 'monthly'
    ? `3-day free trial, then ${monthlyPrice}/month`
    : `${annualPrice}/year (${weeklyPrice}/week). Cancel anytime`;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Image
        source={require('../../assets/home/pro.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['#0A0A0A00', '#0A0A0AFF']}
        locations={[0.1, 0.9]}
        style={styles.gradientOverlay}
      />

      <View style={[styles.content, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <ChevronLeft size={28} color="#fff" />
        </TouchableOpacity>

        <View style={styles.spacer} />

        <Text style={styles.title}>Upgrade to PRO</Text>
        <Text style={styles.subtitle}>
          Unlock Full Value.{'\n'}Unlimited scans. Instant value. Market prices. 
        </Text>

        <View style={styles.featuresList}>
          {FEATURES.map((feature, idx) => (
            <View key={idx} style={styles.featureRow}>
              <Check size={24} color="#fff" strokeWidth={3} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color="#D4A84B" style={{ marginBottom: 40 }} />
        ) : (
          <>
            <View style={styles.plansRow}>
              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPlan === 'monthly' && styles.planCardSelected,
                ]}
                onPress={() => handleSelectPlan('monthly')}
                activeOpacity={0.8}
              >
                <View style={styles.planHeader}>
                  <Text style={styles.planTitle}>Monthly</Text>
                  <View
                    style={[
                      styles.radio,
                      selectedPlan === 'monthly' && styles.radioSelected,
                    ]}
                  >
                    {selectedPlan === 'monthly' && <Check size={14} color="#000" strokeWidth={3} />}
                  </View>
                </View>
                <Text style={styles.planPrice}>{monthlyPrice}/month</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPlan === 'annual' && styles.planCardSelected,
                ]}
                onPress={() => handleSelectPlan('annual')}
                activeOpacity={0.8}
              >
                <View style={styles.planHeader}>
                  <Text style={styles.planTitle}>Annual</Text>
                  <View
                    style={[
                      styles.radio,
                      selectedPlan === 'annual' && styles.radioSelected,
                    ]}
                  >
                    {selectedPlan === 'annual' && <Check size={14} color="#000" strokeWidth={3} />}
                  </View>
                </View>
                <Text style={styles.planPrice}>{annualPrice}/year</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.priceText}>{priceDescription}</Text>

            <TouchableOpacity
              style={[styles.ctaBtn, purchasing && { opacity: 0.6 }]}
              onPress={handlePurchase}
              activeOpacity={0.85}
              disabled={purchasing}
            >
              {purchasing ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.ctaText}>
                  CONTINUE
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleTerms}>
            <Text style={styles.footerLink}>Terms of Service</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRestore} disabled={purchasing}>
            <Text style={styles.footerLink}>Restore</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePrivacy}>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.74,
    zIndex: 0,
    objectFit: 'cover',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.8,
    zIndex: 1,
  },
  content: {
    flex: 1,
    zIndex: 2,
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  spacer: {
    height: SCREEN_WIDTH * 0.45,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  featuresList: {
    marginBottom: 28,
    gap: 16,
    marginLeft: 2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 17,
    color: '#fff',
    fontWeight: '500',
  },
  plansRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  planCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  planCardSelected: {
    borderColor: '#D4A84B',
    backgroundColor: 'rgba(212,168,75,0.1)',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  planPrice: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    backgroundColor: '#D4A84B',
    borderColor: '#D4A84B',
  },
  priceText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 20,
  },
  ctaBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  footerLink: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
});
