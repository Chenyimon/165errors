import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from './src/theme';
import { ProfileProvider } from './src/lib/ProfileContext';
import ToastHost from './src/components/ToastHost';

import FeedScreen from './src/screens/FeedScreen';
import BoardScreen from './src/screens/BoardScreen';
import ScanScreen from './src/screens/ScanScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ emoji }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

function PlusTabIcon({ focused }) {
  return (
    <View style={[styles.plusCircle, focused && styles.plusCircleActive]}>
      <Text style={styles.plusGlyph}>+</Text>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ProfileProvider>
        <View style={{ flex: 1 }}>
          <StatusBar style="dark" />
          <NavigationContainer>
            <Tab.Navigator
              screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.forest,
                tabBarInactiveTintColor: colors.inkDim,
                tabBarStyle: styles.tabBar,
                tabBarLabelStyle: styles.tabLabel,
              }}
            >
              <Tab.Screen
                name="Feed"
                component={FeedScreen}
                options={{ tabBarIcon: () => <TabIcon emoji="🏠" /> }}
              />
              <Tab.Screen
                name="Board"
                component={BoardScreen}
                options={{ tabBarIcon: () => <TabIcon emoji="🏆" /> }}
              />
              <Tab.Screen
                name="Scan"
                component={ScanScreen}
                options={{
                  tabBarLabel: 'Post',
                  tabBarIcon: ({ focused }) => <PlusTabIcon focused={focused} />,
                }}
              />
              <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ tabBarLabel: 'You', tabBarIcon: () => <TabIcon emoji="👤" /> }}
              />
            </Tab.Navigator>
          </NavigationContainer>
          <ToastHost />
        </View>
      </ProfileProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabLabel: { fontSize: 10.5, fontWeight: '700', textTransform: 'uppercase' },
  plusCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    shadowColor: '#20362A',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  plusCircleActive: { backgroundColor: colors.forestDeep },
  plusGlyph: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 24 },
});
