import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { COLOR } from '../../../../styles';

export type TransitTabId = 'nearby' | 'favorites' | 'coach';

export function TransitTabBar({
  activeTab,
  onChangeTab,
  nearbyCount,
  favoritesCount,
  routesCount,
}: {
  activeTab: TransitTabId;
  onChangeTab: (tab: TransitTabId) => void;
  nearbyCount: number;
  favoritesCount: number;
  routesCount: number | null;
}) {
  return (
    <View style={styles.tabBar}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onChangeTab('nearby')}
        style={[styles.tabItem, activeTab === 'nearby' && styles.tabItemActive]}
      >
        <Text style={[styles.tabText, activeTab === 'nearby' && styles.tabTextActive]}>
          Nearby
        </Text>
        <Text style={styles.tabCount}>{activeTab === 'nearby' ? `${nearbyCount}` : ''}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onChangeTab('favorites')}
        style={[styles.tabItem, activeTab === 'favorites' && styles.tabItemActive]}
      >
        <Text style={[styles.tabText, activeTab === 'favorites' && styles.tabTextActive]}>
          Favorites
        </Text>
        <Text style={styles.tabCount}>
          {activeTab === 'favorites' && favoritesCount > 0 ? `${favoritesCount}` : ''}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onChangeTab('coach')}
        style={[styles.tabItem, activeTab === 'coach' && styles.tabItemActive]}
      >
        <Text style={[styles.tabText, activeTab === 'coach' && styles.tabTextActive]}>
          Routes
        </Text>
        <Text style={styles.tabCount}>
          {activeTab === 'coach' && routesCount != null ? `${routesCount}` : ''}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.07)',
    marginBottom: 14,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: COLOR.brandGreen,
  },
  tabText: {
    color: '#6b7e8d',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#16202a',
    fontWeight: '800',
  },
  tabCount: {
    color: COLOR.brandGreen,
    fontSize: 13,
    fontWeight: '700',
  },
});
