import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import ChatListScreen from '../screens/ChatListScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CallsScreen from '../screens/CallsScreen';
import Colors from '../constants/Colors';

const Tab = createBottomTabNavigator();

// Placeholder screens for polish
const Placeholder = ({ name }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
    <Ionicons name="construct-outline" size={50} color={Colors.secondary} />
    <Text style={{ marginTop: 10, fontSize: 18, color: '#666' }}>{name} coming soon!</Text>
  </View>
);

const TabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="Chats"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Chats') iconName = focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
          else if (route.name === 'Updates') iconName = focused ? 'sparkles' : 'sparkles-outline';
          else if (route.name === 'Calls') iconName = focused ? 'call' : 'call-outline';
          else if (route.name === 'Settings') iconName = focused ? 'person-circle' : 'person-circle-outline';

          return <Ionicons name={iconName} size={28} color={color} />;
        },
        tabBarActiveTintColor: Colors.secondary,
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
          paddingTop: 5,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 8,
        },
        headerStyle: {
          backgroundColor: Colors.primary,
          elevation: 2,
          shadowOpacity: 0.1,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 22,
        },
      })}
    >
      <Tab.Screen
        name="Chats"
        component={ChatListScreen}
        options={{ title: 'WhatsApp' }}
      />
      <Tab.Screen name="Updates">
        {() => <Placeholder name="Status Updates" />}
      </Tab.Screen>
      <Tab.Screen name="Calls" component={CallsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  // Style used in children
});

export default TabNavigator;
