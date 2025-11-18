
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Dashboard from '../screens/Dashboard';
import Lotes from '../screens/Lotes';
import CreateLote from '../screens/CreateLote';
import LoteDetail from '../screens/LoteDetail';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const LotesNavigator = () => (
  <Stack.Navigator>
    <Stack.Screen name="LotesList" component={Lotes} />
    <Stack.Screen name="CreateLote" component={CreateLote} />
    <Stack.Screen name="LoteDetail" component={LoteDetail} />
  </Stack.Navigator>
);

const AppNavigator = () => (
  <Tab.Navigator>
    <Tab.Screen name="Dashboard" component={Dashboard} />
    <Tab.Screen name="Lotes" component={LotesNavigator} />
  </Tab.Navigator>
);

export default AppNavigator;
