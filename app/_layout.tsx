/**
 * @file app/_layout.tsx
 * @description Este es el layout principal de la aplicación.
 * Configura el proveedor de temas (claro/oscuro) y el navegador principal de tipo Stack.
 * La pantalla principal es un grupo de pestañas definido en `(tabs)`.
 * También define una pantalla modal.
 * Se conecta con:
 *  - `(tabs)/_layout.tsx`: para la navegación por pestañas.
 *  - `modal.tsx`: para la pantalla modal.
 *  - `hooks/use-color-scheme.ts`: para obtener el esquema de color actual.
 */

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
