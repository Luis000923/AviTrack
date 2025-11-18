import Constants from 'expo-constants';
import { Platform } from 'react-native';

// NOTA: Notificaciones temporalmente deshabilitadas en Expo Go debido a limitaciones de SDK 53
// Las notificaciones locales programadas requieren un development build en SDK 53+
// Para habilitarlas: ejecuta `npx expo prebuild` y usa un development build

let Notifications: any = null;

// Detectar si estamos en Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

// Solo importar y configurar notificaciones si NO estamos en Expo Go
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    
    // Configuración de cómo se muestran las notificaciones cuando la app está en primer plano
    if (Notifications && Notifications.setNotificationHandler) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    }
  } catch (error) {
    console.log('⚠️ Notificaciones no disponibles. Usa un development build para habilitarlas.');
  }
} else {
  console.log('⚠️ Notificaciones deshabilitadas en Expo Go. Usa un development build para habilitarlas.');
}

/**
 * Solicita permisos para mostrar notificaciones LOCALES
 */
export const solicitarPermisosNotificaciones = async (): Promise<boolean> => {
  if (!Notifications) {
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Permisos de notificaciones denegados');
      return false;
    }

    // En Android, configurar el canal de notificaciones
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('incubaciones', {
        name: 'Avisos de Incubación',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#34C759',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      await Notifications.setNotificationChannelAsync('pollos', {
        name: 'Registro de Pollos',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#FF9500',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    console.log('✅ Permisos de notificaciones locales concedidos');
    return true;
  } catch (error) {
    console.error('Error al solicitar permisos:', error);
    return false;
  }
};

/**
 * Programa una notificación local
 */
export const programarNotificacion = async (
  titulo: string,
  mensaje: string,
  fecha: Date,
  data?: any
): Promise<string> => {
  if (!Notifications) {
    return '';
  }

  try {
    const ahora = Date.now();
    const tiempoFecha = fecha.getTime();
    
    let trigger: any;
    if (tiempoFecha > ahora) {
      trigger = fecha;
    } else {
      trigger = { seconds: 1 };
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        body: mensaje,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: data || {},
        badge: 1,
        // Canal específico en Android
        ...(Platform.OS === 'android' && {
          channelId: data?.tipo === 'registro_nacimiento' ? 'pollos' : 'incubaciones',
        }),
      },
      trigger,
    });

    return notificationId;
  } catch (error) {
    console.error('Error al programar notificación:', error);
    throw error;
  }
};

/**
 * Cancela una notificación programada
 */
export const cancelarNotificacion = async (notificationId: string): Promise<void> => {
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error al cancelar notificación:', error);
  }
};

/**
 * Cancela todas las notificaciones programadas
 */
export const cancelarTodasLasNotificaciones = async (): Promise<void> => {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error al cancelar notificaciones:', error);
  }
};

/**
 * Muestra una notificación inmediata
 */
export const mostrarNotificacionInmediata = async (
  titulo: string,
  mensaje: string,
  data?: any
): Promise<string> => {
  if (!Notifications) {
    return '';
  }

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        body: mensaje,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: data || {},
        badge: 1,
        ...(Platform.OS === 'android' && {
          channelId: data?.tipo === 'registro_nacimiento' ? 'pollos' : 'incubaciones',
        }),
      },
      trigger: null, // Mostrar inmediatamente
    });

    return notificationId;
  } catch (error) {
    console.error('Error al mostrar notificación inmediata:', error);
    throw error;
  }
};

/**
 * Programa notificaciones para una incubación
 */
export const programarNotificacionesIncubacion = async (
  incubacionId: string,
  fechaInicio: string,
  fechaMojar: string,
  fechaNacimiento: string,
  cantidadHuevos: number,
  nombreGallina?: string
): Promise<void> => {
  try {
    // Notificación para mojar huevos (día 15)
    const fechaMojarDate = new Date(fechaMojar);
    await programarNotificacion(
      '💧 Mojar Huevos de Incubación',
      `Es hora de mojar los ${cantidadHuevos} huevos${nombreGallina ? ` de ${nombreGallina}` : ''}. Han pasado 15 días.`,
      fechaMojarDate,
      {
        tipo: 'mojar',
        incubacionId,
        accion: 'avisar_mojar'
      }
    );

    // Notificación para nacimiento (día 21)
    const fechaNacimientoDate = new Date(fechaNacimiento);
    await programarNotificacion(
      '🐣 ¡Pollos Naciendo!',
      `Los pollos deberían estar naciendo hoy${nombreGallina ? ` (${nombreGallina})` : ''}. ¡Prepárate!`,
      fechaNacimientoDate,
      {
        tipo: 'nacer',
        incubacionId,
        accion: 'avisar_nacimiento'
      }
    );

    // Notificación para registrar pollos (día 23 = nacimiento + 2 días)
    const fechaRegistro = new Date(fechaNacimientoDate);
    fechaRegistro.setDate(fechaRegistro.getDate() + 2);
    
    await programarNotificacion(
      '📝 Registrar Pollos Nacidos',
      `¡Es momento de contar cuántos pollos nacieron! Toca para crear el lote. Podrás definir el género después.`,
      fechaRegistro,
      {
        tipo: 'registro_nacimiento',
        incubacionId,
        accion: 'registrar_pollos'
      }
    );

    console.log('✅ Notificaciones programadas exitosamente');
  } catch (error) {
    console.error('Error al programar notificaciones de incubación:', error);
    throw error;
  }
};

/**
 * Cancela todas las notificaciones de una incubación específica
 */
export const cancelarNotificacionesIncubacion = async (incubacionId: string): Promise<void> => {
  if (!Notifications) return;
  try {
    const notificacionesProgramadas = await Notifications.getAllScheduledNotificationsAsync();
    
    for (const notif of notificacionesProgramadas) {
      if (notif.content.data?.incubacionId === incubacionId) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
  } catch (error) {
    console.error('Error al cancelar notificaciones de incubación:', error);
  }
};

/**
 * Obtiene el listener para cuando se toca una notificación
 */
export const escucharNotificaciones = (callback: (notification: any) => void) => {
  if (!Notifications) return { remove: () => {} };
  return Notifications.addNotificationReceivedListener(callback);
};

/**
 * Obtiene el listener para cuando el usuario toca una notificación
 */
export const escucharRespuestasNotificaciones = (
  callback: (response: any) => void
) => {
  if (!Notifications) return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener(callback);
};

/**
 * Limpia el badge de notificaciones
 */
export const limpiarBadge = async (): Promise<void> => {
  if (!Notifications) return;
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch (error) {
    console.error('Error al limpiar badge:', error);
  }
};

/**
 * Obtiene todas las notificaciones programadas
 */
export const obtenerNotificacionesProgramadas = async () => {
  if (!Notifications) return [];
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error al obtener notificaciones programadas:', error);
    return [];
  }
};
