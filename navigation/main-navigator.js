
import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthContext } from '../contexts/auth-context';
import AuthNavigator from './auth-navigator';
import AppNavigator from './app-navigator';

const MainNavigator = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return null; // Or a loading spinner
  }

  return (
    <NavigationContainer>
      {user ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default MainNavigator;
