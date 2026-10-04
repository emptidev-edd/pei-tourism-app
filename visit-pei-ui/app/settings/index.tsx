import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Constants from 'expo-constants';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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
import {
  useFontScale,
  useLocale,
  type FontScale,
  type Locale,
} from '../../src/i18n';

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#1c2530',
    shadowOpacity: 0.09,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  default: { elevation: 4 },
});

type RowOption<T extends string> = {
  id: T;
  label: string;
  hint?: string;
};

const OptionRow = <T extends string>({
  option,
  selected,
  onPress,
}: {
  option: RowOption<T>;
  selected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    accessibilityRole='radio'
    accessibilityState={{ selected }}
    accessibilityLabel={option.label}
    activeOpacity={0.75}
    onPress={onPress}
    style={styles.optionRow}
  >
    <View style={styles.optionCopy}>
      <Text style={styles.optionLabel}>{option.label}</Text>
      {option.hint ? <Text style={styles.optionHint}>{option.hint}</Text> : null}
    </View>
    <View style={[styles.radio, selected && styles.radioSelected]}>
      {selected ? <View style={styles.radioDot} /> : null}
    </View>
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const { locale, setLocale, t } = useLocale();
  const { fontScale, setFontScale } = useFontScale();

  const languageOptions: RowOption<Locale>[] = [
    { id: 'en', label: t('settings.language.en') },
    { id: 'fr', label: t('settings.language.fr') },
  ];

  const fontScaleOptions: RowOption<FontScale>[] = [
    { id: 'small',   label: t('settings.fontScale.small') },
    { id: 'default', label: t('settings.fontScale.default') },
    { id: 'large',   label: t('settings.fontScale.large') },
  ];

  return (
    <>
      <StatusBar style='dark' backgroundColor={COLOR.background} />
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.back()}
            accessibilityRole='button'
            accessibilityLabel={t('common.back')}
            style={styles.headerBackBtn}
          >
            <MaterialCommunityIcons name='chevron-left' size={24} color={COLOR.headingText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('settings.title')}</Text>
          <View style={styles.headerBackBtn} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <Text style={styles.sectionLabel}>{t('settings.language.section')}</Text>
          <Surface style={styles.card} elevation={0}>
            {languageOptions.map((option, idx) => (
              <View key={option.id}>
                <OptionRow
                  option={option}
                  selected={locale === option.id}
                  onPress={() => setLocale(option.id)}
                />
                {idx < languageOptions.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </Surface>

          <Text style={[styles.sectionLabel, styles.sectionSpacing]}>
            {t('settings.fontScale.section')}
          </Text>
          <Surface style={styles.card} elevation={0}>
            {fontScaleOptions.map((option, idx) => (
              <View key={option.id}>
                <OptionRow
                  option={option}
                  selected={fontScale === option.id}
                  onPress={() => setFontScale(option.id)}
                />
                {idx < fontScaleOptions.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </Surface>

          <Text style={[styles.sectionLabel, styles.sectionSpacing]}>
            {t('settings.about.section')}
          </Text>
          <Surface style={styles.card} elevation={0}>
            <View style={styles.aboutRow}>
              <Text style={styles.optionLabel}>{t('settings.about.version')}</Text>
              <Text style={styles.aboutValue}>
                {Constants.expoConfig?.version ?? '1.0.0'}
              </Text>
            </View>
          </Surface>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLOR.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    color: COLOR.headingText,
    fontSize: 17,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  sectionLabel: {
    color: COLOR.mutedText,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionSpacing: {
    marginTop: 24,
  },
  card: {
    backgroundColor: COLOR.surface,
    borderRadius: 18,
    overflow: 'hidden',
    ...cardShadow,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'transparent',
  },
  optionCopy: {
    flex: 1,
    paddingRight: 12,
  },
  optionLabel: {
    color: COLOR.headingText,
    fontSize: 15,
    fontWeight: '700',
  },
  optionHint: {
    color: COLOR.mutedText,
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLOR.borderSoft,
    marginLeft: 16,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLOR.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: COLOR.brandGreen,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLOR.brandGreen,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  aboutValue: {
    color: COLOR.mutedText,
    fontSize: 14,
    fontWeight: '600',
  },
});
