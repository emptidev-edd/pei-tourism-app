import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CommonActions } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const TAB_ICON_SIZE = 24;
const BRAND_GREEN   = '#007960';
const INACTIVE_COLOR = 'rgba(52, 64, 83, 0.45)';

const TabsLayout = () => {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={({ navigation, state, descriptors, insets }) => {
        const bottomOffset = Math.max(insets.bottom - 10, 6);
        const bottomPadding = Math.min(Math.max(insets.bottom - 20, 2), 8);

        return (
          <View style={[styles.tabBarShell, { bottom: bottomOffset }]}>
            <View style={[styles.tabBar, { paddingBottom: bottomPadding }]}>
              {state.routes.map((route, index) => {
                const focused = state.index === index;
                const { options } = descriptors[route.key];
                const label =
                  typeof options.tabBarLabel === 'string'
                    ? options.tabBarLabel
                    : typeof options.title === 'string'
                      ? options.title
                      : route.name;
                const color = focused ? BRAND_GREEN : INACTIVE_COLOR;

                return (
                  <Pressable
                    key={route.key}
                    accessibilityRole='button'
                    accessibilityState={focused ? { selected: true } : {}}
                    style={[styles.tabPressable, focused && styles.tabPressableActive]}
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
                      {focused && (
                        <Text style={styles.tabLabel} numberOfLines={1}>{label}</Text>
                      )}
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
          title: 'Home',
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
          title: 'Discover',
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
        name='events'
        options={{
          title: 'Events',
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
          title: 'Transit',
          tabBarIcon: ({ color, focused, size }) => (
            <MaterialCommunityIcons
              name={focused ? 'map-marker' : 'map-marker-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name='trip-planner'
        options={{
          title: 'Planner',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name='map-marker-path'
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
    paddingHorizontal: 6,
    paddingTop: 8,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    // iOS shadow
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    // Android shadow
    elevation: 12,
  },
  tabPressable: {
    flex: 1,
  },
  tabPressableActive: {
    flex: 1.8,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginHorizontal: 2,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 56,
  },
  tabInnerActive: {
    backgroundColor: '#e6f2ef',
    paddingHorizontal: 16,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007960',
    letterSpacing: 0.1,
    lineHeight: 14,
  },
});

export default TabsLayout;
