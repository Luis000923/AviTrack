/**
 * @file app/avisos-incubacion.tsx
 * @description Pantalla para gestionar las incubaciones de huevos.
 * Permite ver incubaciones activas y completadas, registrar nuevas incubaciones,
 * y registrar el nacimiento de pollos.
 * También gestiona y muestra notificaciones locales relacionadas con las fases de incubación.
 * 
 * Se conecta con:
 *  - `services/storage.ts`: para toda la lógica de almacenamiento (obtener, crear, actualizar incubaciones y notificaciones).
 *  - `services/notificationService.ts`: para la gestión de permisos y programación de notificaciones push locales.
 *  - `expo-router`: para la navegación.
 *  - `@react-native-async-storage/async-storage`: para almacenar notificaciones de prueba.
 *  - `@react-native-community/datetimepicker`: para seleccionar fechas.
 *  - `expo-notifications`: para interactuar con el sistema de notificaciones.
 */

import {
  escucharRespuestasNotificaciones,
  limpiarBadge,
  programarNotificacionesIncubacion,
  solicitarPermisosNotificaciones
} from '@/services/notificationService';
import {
  actualizarIncubacion,
  eliminarIncubacion,
  Incubacion,
  marcarNotificacionLeida,
  Notificacion,
  obtenerIncubaciones,
  obtenerNotificaciones,
  registrarIncubacion,
  registrarPollosNacidos
} from '@/services/storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useFocusEffect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function AvisosIncubacionScreen() {
  const [incubaciones, setIncubaciones] = useState<Incubacion[]>([]);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [vistaSeleccionada, setVistaSeleccionada] = useState<'activas' | 'enProceso' | 'completadas'>('activas');
  
  // Estados para modal de nueva incubación
  const [modalVisible, setModalVisible] = useState(false);
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [cantidadHuevos, setCantidadHuevos] = useState('');
  const [idGalloMadre, setIdGalloMadre] = useState('');
  const [notas, setNotas] = useState('');
  
  // Estados para modal de registro de pollos nacidos
  const [modalRegistroVisible, setModalRegistroVisible] = useState(false);
  const [incubacionSeleccionada, setIncubacionSeleccionada] = useState<Incubacion | null>(null);
  const [pollosNacidos, setPollosNacidos] = useState('');
  const [machos, setMachos] = useState('');
  const [hembras, setHembras] = useState('');

  // Solicitar permisos y configurar listeners de notificaciones
  useEffect(() => {
    const inicializarNotificaciones = async () => {
      const permisosConcedidos = await solicitarPermisosNotificaciones();
      
      if (permisosConcedidos) {
        console.log('✅ Permisos de notificaciones concedidos');
      } else {
        Alert.alert(
          'Permisos Necesarios',
          'Para recibir avisos de incubación, debes permitir las notificaciones en la configuración de tu dispositivo.'
        );
      }
    };

    inicializarNotificaciones();

    // Escuchar cuando el usuario toca una notificación
    const subscription = escucharRespuestasNotificaciones((response) => {
      const data = response.notification.request.content.data;
      
      console.log('Notificación tocada:', data);
      
      // Si es una notificación de registro de pollos, abrir el modal
      if (data.tipo === 'registro_nacimiento' && data.incubacionId) {
        const incubacion = incubaciones.find(inc => inc.id === data.incubacionId);
        if (incubacion) {
          abrirModalRegistro(incubacion);
        }
      }
    });

    // Limpiar badge cuando se abre la pantalla
    limpiarBadge();

    return () => {
      subscription.remove();
    };
  }, [incubaciones]);

  useFocusEffect(
    React.useCallback(() => {
      cargarDatos();
    }, [])
  );

  const cargarDatos = async () => {
    try {
      const incubacionesData = await obtenerIncubaciones();
      const notificacionesData = await obtenerNotificaciones();
      
      // Marcar automáticamente como completadas las incubaciones que lleguen al día 21
      for (const incubacion of incubacionesData) {
        const dia = getDiaIncubacion(incubacion.fechaInicio);
        if (incubacion.estado !== 'completada' && dia >= 21) {
          await actualizarIncubacion(incubacion.id, { estado: 'completada' });
        }
      }
      
      // Recargar incubaciones después de actualizar estados
      const incubacionesActualizadas = await obtenerIncubaciones();
      
      // Ordenar incubaciones por fecha de inicio (más recientes primero)
      const incubacionesOrdenadas = incubacionesActualizadas.sort((a, b) => 
        new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
      );
      
      setIncubaciones(incubacionesOrdenadas);
      setNotificaciones(notificacionesData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDatos();
    setRefreshing(false);
  };

  const calcularDiasRestantes = (fechaObjetivo: string): number => {
    const hoy = new Date();
    const objetivo = new Date(fechaObjetivo);
    const diferencia = objetivo.getTime() - hoy.getTime();
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
  };

  const getDiaIncubacion = (fechaInicio: string): number => {
    const inicio = new Date(fechaInicio);
    const hoy = new Date();
    const diferencia = hoy.getTime() - inicio.getTime();
    return Math.floor(diferencia / (1000 * 60 * 60 * 24)) + 1;
  };

  const marcarComoCompletada = async (incubacion: Incubacion) => {
    Alert.alert(
      'Completar Incubación',
      '¿Esta incubación ha finalizado?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Completar',
          onPress: async () => {
            try {
              await actualizarIncubacion(incubacion.id, { estado: 'completada' });
              await cargarDatos();
              Alert.alert('Éxito', 'Incubación marcada como completada');
            } catch (error) {
              Alert.alert('Error', 'No se pudo actualizar la incubación');
            }
          }
        }
      ]
    );
  };

  const eliminarIncubacionHandler = async (incubacion: Incubacion) => {
    Alert.alert(
      '🗑️ Eliminar Incubación',
      `¿Estás seguro de que deseas eliminar la incubación de "${incubacion.idGalloMadre || 'Sin nombre'}"?\n\nEsta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarIncubacion(incubacion.id);
              await cargarDatos();
              Alert.alert('✅ Eliminada', 'La incubación ha sido eliminada correctamente');
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la incubación');
              console.error(error);
            }
          }
        }
      ]
    );
  };

  const marcarNotificacion = async (notificacion: Notificacion) => {
    try {
      await marcarNotificacionLeida(notificacion.id);
      await cargarDatos();
    } catch (error) {
      console.error('Error al marcar notificación:', error);
    }
  };

  const abrirModalNueva = () => {
    setFechaInicio(new Date());
    setCantidadHuevos('');
    setIdGalloMadre('');
    setNotas('');
    setModalVisible(true);
  };

  const handleGuardarIncubacion = async () => {
    if (!cantidadHuevos || parseInt(cantidadHuevos) <= 0) {
      Alert.alert('Error', 'Ingresa una cantidad válida de huevos');
      return;
    }

    try {
      const incubacion = {
        fechaInicio: fechaInicio.toISOString().split('T')[0],
        cantidadHuevos: parseInt(cantidadHuevos),
        idGalloMadre,
        notas,
      };

      const resultado = await registrarIncubacion(incubacion);
      
      // 🔔 Programar notificaciones locales programadas
      await programarNotificacionesIncubacion(
        resultado.id,
        resultado.fechaInicio,
        resultado.fechaMojarHuevos,
        resultado.fechaEstimadaNacimiento,
        resultado.cantidadHuevos,
        resultado.idGalloMadre
      );
      
      const fechaMojar = new Date(resultado.fechaMojarHuevos).toLocaleDateString();
      const fechaNacer = new Date(resultado.fechaEstimadaNacimiento).toLocaleDateString();

      setModalVisible(false);
      await cargarDatos();
      
      Alert.alert(
        '✅ Incubación Registrada', 
        `Fechas importantes:\n\n` +
        `📅 Inicio: ${fechaInicio.toLocaleDateString()}\n` +
        `💧 Mojar huevos (día 15): ${fechaMojar}\n` +
        `🐣 Nacimiento estimado (día 21): ${fechaNacer}\n\n` +
        `🔔 Recibirás notificaciones automáticas en tu dispositivo en cada fecha importante.`
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar la incubación');
      console.error(error);
    }
  };

  const onChangeFecha = (event: any, selectedDate?: Date) => {
    setMostrarCalendario(Platform.OS === 'ios');
    if (selectedDate) {
      setFechaInicio(selectedDate);
    }
  };

  const abrirModalRegistro = (incubacion: Incubacion) => {
    setIncubacionSeleccionada(incubacion);
    setPollosNacidos('');
    setMachos('0');
    setHembras('0');
    setModalRegistroVisible(true);
  };

  const handleRegistrarNacimiento = async () => {
    if (!incubacionSeleccionada) return;

    const total = parseInt(pollosNacidos) || 0;

    if (total <= 0) {
      Alert.alert('Error', 'Ingresa una cantidad válida de pollos nacidos');
      return;
    }

    try {
      // Crear lote sin género definido (0 machos y 0 hembras por defecto)
      const loteCreado = await registrarPollosNacidos(
        incubacionSeleccionada.id,
        total,
        0,
        0
      );

      setModalRegistroVisible(false);
      await cargarDatos();
      
      Alert.alert(
        '✅ Lote Creado Exitosamente', 
        `Se ha creado el lote "${loteCreado.nombreLote}" con:\n\n` +
        `🐣 Total: ${total} pollos recién nacidos\n\n` +
        `💡 Podrás actualizar el género y reducir la cantidad desde la gestión de lotes cuando lo determines.`
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar el nacimiento de los pollos');
      console.error(error);
    }
  };

  const getEstadoIncubacion = (incubacion: Incubacion) => {
    const dia = getDiaIncubacion(incubacion.fechaInicio);
    const diasMojar = calcularDiasRestantes(incubacion.fechaMojarHuevos);
    const diasNacer = calcularDiasRestantes(incubacion.fechaEstimadaNacimiento);

    if (dia < 15) {
      return {
        fase: 'Fase Inicial',
        color: '#007AFF',
        icono: '🥚',
        mensaje: `Día ${dia} de incubación`
      };
    } else if (dia >= 15 && dia < 21) {
      return {
        fase: 'Fase de Humedad',
        color: '#FF9500',
        icono: '💧',
        mensaje: diasMojar <= 0 ? '¡Ya debes mojar los huevos!' : `Mojar en ${diasMojar} días`
      };
    } else if (dia >= 21) {
      return {
        fase: 'Fase de Nacimiento',
        color: '#34C759',
        icono: '🐣',
        mensaje: diasNacer <= 0 ? '¡Pollos naciendo!' : `Nacimiento en ${diasNacer} días`
      };
    }
    return {
      fase: 'En proceso',
      color: '#666',
      icono: '📅',
      mensaje: 'En incubación'
    };
  };

  const renderIncubacion = ({ item }: { item: Incubacion }) => {
    const estado = getEstadoIncubacion(item);
    const dia = getDiaIncubacion(item.fechaInicio);
    const notificacionesPendientes = notificaciones.filter(
      n => n.incubacionId === item.id && !n.leida
    ).length;

    return (
      <View style={styles.incubacionCard}>
        <View style={[styles.estadoBanner, { backgroundColor: estado.color }]}>
          <Text style={styles.estadoIcono}>{estado.icono}</Text>
          <Text style={styles.estadoFase}>{estado.fase}</Text>
          {notificacionesPendientes > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{notificacionesPendientes}</Text>
            </View>
          )}
        </View>

        <View style={styles.incubacionContent}>
          <View style={styles.incubacionHeader}>
            <Text style={styles.incubacionTitulo}>
              {item.idGalloMadre || 'Sin nombre'}
            </Text>
            <View style={styles.huevosBadge}>
              <Text style={styles.huevosIcono}>🥚</Text>
              <Text style={styles.huevosText}>{item.cantidadHuevos}</Text>
            </View>
          </View>

          <Text style={styles.estadoMensaje}>{estado.mensaje}</Text>
          
          <View style={styles.diasContainer}>
            <View style={styles.diaItem}>
              <Text style={styles.diaLabel}>Día actual</Text>
              <Text style={styles.diaValor}>{dia}/21</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${(dia / 21) * 100}%`, backgroundColor: estado.color }]} />
            </View>
          </View>

          <View style={styles.fechasImportantes}>
            <View style={styles.fechaItem}>
              <Text style={styles.fechaIcono}>📅</Text>
              <View>
                <Text style={styles.fechaLabel}>Inicio</Text>
                <Text style={styles.fechaTexto}>{new Date(item.fechaInicio).toLocaleDateString()}</Text>
              </View>
            </View>
            
            <View style={styles.fechaItem}>
              <Text style={styles.fechaIcono}>💧</Text>
              <View>
                <Text style={styles.fechaLabel}>Mojar (día 15)</Text>
                <Text style={styles.fechaTexto}>{new Date(item.fechaMojarHuevos).toLocaleDateString()}</Text>
              </View>
            </View>
            
            <View style={styles.fechaItem}>
              <Text style={styles.fechaIcono}>🐣</Text>
              <View>
                <Text style={styles.fechaLabel}>Nacimiento (día 21)</Text>
                <Text style={styles.fechaTexto}>{new Date(item.fechaEstimadaNacimiento).toLocaleDateString()}</Text>
              </View>
            </View>
          </View>

          {item.notas && (
            <View style={styles.notasSection}>
              <Text style={styles.notasLabel}>📝 Notas:</Text>
              <Text style={styles.notasTexto}>{item.notas}</Text>
            </View>
          )}

          <View style={styles.botonesAcciones}>
            <TouchableOpacity 
              style={styles.completarButton}
              onPress={() => marcarComoCompletada(item)}
            >
              <Text style={styles.completarButtonText}>✓ Completar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.eliminarButton}
              onPress={() => eliminarIncubacionHandler(item)}
            >
              <Text style={styles.eliminarButtonText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderNotificacion = ({ item }: { item: Notificacion }) => {
    const incubacion = incubaciones.find(inc => inc.id === item.incubacionId);
    
    const handleNotificacionPress = () => {
      // Si es una notificación de registro de nacimiento, abrir el modal
      if (item.tipo === 'registro_nacimiento' && incubacion) {
        abrirModalRegistro(incubacion);
      } else {
        marcarNotificacion(item);
      }
    };
    
    return (
      <TouchableOpacity 
        style={[styles.notificacionCard, item.leida && styles.notificacionLeida]}
        onPress={handleNotificacionPress}
      >
        <View style={styles.notificacionHeader}>
          <Text style={styles.notificacionIcono}>
            {item.tipo === 'registro_nacimiento' ? '📝' : '🔔'}
          </Text>
          <View style={styles.notificacionContent}>
            <Text style={styles.notificacionTitulo}>{item.titulo}</Text>
            {incubacion && (
              <Text style={styles.notificacionIncubacion}>
                {incubacion.idGalloMadre || 'Sin nombre'} - {incubacion.cantidadHuevos} huevos
              </Text>
            )}
            <Text style={styles.notificacionMensaje}>{item.mensaje}</Text>
            <Text style={styles.notificacionFecha}>
              {new Date(item.fecha).toLocaleDateString()} {new Date(item.fecha).toLocaleTimeString()}
            </Text>
            {item.tipo === 'registro_nacimiento' && (
              <View style={styles.actionBadge}>
                <Text style={styles.actionBadgeText}>👆 Toca para registrar</Text>
              </View>
            )}
          </View>
          {!item.leida && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  const incubacionesFiltradas = incubaciones.filter(inc => {
    if (vistaSeleccionada === 'activas') {
      const dia = getDiaIncubacion(inc.fechaInicio);
      return inc.estado !== 'completada' && dia >= 12 && dia < 15;
    } else if (vistaSeleccionada === 'enProceso') {
      const dia = getDiaIncubacion(inc.fechaInicio);
      return inc.estado !== 'completada' && dia >= 15 && dia < 21;
    } else {
      return inc.estado === 'completada';
    }
  });

  const notificacionesPendientes = notificaciones.filter(n => !n.leida);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🔔 Avisos de Incubación</Text>
        
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, vistaSeleccionada === 'activas' && styles.tabActive]}
          onPress={() => setVistaSeleccionada('activas')}
        >
          <Text style={[styles.tabText, vistaSeleccionada === 'activas' && styles.tabTextActive]}>
            Activas ({incubaciones.filter(i => {
              const dia = getDiaIncubacion(i.fechaInicio);
              return i.estado !== 'completada' && dia >= 12 && dia < 15;
            }).length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, vistaSeleccionada === 'enProceso' && styles.tabActive]}
          onPress={() => setVistaSeleccionada('enProceso')}
        >
          <Text style={[styles.tabText, vistaSeleccionada === 'enProceso' && styles.tabTextActive]}>
            En proceso ({incubaciones.filter(i => {
              const dia = getDiaIncubacion(i.fechaInicio);
              return i.estado !== 'completada' && dia >= 15 && dia < 21;
            }).length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, vistaSeleccionada === 'completadas' && styles.tabActive]}
          onPress={() => setVistaSeleccionada('completadas')}
        >
          <Text style={[styles.tabText, vistaSeleccionada === 'completadas' && styles.tabTextActive]}>
            Completadas ({incubaciones.filter(i => i.estado === 'completada').length})
          </Text>
        </TouchableOpacity>
      </View>

      {notificacionesPendientes.length > 0 && vistaSeleccionada === 'activas' && (
        <View style={styles.notificacionesPendientesSection}>
          <Text style={styles.notificacionesPendientesTitulo}>
            ⚠️ Notificaciones Pendientes ({notificacionesPendientes.length})
          </Text>
          <FlatList
            data={notificacionesPendientes}
            renderItem={renderNotificacion}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.notificacionesLista}
          />
        </View>
      )}

      {incubacionesFiltradas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>
            {vistaSeleccionada === 'activas' ? '🥚' : vistaSeleccionada === 'enProceso' ? '💧' : '✅'}
          </Text>
          <Text style={styles.emptyText}>
            {vistaSeleccionada === 'activas' 
              ? 'No hay incubaciones activas' 
              : vistaSeleccionada === 'enProceso'
              ? 'No hay incubaciones en proceso'
              : 'No hay incubaciones completadas'}
          </Text>
          {(vistaSeleccionada === 'activas' || vistaSeleccionada === 'enProceso') && (
            <TouchableOpacity 
              style={styles.nuevaIncubacionButton}
              onPress={abrirModalNueva}
            >
              <Text style={styles.nuevaIncubacionButtonText}>+ Nueva Incubación</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={incubacionesFiltradas}
          renderItem={renderIncubacion}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {(vistaSeleccionada === 'activas' || vistaSeleccionada === 'enProceso') && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={abrirModalNueva}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>🐣 Nueva Incubación</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>ℹ️ Información</Text>
                <Text style={styles.infoText}>
                  • Día 15: Debes mojar los huevos{'\n'}
                  • Día 21: Nacimiento estimado{'\n'}
                  • Recibirás notificaciones automáticas
                </Text>
              </View>

              <Text style={styles.label}>Fecha de Inicio *</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setMostrarCalendario(true)}
              >
                <Text style={styles.dateButtonIcon}>📅</Text>
                <Text style={styles.dateButtonText}>
                  {fechaInicio.toLocaleDateString('es-ES', { 
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </Text>
              </TouchableOpacity>

              {mostrarCalendario && (
                <DateTimePicker
                  value={fechaInicio}
                  mode="date"
                  display="default"
                  onChange={onChangeFecha}
                />
              )}

              <Text style={styles.label}>Cantidad de Huevos *</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                keyboardType="numeric"
                value={cantidadHuevos}
                onChangeText={setCantidadHuevos}
              />

              <Text style={styles.label}>Nombre de Gallina</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: vaquis"
                value={idGalloMadre}
                onChangeText={setIdGalloMadre}
              />

              <Text style={styles.label}>Notas</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Observaciones adicionales"
                value={notas}
                onChangeText={setNotas}
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleGuardarIncubacion}
              >
                <Text style={styles.saveButtonText}>Registrar Incubación</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal para registrar pollos nacidos */}
      <Modal
        visible={modalRegistroVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalRegistroVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📝 Registrar Nacimiento</Text>
              <TouchableOpacity onPress={() => setModalRegistroVisible(false)}>
                <Text style={styles.closeButton}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {incubacionSeleccionada && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoTitle}>🐣 Incubación</Text>
                  <Text style={styles.infoText}>
                    Inicio: {new Date(incubacionSeleccionada.fechaInicio).toLocaleDateString()}{'\n'}
                    Huevos incubados: {incubacionSeleccionada.cantidadHuevos}
                    {incubacionSeleccionada.idGalloMadre && `\nGallina: ${incubacionSeleccionada.idGalloMadre}`}
                  </Text>
                </View>
              )}

              <Text style={styles.label}>Total de Pollos Nacidos *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 18"
                keyboardType="numeric"
                value={pollosNacidos}
                onChangeText={setPollosNacidos}
              />

              <View style={[styles.infoBox, { marginTop: 20, backgroundColor: '#e8f5e9' }]}>
                <Text style={[styles.infoText, { color: '#2e7d32' }]}>
                  ℹ️ Se creará automáticamente un nuevo lote con los pollos recién nacidos.{'\n\n'}
                  💡 Podrás actualizar el género (machos/hembras) y reducir la cantidad después desde la gestión de lotes, cuando determines el sexo de cada uno.
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleRegistrarNacimiento}
              >
                <Text style={styles.saveButtonText}>✓ Crear Lote y Completar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setModalRegistroVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#34C759',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#34C759',
  },
  tabText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#34C759',
    fontWeight: 'bold',
  },
  notificacionesPendientesSection: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ffc107',
  },
  notificacionesPendientesTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 10,
  },
  notificacionesLista: {
    paddingRight: 15,
  },
  notificacionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginRight: 10,
    width: 280,
    borderWidth: 2,
    borderColor: '#ffc107',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificacionLeida: {
    opacity: 0.6,
    borderColor: '#e0e0e0',
  },
  notificacionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificacionIcono: {
    fontSize: 24,
    marginRight: 10,
  },
  notificacionContent: {
    flex: 1,
  },
  notificacionTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  notificacionIncubacion: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  notificacionMensaje: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    lineHeight: 20,
  },
  notificacionFecha: {
    fontSize: 11,
    color: '#999',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
    marginLeft: 10,
  },
  lista: {
    padding: 15,
  },
  incubacionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  estadoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingVertical: 12,
  },
  estadoIcono: {
    fontSize: 24,
    marginRight: 10,
  },
  estadoFase: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  notificationBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  incubacionContent: {
    padding: 18,
  },
  incubacionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  incubacionTitulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
  },
  huevosBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  huevosIcono: {
    fontSize: 18,
    marginRight: 6,
  },
  huevosText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  estadoMensaje: {
    fontSize: 16,
    color: '#555',
    marginBottom: 15,
    fontWeight: '500',
  },
  diasContainer: {
    marginBottom: 20,
  },
  diaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  diaLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  diaValor: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  fechasImportantes: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  fechaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  fechaIcono: {
    fontSize: 20,
    marginRight: 12,
  },
  fechaLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 2,
  },
  fechaTexto: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  notasSection: {
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  notasLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#e65100',
    marginBottom: 6,
  },
  notasTexto: {
    fontSize: 14,
    color: '#5d4037',
    lineHeight: 20,
  },
  botonesAcciones: {
    flexDirection: 'row',
    gap: 10,
  },
  completarButton: {
    flex: 1,
    backgroundColor: '#34C759',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  completarButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  eliminarButton: {
    backgroundColor: '#FF3B30',
    padding: 14,
    borderRadius: 12,
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  eliminarButtonText: {
    fontSize: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    textAlign: 'center',
    marginBottom: 30,
  },
  nuevaIncubacionButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  nuevaIncubacionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 28,
    color: '#999',
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1565c0',
    lineHeight: 22,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  dateButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#34C759',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  actionBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
