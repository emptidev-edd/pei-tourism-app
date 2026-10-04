import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CommonActions } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLocale } from '../../src/i18n';

const TAB_ICON_SIZE  = 24;
const ACTIVE_COLOR   = '#007960';
const INACTIVE_COLOR = 'rgba(52, 64, 83, 0.45)';

const TabsLayout = () => {
  const { t } = useLocale();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={({ navigation, state, descriptors, insets }) => {
        const bottomOffset = Math.max(insets.bottom, 20);

        return (
          <View style={[styles.tabBarShell, { bottom: bottomOffset }]}>
            <View style={styles.tabBar}>
              {state.routes.map((route, index) => {
                const focused = state.index === index;
                const { options } = descriptors[route.key];
                const color = focused ? ACTIVE_COLOR : INACTIVE_COLOR;
                const label = typeof options.title === 'string' ? options.title : route.name;

                return (
                  <Pressable
                    key={route.key}
                    accessibilityRole='button'
                    accessibilityLabel={label}
                    accessibilityState={focused ? { selected: true } : {}}
                    style={styles.tabPressable}
                    onPress={() => {
                      const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                      });

                      if (event.defaultPrevented) return;

                      navigation.dispatch({
                        ...CommonActions.navigate(route.name, route.params),
                        target: state.key,
                      });
                    }}
                    onLongPress={() => {
                      navigation.emit({
                        type: 'tabLongPress',
                        target: route.key,
                      });
                    }}
                  >
                    <View style={[styles.tabInner, focused && styles.tabInnerActive]}>
                      {options.tabBarIcon?.({ focused, color, size: TAB_ICON_SIZE })}
                      <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
                        {label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      }}
    >
      <Tabs.Screen
        name='home'
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, focused, size }) => (
            <MaterialCommunityIcons
              name={focused ? 'home-variant' : 'home-variant-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name='discover'
        options={{
          title: t('tabs.discover'),
          tabBarIcon: ({ color, focused, size }) => (
            <MaterialCommunityIcons
              name={focused ? 'map-search' : 'map-search-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name='plan'
        options={{
          title: t('tabs.plan'),
          tabBarIcon: ({ color, focused, size }) => (
            <MaterialCommunityIcons
              name={focused ? 'auto-fix' : 'auto-fix'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name='events'
        options={{
          title: t('tabs.events'),
          tabBarIcon: ({ color, focused, size }) => (
            <MaterialCommunityIcons
              name={focused ? 'calendar-star' : 'calendar-star-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name='transit'
        options={{
          title: t('tabs.transit'),
          tabBarIcon: ({ color, focused, size }) => (
            <MaterialCommunityIcons
              name={focused ? 'bus' : 'bus-stop'}
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
};

const styles = StyleSheet.create({
  tabBarShell: {
    position: 'absolute',
    left: 12,
    right: 12,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 6,
    paddingBottom: 6,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  tabPressable: {
    flex: 1,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 7,
    minHeight: 52,
  },
  tabInnerActive: {
    backgroundColor: '#e6f2ef',
  },
  tabLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '600',
  },
});

export default TabsLayout;
