import {
    cleanOldBackups,
    getBackupSettings,
    getLastBackupDate,
    importBackupFromFile,
    saveBackupSettings,
    shareBackupFile,
} from '@/services/googleDriveBackup';
import { importarDatosDesdeBackup } from '@/services/storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ConfiguracionBackupScreen() {
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [backupOnChange, setBackupOnChange] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    const settings = await getBackupSettings();
    setAutoBackupEnabled(settings.autoBackupEnabled);
    setBackupOnChange(settings.backupOnChange);

    const lastDate = await getLastBackupDate();
    setLastBackupDate(lastDate);
  };

  const toggleAutoBackup = async (value: boolean) => {
    setAutoBackupEnabled(value);
    await saveBackupSettings({
      autoBackupEnabled: value,
      backupOnChange,
    });
  };

  const toggleBackupOnChange = async (value: boolean) => {
    setBackupOnChange(value);
    await saveBackupSettings({
      autoBackupEnabled,
      backupOnChange: value,
    });
  };

  const handleExportarAhora = async () => {
    setLoading(true);
    try {
      const success = await shareBackupFile();
      if (success) {
        Alert.alert(
          'Éxito',
          'Selecciona Google Drive para guardar el archivo.\n\nEl archivo se llama "AviTrack_Backup_[fecha].json"'
        );
        await cargarConfiguracion(); // Actualizar fecha
      } else {
        Alert.alert('Error', 'No se pudo crear el archivo de respaldo');
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error al exportar: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLimpiarBackups = async () => {
    Alert.alert(
      'Limpiar archivos antiguos',
      '¿Eliminar archivos de respaldo antiguos? (Se mantendrán los últimos 5)',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          onPress: async () => {
            await cleanOldBackups();
            Alert.alert('Éxito', 'Archivos antiguos eliminados');
          },
        },
      ]
    );
  };

  const handleImportarBackup = async () => {
    Alert.alert(
      'Importar Respaldo',
      '⚠️ ADVERTENCIA: Esta acción agregará los datos del backup a la base de datos actual. Los datos existentes NO se eliminarán.\n\n¿Deseas continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Importar',
          onPress: async () => {
            setLoading(true);
            try {
              console.log('📥 Iniciando importación de backup...');
              const datos = await importBackupFromFile();
              
              if (!datos) {
                Alert.alert('Cancelado', 'No se seleccionó ningún archivo');
                return;
              }

              console.log('📊 Datos cargados, importando a Firebase...');
              const success = await importarDatosDesdeBackup(datos);
              
              if (success) {
                Alert.alert(
                  'Éxito',
                  `Datos importados correctamente:\n\n` +
                  `• ${datos.lotes?.length || 0} lotes\n` +
                  `• ${datos.sanidad?.length || 0} registros de sanidad\n` +
                  `• ${datos.incubaciones?.length || 0} incubaciones\n` +
                  `• ${datos.notificaciones?.length || 0} notificaciones`
                );
              } else {
                Alert.alert('Error', 'No se pudieron importar los datos');
              }
            } catch (error) {
              console.error('Error en importación:', error);
              Alert.alert('Error', 'Ocurrió un error al importar: ' + (error as Error).message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Respaldo en Drive</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Estado del Respaldo</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Último respaldo:</Text>
            <Text style={styles.infoValue}>{formatDate(lastBackupDate)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Configuración</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Respaldo automático</Text>
              <Text style={styles.settingDescription}>
                Crear archivo de respaldo automáticamente
              </Text>
            </View>
            <Switch value={autoBackupEnabled} onValueChange={toggleAutoBackup} />
          </View>

          {autoBackupEnabled && (
            <View style={styles.settingRow}>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Respaldar al modificar</Text>
                <Text style={styles.settingDescription}>
                  Crear respaldo cada vez que guardes o modifiques datos
                </Text>
              </View>
              <Switch value={backupOnChange} onValueChange={toggleBackupOnChange} />
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💾 Acciones</Text>

          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleExportarAhora}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.actionButtonText}>📤 Exportar a Google Drive</Text>
                <Text style={styles.actionButtonSubtext}>
                  Crear y subir respaldo ahora
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => router.push('/ver-backups')}
          >
            <Text style={styles.actionButtonText}>📦 Ver Copias de Seguridad</Text>
            <Text style={styles.actionButtonSubtext}>
              Ver, compartir o eliminar backups
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.importButton]}
            onPress={handleImportarBackup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.actionButtonText}>📥 Importar desde Archivo</Text>
                <Text style={styles.actionButtonSubtext}>
                  Recuperar datos desde un backup JSON
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={handleLimpiarBackups}
          >
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
              🗑️ Limpiar archivos antiguos
            </Text>
            <Text style={[styles.actionButtonSubtext, styles.secondaryButtonSubtext]}>
              Eliminar backups viejos del dispositivo
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.infoText}>
            💡 <Text style={styles.boldText}>Cómo funciona:</Text>
          </Text>
          <Text style={styles.infoText}>
            • Si activas "Respaldar al modificar", se creará un archivo JSON cada vez que
            guardes datos.
          </Text>
          <Text style={styles.infoText}>
            • Los archivos se guardan localmente en tu dispositivo.
          </Text>
          <Text style={styles.infoText}>
            • Usa "Exportar a Google Drive" para subirlos manualmente a la nube.
          </Text>
          <Text style={styles.infoText}>
            • "Importar desde Archivo" permite recuperar datos desde un backup JSON guardado en Drive u otra ubicación.
          </Text>
          <Text style={styles.infoText}>
            • Si no hay datos en Firebase, la app intentará recuperar automáticamente desde el backup más reciente.
          </Text>
          <Text style={styles.infoText}>
            • Se mantienen los últimos 5 respaldos automáticamente.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 50,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  settingText: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#666',
  },
  actionButton: {
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  importButton: {
    backgroundColor: '#34C759',
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionButtonSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  secondaryButtonText: {
    color: '#333',
  },
  secondaryButtonSubtext: {
    color: '#666',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 8,
  },
  boldText: {
    fontWeight: '600',
    color: '#333',
  },
});
