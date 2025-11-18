/**
 * @file app/(tabs)/explore.tsx
 * @description Esta es la pantalla principal del "dashboard" de la aplicación.
 * Muestra un resumen de la cantidad total de pollos, machos y hembras.
 * Proporciona un menú de navegación para acceder a las diferentes funcionalidades de la aplicación.
 * Se conecta con:
 *  - `services/storage.ts`: para obtener los datos de los lotes.
 *  - `expo-router`: para la navegación entre pantallas.
 *  - Varias pantallas de la aplicación a través del menú, como `lotes`, `registrar-evento`, etc.
 */

import { obtenerLotes } from '@/services/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TabTwoScreen() {
  const [totalPollos, setTotalPollos] = useState(0);
  const [totalMachos, setTotalMachos] = useState(0);
  const [totalHembras, setTotalHembras] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      cargarTotalPollos();
    }, [])
  );

  const cargarTotalPollos = async () => {
    try {
      const lotes = await obtenerLotes();
      const total = lotes.reduce((sum, lote) => sum + (lote.cantidadActual || 0), 0);
      const machos = lotes.reduce((sum, lote) => sum + (lote.cantidadMachos || 0), 0);
      const hembras = lotes.reduce((sum, lote) => sum + (lote.cantidadHembras || 0), 0);
      setTotalPollos(total);
      setTotalMachos(machos);
      setTotalHembras(hembras);
    } catch (error) {
      console.error('Error al cargar total de pollos:', error);
    }
  };

  const menuOptions = [
    { id: 1, title: 'Gestión de Lotes', icon: '🐣', ruta: '/lotes' },
    { id: 5, title: 'Muertes Naturales', icon: '💀', ruta: '/registrar-evento', params: { tipo: 'muerte' } },
    { id: 6, title: 'Sacrificio', icon: '⚠️', ruta: '/registrar-evento', params: { tipo: 'sacrificio' } },
    { id: 7, title: 'Enfermedades', icon: '🏥', ruta: '/enfermedades' },
    { id: 9, title: 'Avisos de Incubación', icon: '🔔', ruta: '/avisos-incubacion' },
    { id: 10, title: 'Respaldo en Drive', icon: '💾', ruta: '/configuracion-backup' },
    { id: 11, title: 'Ver Copias de Seguridad', icon: '📦', ruta: '/ver-backups' },
  ];

  const handleMenuPress = (option: any) => {
    if (option.ruta) {
      // Navegar a la ruta especificada
      if (option.params) {
        router.push({
          pathname: option.ruta,
          params: option.params,
        });
      } else {
        router.push(option.ruta);
      }
    } else {
      Alert.alert(option.title, 'Función en desarrollo');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>AviTrack</Text>
        <Text style={styles.headerSubtitle}>Sistema de Gestión de Aves</Text>
        <View style={styles.statsRow}>
          <View style={styles.sideStats}>
            <View style={styles.statBadge}>
              <Text style={styles.sideStatsIcon}>♂️</Text>
            </View>
            <Text style={styles.sideStatsNumber}>{totalMachos}</Text>
            <Text style={styles.sideStatsLabel}>Machos</Text>
          </View>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total de Pollos</Text>
            <Text style={styles.totalNumber}>{totalPollos}</Text>
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeText}>🐔</Text>
            </View>
          </View>
          <View style={styles.sideStats}>
            <View style={styles.statBadge}>
              <Text style={styles.sideStatsIcon}>♀️</Text>
            </View>
            <Text style={styles.sideStatsNumber}>{totalHembras}</Text>
            <Text style={styles.sideStatsLabel}>Hembras</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.menuContainer}>
        <Text style={styles.sectionTitle}>Menú Principal</Text>
        {menuOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.menuCard}
            onPress={() => handleMenuPress(option)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#ffffff', '#f8f9fa']}
              style={styles.menuCardGradient}
            >
              <View style={styles.menuIconContainer}>
                <Text style={styles.menuIcon}>{option.icon}</Text>
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>{option.title}</Text>
                <Text style={styles.menuArrow}>→</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={() => {
          Alert.alert(
            'Cerrar Sesión',
            '¿Deseas salir de la aplicación?',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Salir', onPress: () => router.push('/') }
            ]
          );
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#ff6b6b', '#ee5a6f']}
          style={styles.logoutGradient}
        >
          <Text style={styles.logoutText}>🚪 Cerrar Sesión</Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 30,
    paddingTop: 60,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '500',
    marginBottom: 25,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  sideStats: {
    alignItems: 'center',
    flex: 1,
  },
  statBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  sideStatsIcon: {
    fontSize: 28,
  },
  sideStatsNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  sideStatsLabel: {
    fontSize: 13,
    color: 'white',
    opacity: 0.95,
    marginTop: 4,
    fontWeight: '500',
  },
  totalContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 25,
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
    flex: 1.2,
    marginHorizontal: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  totalLabel: {
    fontSize: 13,
    color: 'white',
    opacity: 0.95,
    marginBottom: 5,
    fontWeight: '600',
  },
  totalNumber: {
    fontSize: 52,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  totalBadge: {
    marginTop: 5,
  },
  totalBadgeText: {
    fontSize: 24,
  },
  menuContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginLeft: 5,
  },
  menuCard: {
    borderRadius: 18,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  menuCardGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuIcon: {
    fontSize: 32,
  },
  menuTextContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2c3e50',
  },
  menuArrow: {
    fontSize: 24,
    color: '#667eea',
    fontWeight: 'bold',
  },
  logoutButton: {
    margin: 20,
    marginBottom: 35,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#ff6b6b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  logoutGradient: {
    padding: 18,
    alignItems: 'center',
  },
  logoutText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
  },
});
