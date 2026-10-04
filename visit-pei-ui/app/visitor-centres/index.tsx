import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLOR } from '../../styles';
import { useLocale } from '../../src/i18n';
import { useVisitorCentresQuery } from '../../src/services/query/visitorCentres/useVisitorCentresQuery';
import type { VisitorCentre } from '../../src/types/api';

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#1c2530',
    shadowOpacity: 0.09,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  default: { elevation: 4 },
});

type Group = { community: string; items: VisitorCentre[] };

const groupByCommunity = (items: VisitorCentre[], otherLabel: string): Group[] => {
  const map = new Map<string, VisitorCentre[]>();
  for (const item of items) {
    const key = item.community?.trim() || otherLabel;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => {
      // push the "other" group to the bottom
      if (a === otherLabel) return 1;
      if (b === otherLabel) return -1;
      return a.localeCompare(b);
    })
    .map(([community, list]) => ({ community, items: list }));
};

const RowSkeleton = () => (
  <View style={styles.row}>
    <View style={[styles.rowIcon, { backgroundColor: COLOR.backgroundSoft }]} />
    <View style={{ flex: 1, gap: 6 }}>
      <View style={[styles.skeletonLine, { width: '70%' }]} />
      <View style={[styles.skeletonLine, { width: '50%', height: 10 }]} />
    </View>
  </View>
);

const CentreRow = ({
  centre,
  onPress,
}: {
  centre: VisitorCentre;
  onPress: () => void;
}) => {
  const subtitle = centre.address?.trim() || centre.season?.trim() || centre.hours?.trim() || null;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={centre.name}
      style={styles.row}
    >
      <View style={styles.rowIcon}>
        <MaterialCommunityIcons name='information-outline' size={20} color={COLOR.brandGreen} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.rowName} numberOfLines={1}>{centre.name}</Text>
        {subtitle ? <Text style={styles.rowSub} numberOfLines={2}>{subtitle}</Text> : null}
        {centre.season ? (
          <View style={styles.rowSeason}>
            <MaterialCommunityIcons name='calendar-clock-outline' size={11} color={COLOR.brandGreen} />
            <Text style={styles.rowSeasonText} numberOfLines={1}>{centre.season}</Text>
          </View>
        ) : null}
      </View>
      <MaterialCommunityIcons name='chevron-right' size={22} color={COLOR.mutedText} />
    </TouchableOpacity>
  );
};

export default function VisitorCentresScreen() {
  const { t } = useLocale();
  const query = useVisitorCentresQuery();

  const items = query.data?.items ?? [];
  const otherLabel = t('visitorCentres.noCommunity');

  const groups = useMemo(
    () => (items.length > 0 ? groupByCommunity(items, otherLabel) : []),
    [items, otherLabel],
  );

  return (
    <>
      <StatusBar style='light' backgroundColor={COLOR.brandGreen} />
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.back()}
            accessibilityRole='button'
            accessibilityLabel={t('common.back')}
            style={styles.headerBackBtn}
          >
            <MaterialCommunityIcons name='chevron-left' size={26} color={COLOR.whiteText} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerKicker}>PEI</Text>
            <Text style={styles.headerTitle}>{t('visitorCentres.title')}</Text>
            <Text style={styles.headerSub}>{t('visitorCentres.subtitle')}</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={undefined}
        >
          {query.isPending ? (
            <Surface style={styles.card} elevation={0}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i}>
                  <RowSkeleton />
                  {i < 3 ? <View style={styles.divider} /> : null}
                </View>
              ))}
            </Surface>
          ) : null}

          {query.isError ? (
            <Surface style={styles.errorCard} elevation={0}>
              <MaterialCommunityIcons name='alert-circle-outline' size={22} color={COLOR.brandGreen} />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorTitle}>{t('visitorCentres.errorTitle')}</Text>
                <Text style={styles.errorBody}>{t('visitorCentres.errorBody')}</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => query.refetch()}
                style={styles.retryBtn}
              >
                <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </Surface>
          ) : null}

          {!query.isPending && !query.isError && items.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name='information-off-outline' size={32} color={COLOR.mutedText} />
              <Text style={styles.emptyText}>{t('visitorCentres.empty')}</Text>
            </View>
          ) : null}

          {!query.isPending && !query.isError && items.length > 0 ? (
            <>
              <Text style={styles.summary}>
                {t('visitorCentres.across', { count: items.length })}
              </Text>
              {groups.map((group) => (
                <View key={group.community} style={styles.groupWrap}>
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupName}>{group.community}</Text>
                  </View>
                  <Surface style={styles.card} elevation={0}>
                    {group.items.map((centre, idx) => (
                      <View key={centre.id}>
                        <CentreRow
                          centre={centre}
                          onPress={() =>
                            router.push({
                              pathname: '/visitor-centres/[id]',
                              params: { id: centre.id },
                            })
                          }
                        />
                        {idx < group.items.length - 1 ? <View style={styles.divider} /> : null}
                      </View>
                    ))}
                  </Surface>
                </View>
              ))}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLOR.brandGreen,
  },
  header: {
    backgroundColor: COLOR.brandGreen,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerKicker: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 6,
  },
  headerTitle: {
    color: COLOR.whiteText,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    marginTop: 2,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  scroll: {
    flex: 1,
    backgroundColor: COLOR.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  summary: {
    color: COLOR.mutedText,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  groupWrap: {
    marginBottom: 18,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  groupName: {
    color: COLOR.headingText,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: COLOR.surface,
    borderRadius: 18,
    overflow: 'hidden',
    ...cardShadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLOR.lightGreen,
  },
  rowName: {
    color: COLOR.headingText,
    fontSize: 14,
    fontWeight: '800',
  },
  rowSub: {
    color: COLOR.mutedText,
    fontSize: 12,
    lineHeight: 16,
  },
  rowSeason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: COLOR.lightGreen,
  },
  rowSeasonText: {
    color: COLOR.brandGreen,
    fontSize: 10,
    fontWeight: '800',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLOR.borderSoft,
    marginLeft: 64,
  },
  empty: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    color: COLOR.mutedText,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: COLOR.surface,
    ...cardShadow,
  },
  errorTitle: {
    color: COLOR.headingText,
    fontSize: 14,
    fontWeight: '800',
  },
  errorBody: {
    color: COLOR.mutedText,
    fontSize: 12,
    marginTop: 2,
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLOR.lightGreen,
  },
  retryBtnText: {
    color: COLOR.brandGreen,
    fontSize: 12,
    fontWeight: '800',
  },
  skeletonLine: {
    height: 13,
    borderRadius: 999,
    backgroundColor: COLOR.backgroundSoft,
  },
});