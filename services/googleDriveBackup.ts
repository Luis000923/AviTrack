import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { exportarDatos } from './storage';

// Configuración
const BACKUP_KEY = '@backup_settings';
const LAST_BACKUP_KEY = '@last_backup';
const GOOGLE_TOKEN_KEY = '@google_access_token';

interface BackupSettings {
  autoBackupEnabled: boolean;
  backupOnChange: boolean;
  lastBackupDate?: string;
}

// Obtener configuración de backup
export const getBackupSettings = async (): Promise<BackupSettings> => {
  try {
    const settings = await AsyncStorage.getItem(BACKUP_KEY);
    return settings ? JSON.parse(settings) : {
      autoBackupEnabled: false,
      backupOnChange: false,
    };
  } catch (error) {
    console.error('Error al obtener configuración de backup:', error);
    return {
      autoBackupEnabled: false,
      backupOnChange: false,
    };
  }
};

// Guardar configuración de backup
export const saveBackupSettings = async (settings: BackupSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(BACKUP_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error al guardar configuración de backup:', error);
  }
};

// Crear archivo de respaldo
export const createBackupFile = async (): Promise<string | null> => {
  try {
    console.log('📦 [BACKUP] Creando archivo de respaldo...');
    
    // Exportar todos los datos
    const datos = await exportarDatos();
    console.log('📊 [BACKUP] Datos exportados:', JSON.stringify(datos).length, 'caracteres');
    
    // Crear nombre de archivo con fecha
    const fecha = new Date().toISOString().split('T')[0];
    const hora = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const fileName = `AviTrack_Backup_${fecha}_${hora}.json`;
    
    // Crear archivo usando la nueva API de expo-file-system
    const file = new File(Paths.cache, fileName);
    const contenido = JSON.stringify(datos, null, 2);
    
    console.log('💾 [BACKUP] Escribiendo archivo:', fileName);
    console.log('📍 [BACKUP] Ruta:', file.uri);
    
    await file.write(contenido);
    
    console.log('✅ [BACKUP] Archivo creado exitosamente');
    
    // Actualizar fecha del último backup
    await AsyncStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
    
    return file.uri;
  } catch (error) {
    console.error('❌ [BACKUP] Error al crear archivo:', error);
    console.error('❌ [BACKUP] Detalles del error:', error);
    return null;
  }
};

// Compartir archivo de respaldo (permite al usuario elegir Google Drive)
export const shareBackupFile = async (): Promise<boolean> => {
  try {
    console.log('🚀 [BACKUP] Iniciando proceso de compartir...');
    
    const filePath = await createBackupFile();
    
    if (!filePath) {
      console.error('❌ [BACKUP] No se pudo crear el archivo');
      return false;
    }
    
    // Verificar si el dispositivo puede compartir
    const isAvailable = await Sharing.isAvailableAsync();
    
    if (!isAvailable) {
      console.error('❌ [BACKUP] Compartir no disponible en este dispositivo');
      return false;
    }
    
    console.log('📤 [BACKUP] Abriendo diálogo de compartir...');
    
    // Compartir archivo (el usuario puede elegir Google Drive)
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/json',
      dialogTitle: 'Guardar respaldo en Google Drive',
      UTI: 'public.json',
    });
    
    console.log('✅ [BACKUP] Archivo compartido exitosamente');
    return true;
  } catch (error) {
    console.error('❌ [BACKUP] Error al compartir archivo:', error);
    console.error('❌ [BACKUP] Detalles del error:', error);
    return false;
  }
};

// Realizar respaldo automático si está habilitado
export const autoBackupIfEnabled = async (): Promise<void> => {
  try {
    const settings = await getBackupSettings();
    
    if (!settings.autoBackupEnabled || !settings.backupOnChange) {
      console.log('ℹ️ [BACKUP] Respaldo automático deshabilitado');
      return;
    }
    
    console.log('🔄 [BACKUP] Iniciando respaldo automático...');
    
    // Crear el archivo pero no compartirlo automáticamente
    // (compartir requiere interacción del usuario)
    const filePath = await createBackupFile();
    
    if (filePath) {
      console.log('✅ [BACKUP] Respaldo automático completado');
      console.log('💡 [BACKUP] Archivo guardado localmente. Usa "Exportar a Drive" para subirlo.');
    } else {
      console.error('❌ [BACKUP] No se pudo completar el respaldo automático');
    }
  } catch (error) {
    console.error('❌ [BACKUP] Error en respaldo automático:', error);
  }
};

// Obtener fecha del último backup
export const getLastBackupDate = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(LAST_BACKUP_KEY);
  } catch (error) {
    console.error('Error al obtener fecha del último backup:', error);
    return null;
  }
};

// Limpiar archivos antiguos de backup (mantener solo los últimos 5)
export const cleanOldBackups = async (): Promise<number> => {
  try {
    console.log('🧹 [BACKUP] Limpiando archivos antiguos...');
    
    const cacheDir = Paths.cache;
    const files = cacheDir.list();
    
    // Filtrar solo archivos de backup y ordenar por nombre (que incluye fecha)
    const backupFiles = files
      .filter(item => item instanceof File && item.name.startsWith('AviTrack_Backup_'))
      .sort((a, b) => b.name.localeCompare(a.name)); // Más recientes primero
    
    console.log('📋 [BACKUP] Backups encontrados:', backupFiles.length);
    
    // Mantener solo los últimos 5 backups
    if (backupFiles.length > 5) {
      const filesToDelete = backupFiles.slice(5);
      let deletedCount = 0;
      
      for (const file of filesToDelete) {
        try {
          if (file instanceof File) {
            await file.delete();
            console.log('🗑️ [BACKUP] Archivo antiguo eliminado:', file.name);
            deletedCount++;
          }
        } catch (deleteError) {
          console.error('❌ [BACKUP] Error al eliminar archivo:', file.name, deleteError);
        }
      }
      
      console.log('✅ [BACKUP] Limpieza completada:', deletedCount, 'archivos eliminados');
      return deletedCount;
    }
    
    console.log('ℹ️ [BACKUP] No hay archivos antiguos para eliminar');
    return 0;
  } catch (error) {
    console.error('❌ [BACKUP] Error al limpiar backups antiguos:', error);
    return 0;
  }
};

