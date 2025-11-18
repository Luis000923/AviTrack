import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    BackupFileInfo,
    deleteSpecificBackup,
    listBackupFiles,
    shareSpecificBackup
} from '../services/googleDriveBackup';
// Colores y fuentes
const COLORS = {
  primary: '#007AFF',
  danger: '#FF3B30',
  background: '#f5f5f5',
  text: '#333',
  textSecondary: '#666',
};

const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
};

export default function VerBackupsScreen() {
  const router = useRouter();
  const [backups, setBackups] = useState<BackupFileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargarBackups = async () => {
    try {
      setLoading(true);
      const lista = await listBackupFiles();
      setBackups(lista);
    } catch (error) {
      console.error('Error al cargar backups:', error);
      Alert.alert('Error', 'No se pudieron cargar las copias de seguridad');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarBackups();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarBackups();
    setRefreshing(false);
  };

  const handleCompartir = async (backup: BackupFileInfo) => {
    try {
      const success = await shareSpecificBackup(backup.uri);
      if (success) {
        Alert.alert('Éxito', 'Copia de seguridad compartida correctamente');
      } else {
        Alert.alert('Error', 'No se pudo compartir la copia de seguridad');
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error al compartir');
    }
  };

  const handleEliminar = (backup: BackupFileInfo) => {
    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de que deseas eliminar esta copia de seguridad?\n\n${backup.name}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await deleteSpecificBackup(backup.uri);
              if (success) {
                Alert.alert('Éxito', 'Copia de seguridad eliminada');
                cargarBackups(); // Recargar la lista
              } else {
                Alert.alert('Error', 'No se pudo eliminar la copia de seguridad');
              }
            } catch (error) {
              Alert.alert('Error', 'Ocurrió un error al eliminar');
            }
          },
        },
      ]
    );
  };

  const formatearFecha = (date: Date): string => {
    const opciones: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return date.toLocaleDateString('es-ES', opciones);
  };

  const formatearTamano = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando copias de seguridad...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Copias de Seguridad</Text>
        <Text style={styles.subtitle}>
          {backups.length} {backups.length === 1 ? 'copia disponible' : 'copias disponibles'}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {backups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No hay copias de seguridad</Text>
            <Text style={styles.emptyText}>
              Las copias de seguridad aparecerán aquí cuando se creen automáticamente o manualmente.
            </Text>
          </View>
        ) : (
          backups.map((backup, index) => (
            <View key={backup.uri} style={styles.backupCard}>
              <View style={styles.backupHeader}>
                <Text style={styles.backupIcon}>💾</Text>
                <View style={styles.backupInfo}>
                  <Text style={styles.backupDate}>{formatearFecha(backup.date)}</Text>
                  <Text style={styles.backupSize}>{formatearTamano(backup.size)}</Text>
                </View>
              </View>

              <View style={styles.backupActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.shareButton]}
                  onPress={() => handleCompartir(backup)}
                >
                  <Text style={styles.actionButtonText}>📤 Compartir</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleEliminar(backup)}
                >
                  <Text style={styles.actionButtonText}>🗑️ Eliminar</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.backupName} numberOfLines={1}>
                {backup.name}
              </Text>
            </View>
          ))
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoTitle}>Información importante</Text>
          <Text style={styles.infoText}>
            • Las copias de seguridad se almacenan localmente en el dispositivo
          </Text>
          <Text style={styles.infoText}>
            • Usa "Compartir" para subir a Google Drive u otra ubicación
          </Text>
          <Text style={styles.infoText}>
            • Se mantienen automáticamente hasta 5 copias más recientes
          </Text>
          <Text style={styles.infoText}>
            • Desliza hacia abajo para actualizar la lista
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FONTS.medium,
  },
  title: {
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.8)',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  backupCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backupIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  backupInfo: {
    flex: 1,
  },
  backupDate: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    marginBottom: 4,
  },
  backupSize: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  backupActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  shareButton: {
    backgroundColor: COLORS.primary,
  },
  deleteButton: {
    backgroundColor: COLORS.danger,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  backupName: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 20,
  },
  infoIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 4,
  },
});
