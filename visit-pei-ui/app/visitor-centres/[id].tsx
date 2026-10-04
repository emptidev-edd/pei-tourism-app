import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ActivityIndicator, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLOR } from '../../styles';
import { useLocale } from '../../src/i18n';
import { useVisitorCentreQuery } from '../../src/services/query/visitorCentres/useVisitorCentreQuery';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#1c2530',
    shadowOpacity: 0.09,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  default: { elevation: 4 },
});

const openDirections = async (name: string, lat: number | null, lng: number | null) => {
  if (lat == null || lng == null) return;
  const query = encodeURIComponent(name);
  const url = Platform.select({
    ios: `maps://maps.apple.com/?q=${query}&ll=${lat},${lng}`,
    default: `https://www.google.com/maps/search/?api=1&query=${query}@${lat},${lng}`,
  });
  if (url) await Linking.openURL(url);
};

const openPhone = async (phone: string) => {
  const clean = phone.replace(/\s+/g, '');
  await Linking.openURL(`tel:${clean}`);
};

const openEmail = async (email: string) => {
  await Linking.openURL(`mailto:${email.trim()}`);
};

const openWebsite = async (url: string) => {
  const href = url.startsWith('http') ? url : `https://${url}`;
  await Linking.openURL(href);
};

const ActionChip = ({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    accessibilityRole='button'
    accessibilityLabel={label}
    style={styles.actionChip}
  >
    <MaterialCommunityIcons name={icon} size={16} color={COLOR.brandGreen} />
    <Text style={styles.actionChipText}>{label}</Text>
  </TouchableOpacity>
);

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconWrap}>
      <MaterialCommunityIcons name={icon} size={16} color={COLOR.brandGreen} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

export default function VisitorCentreDetail() {
  const { t } = useLocale();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useVisitorCentreQuery(id);

  const centre = query.data?.item ?? null;

  return (
    <>
      <StatusBar style='light' backgroundColor={COLOR.brandGreen} />
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.back()}
            accessibilityRole='button'
            accessibilityLabel={t('common.back')}
            style={styles.topBackBtn}
          >
            <MaterialCommunityIcons name='chevron-left' size={24} color={COLOR.whiteText} />
          </TouchableOpacity>
          <Text style={styles.topTitle} numberOfLines={1}>
            {centre?.name ?? t('visitorCentres.title')}
          </Text>
          <View style={styles.topBackBtn} />
        </View>

        {query.isPending ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLOR.brandGreen} size='large' />
          </View>
        ) : null}

        {query.isError ? (
          <View style={styles.center}>
            <MaterialCommunityIcons name='alert-circle-outline' size={36} color={COLOR.mutedText} />
            <Text style={styles.errorTitle}>{t('visitorCentres.detailErrorTitle')}</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => query.refetch()}
              style={styles.retryBtn}
            >
              <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {centre ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.body}>
              <Text style={styles.title}>{centre.name}</Text>
              {centre.community ? (
                <View style={styles.locationRow}>
                  <MaterialCommunityIcons name='map-marker-outline' size={14} color={COLOR.mutedText} />
                  <Text style={styles.locationText}>{centre.community}</Text>
                </View>
              ) : null}

              <View style={styles.actionsRow}>
                {centre.phone ? (
                  <ActionChip
                    icon='phone-outline'
                    label={t('visitorCentres.details.phone')}
                    onPress={() => openPhone(centre.phone as string)}
                  />
                ) : null}
                {centre.website ? (
                  <ActionChip
                    icon='web'
                    label={t('visitorCentres.details.website')}
                    onPress={() => openWebsite(centre.website as string)}
                  />
                ) : null}
                {centre.email ? (
                  <ActionChip
                    icon='email-outline'
                    label={t('visitorCentres.details.email')}
                    onPress={() => openEmail(centre.email as string)}
                  />
                ) : null}
                {centre.lat != null && centre.lng != null ? (
                  <ActionChip
                    icon='navigation-variant-outline'
                    label={t('visitorCentres.details.directions')}
                    onPress={() => openDirections(centre.name, centre.lat, centre.lng)}
                  />
                ) : null}
              </View>

              <Surface style={styles.infoCard} elevation={0}>
                {centre.address ? (
                  <InfoRow
                    icon='map-marker-outline'
                    label={t('common.directions')}
                    value={centre.address}
                  />
                ) : null}
                {centre.hours ? (
                  <InfoRow
                    icon='clock-outline'
                    label={t('visitorCentres.details.hours')}
                    value={centre.hours}
                  />
                ) : null}
                {centre.season ? (
                  <InfoRow
                    icon='calendar-clock-outline'
                    label={t('visitorCentres.details.season')}
                    value={centre.season}
                  />
                ) : null}
              </Surface>
            </View>
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLOR.brandGreen,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLOR.brandGreen,
  },
  topBackBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    color: COLOR.whiteText,
    fontSize: 15,
    fontWeight: '800',
    paddingHorizontal: 8,
  },
  scroll: {
    flex: 1,
    backgroundColor: COLOR.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 22,
    gap: 14,
  },
  title: {
    color: COLOR.headingText,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  locationText: {
    color: COLOR.mutedText,
    fontSize: 13,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLOR.lightGreen,
  },
  actionChipText: {
    color: COLOR.brandGreen,
    fontSize: 12,
    fontWeight: '800',
  },
  infoCard: {
    backgroundColor: COLOR.surface,
    borderRadius: 18,
    padding: 6,
    marginTop: 6,
    ...cardShadow,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLOR.lightGreen,
  },
  infoLabel: {
    color: COLOR.mutedText,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  infoValue: {
    color: COLOR.headingText,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLOR.background,
  },
  errorTitle: {
    color: COLOR.headingText,
    fontSize: 14,
    fontWeight: '800',
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: COLOR.brandGreen,
  },
  retryBtnText: {
    color: COLOR.whiteText,
    fontSize: 12,
    fontWeight: '800',
  },
});