// Interfaz para información de backup
export interface BackupFileInfo {
  name: string;
  uri: string;
  size: number;
  date: Date;
}

// Listar todos los archivos de backup disponibles
export const listBackupFiles = async (): Promise<BackupFileInfo[]> => {
  try {
    console.log('📋 [BACKUP] Listando archivos de backup...');
    
    const cacheDir = Paths.cache;
    const files = cacheDir.list();
    
    // Filtrar solo archivos de backup
    const backupFiles = files
      .filter(item => item instanceof File && item.name.startsWith('AviTrack_Backup_'))
      .sort((a, b) => b.name.localeCompare(a.name)); // Más recientes primero
    
    const backupInfos: BackupFileInfo[] = [];
    
    for (const file of backupFiles) {
      if (file instanceof File) {
        try {
          // Leer el archivo para obtener su tamaño
          const content = await file.text();
          const size = new Blob([content]).size;
          
          // Extraer fecha del nombre del archivo: AviTrack_Backup_2025-11-18_14-30-00.json
          const match = file.name.match(/AviTrack_Backup_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})/);
          let date = new Date();
          
          if (match) {
            const [_, dateStr, timeStr] = match;
            const time = timeStr.replace(/-/g, ':');
            date = new Date(`${dateStr}T${time}`);
          }
          
          backupInfos.push({
            name: file.name,
            uri: file.uri,
            size: size,
            date: date
          });
        } catch (error) {
          console.error('❌ [BACKUP] Error al obtener info del archivo:', file.name, error);
        }
      }
    }
    
    console.log('✅ [BACKUP] Encontrados', backupInfos.length, 'backups');
    return backupInfos;
  } catch (error) {
    console.error('❌ [BACKUP] Error al listar backups:', error);
    return [];
  }
};

// Compartir un archivo de backup específico
export const shareSpecificBackup = async (uri: string): Promise<boolean> => {
  try {
    console.log('📤 [BACKUP] Compartiendo backup:', uri);
    
    const isAvailable = await Sharing.isAvailableAsync();
    
    if (!isAvailable) {
      console.error('❌ [BACKUP] Compartir no disponible');
      return false;
    }
    
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: 'Compartir copia de seguridad',
      UTI: 'public.json',
    });
    
    console.log('✅ [BACKUP] Backup compartido exitosamente');
    return true;
  } catch (error) {
    console.error('❌ [BACKUP] Error al compartir backup:', error);
    return false;
  }
};

// Eliminar un archivo de backup específico
export const deleteSpecificBackup = async (uri: string): Promise<boolean> => {
  try {
    console.log('🗑️ [BACKUP] Eliminando backup:', uri);
    
    const file = new File(uri);
    await file.delete();
    
    console.log('✅ [BACKUP] Backup eliminado exitosamente');
    return true;
  } catch (error) {
    console.error('❌ [BACKUP] Error al eliminar backup:', error);
    return false;
  }
};

// Leer datos desde un archivo de backup
export const readBackupFile = async (uri: string): Promise<any | null> => {
  try {
    console.log('📖 [BACKUP] Leyendo archivo de backup:', uri);
    
    const file = new File(uri);
    const content = await file.text();
    const data = JSON.parse(content);
    
    console.log('✅ [BACKUP] Backup leído exitosamente');
    console.log('📊 [BACKUP] Datos:', {
      lotes: data.lotes?.length || 0,
      sanidad: data.sanidad?.length || 0,
      incubaciones: data.incubaciones?.length || 0,
      notificaciones: data.notificaciones?.length || 0,
    });
    
    return data;
  } catch (error) {
    console.error('❌ [BACKUP] Error al leer backup:', error);
    return null;
  }
};

// Obtener el backup más reciente disponible
export const getMostRecentBackup = async (): Promise<any | null> => {
  try {
    console.log('🔍 [BACKUP] Buscando backup más reciente...');
    
    const backups = await listBackupFiles();
    
    if (backups.length === 0) {
      console.log('ℹ️ [BACKUP] No hay backups disponibles');
      return null;
    }
    
    // Los backups ya están ordenados por fecha (más recientes primero)
    const mostRecent = backups[0];
    console.log('✅ [BACKUP] Backup más reciente encontrado:', mostRecent.name);
    
    return await readBackupFile(mostRecent.uri);
  } catch (error) {
    console.error('❌ [BACKUP] Error al obtener backup más reciente:', error);
    return null;
  }
};

// Seleccionar y cargar un archivo JSON desde el dispositivo
export const importBackupFromFile = async (): Promise<any | null> => {
  try {
    console.log('📥 [BACKUP] Importando backup desde archivo...');
    
    const DocumentPicker = require('expo-document-picker');
    
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });
    
    if (result.canceled || !result.assets || result.assets.length === 0) {
      console.log('ℹ️ [BACKUP] Importación cancelada por el usuario');
      return null;
    }
    
    const fileUri = result.assets[0].uri;
    console.log('📁 [BACKUP] Archivo seleccionado:', fileUri);
    
    return await readBackupFile(fileUri);
  } catch (error) {
    console.error('❌ [BACKUP] Error al importar backup:', error);
    return null;
  }
};
