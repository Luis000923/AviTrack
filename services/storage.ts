import AsyncStorage from '@react-native-async-storage/async-storage';

// Tipos
export interface PolloIndividual {
  id: string;
  color: string;
  genero: 'macho' | 'hembra';
  estado: 'vivo' | 'muerto' | 'sacrificado';
  notas?: string;
}

export interface Lote {
  id: string;
  nombreLote: string;
  fechaNacimiento: string;
  idGalloMadre: string;
  cantidadHuevos: number;
  cantidadNacidos: number;
  fechaEncubacion?: string;
  color: string;
  cantidadMachos: number;
  cantidadHembras: number;
  notas?: string;
  cantidadActual: number;
  fechaCreacion: string;
  historial?: EventoLote[];
  coloresIndividuales?: PolloIndividual[];
}

export interface EventoLote {
  id: string;
  tipo: 'muerte' | 'sacrificio';
  fecha: string;
  cantidad: number;
  motivo?: string;
  genero?: 'macho' | 'hembra';
  categoria?: string;
}

export interface Medicamento {
  nombre: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
}

export interface RegistroSanidad {
  id: string;
  loteId: string;
  tipo: 'enfermedad' | 'vitamina' | 'antibiotico' | 'vacuna';
  fecha: string;
  fechaRegistro: string;
  nombre?: string;
  dosis?: string;
  frecuencia?: string;
  duracion?: string;
  observaciones?: string;
  enfermedad?: string;
  sintomas?: string;
  medicamentos?: Medicamento[];
}

export interface Incubacion {
  id: string;
  fechaInicio: string;
  cantidadHuevos: number;
  idGalloMadre?: string;
  notas?: string;
  fechaMojarHuevos: string;
  fechaEstimadaNacimiento: string;
  estado: string;
  fechaRegistro: string;
}

export interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
  incubacionId?: string;
}

// Claves de almacenamiento
const KEYS = {
  LOTES: '@lotes',
  SANIDAD: '@sanidad',
  INCUBACIONES: '@incubaciones',
  NOTIFICACIONES: '@notificaciones',
};

// ============= LOTES =============
export const guardarLote = async (lote: Partial<Lote>): Promise<Lote> => {
  try {
    const lotesExistentes = await obtenerLotes();
    const nuevoLote: Lote = {
      id: Date.now().toString(),
      ...lote,
      cantidadActual: lote.cantidadNacidos || 0,
      fechaCreacion: new Date().toISOString(),
    } as Lote;
    lotesExistentes.push(nuevoLote);
    await AsyncStorage.setItem(KEYS.LOTES, JSON.stringify(lotesExistentes));
    return nuevoLote;
  } catch (error) {
    console.error('Error al guardar lote:', error);
    throw error;
  }
};

export const obtenerLotes = async (): Promise<Lote[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.LOTES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error al obtener lotes:', error);
    return [];
  }
}; 

export const obtenerLotePorId = async (id: string): Promise<Lote | null> => {
  try {
    const lotes = await obtenerLotes();
    return lotes.find(lote => lote.id === id) || null;
  } catch (error) {
    console.error('Error al obtener lote:', error);
    return null;
  }
};

export const actualizarLote = async (id: string, datos: Partial<Lote>): Promise<Lote> => {
  try {
    const lotes = await obtenerLotes();
    const index = lotes.findIndex(lote => lote.id === id);
    if (index !== -1) {
      lotes[index] = { ...lotes[index], ...datos };
      await AsyncStorage.setItem(KEYS.LOTES, JSON.stringify(lotes));
      return lotes[index];
    }
    throw new Error('Lote no encontrado');
  } catch (error) {
    console.error('Error al actualizar lote:', error);
    throw error;
  }
};

export const eliminarLote = async (id: string): Promise<void> => {
  try {
    const lotes = await obtenerLotes();
    const lotesActualizados = lotes.filter(lote => lote.id !== id);
    await AsyncStorage.setItem(KEYS.LOTES, JSON.stringify(lotesActualizados));
  } catch (error) {
    console.error('Error al eliminar lote:', error);
    throw error;
  }
};

// ============= EVENTOS DEL LOTE (Muertes, Sacrificios) =============

export const registrarEvento = async (loteId: string, evento: Partial<EventoLote>): Promise<EventoLote> => {
  try {
    const lote = await obtenerLotePorId(loteId);
    if (!lote) throw new Error('Lote no encontrado');

    const nuevoEvento: EventoLote = {
      id: Date.now().toString(),
      ...evento,
      fecha: evento.fecha || new Date().toISOString(),
    } as EventoLote;

    // Agregar evento al historial
    if (!lote.historial) lote.historial = [];
    lote.historial.push(nuevoEvento);

    // Actualizar cantidad actual
    if (evento.tipo === 'muerte' || evento.tipo === 'sacrificio') {
      lote.cantidadActual = (lote.cantidadActual || 0) - (evento.cantidad || 1);
      
      // Actualizar género si se especifica
      if (evento.genero === 'macho' && lote.cantidadMachos) {
        const nuevaCantidad = lote.cantidadMachos - (evento.cantidad || 1);
        if (nuevaCantidad < 0) {
          throw new Error('No hay suficientes machos en el lote');
        }
        lote.cantidadMachos = nuevaCantidad;
      } else if (evento.genero === 'hembra' && lote.cantidadHembras) {
        const nuevaCantidad = lote.cantidadHembras - (evento.cantidad || 1);
        if (nuevaCantidad < 0) {
          throw new Error('No hay suficientes hembras en el lote');
        }
        lote.cantidadHembras = nuevaCantidad;
      }
    }

    await actualizarLote(loteId, lote);
    return nuevoEvento;
  } catch (error) {
    console.error('Error al registrar evento:', error);
    throw error;
  }
};

// ============= SANIDAD =============

export const registrarSanidad = async (loteId: string, registroSanidad: Partial<RegistroSanidad>): Promise<RegistroSanidad> => {
  try {
    const sanidadExistente = await obtenerSanidad();
    const nuevoRegistro: RegistroSanidad = {
      id: Date.now().toString(),
      loteId,
      ...registroSanidad,
      fechaRegistro: new Date().toISOString(),
    } as RegistroSanidad;
    sanidadExistente.push(nuevoRegistro);
    await AsyncStorage.setItem(KEYS.SANIDAD, JSON.stringify(sanidadExistente));
    return nuevoRegistro;
  } catch (error) {
    console.error('Error al registrar sanidad:', error);
    throw error;
  }
};

export const obtenerSanidad = async (loteId?: string): Promise<RegistroSanidad[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.SANIDAD);
    const registros: RegistroSanidad[] = data ? JSON.parse(data) : [];
    return loteId ? registros.filter(r => r.loteId === loteId) : registros;
  } catch (error) {
    console.error('Error al obtener sanidad:', error);
    return [];
  }
};

export const actualizarSanidad = async (registroId: string, datos: Partial<RegistroSanidad>): Promise<void> => {
  try {
    const registros = await obtenerSanidad();
    const index = registros.findIndex(r => r.id === registroId);
    
    if (index === -1) throw new Error('Registro no encontrado');
    
    registros[index] = { ...registros[index], ...datos };
    await AsyncStorage.setItem(KEYS.SANIDAD, JSON.stringify(registros));
  } catch (error) {
    console.error('Error al actualizar sanidad:', error);
    throw error;
  }
};

export const eliminarSanidad = async (registroId: string): Promise<void> => {
  try {
    const registros = await obtenerSanidad();
    const nuevoRegistros = registros.filter(r => r.id !== registroId);
    await AsyncStorage.setItem(KEYS.SANIDAD, JSON.stringify(nuevoRegistros));
  } catch (error) {
    console.error('Error al eliminar sanidad:', error);
    throw error;
  }
};

export const obtenerSanidadPorTipo = async (tipo: string, loteId?: string): Promise<RegistroSanidad[]> => {
  try {
    const registros = await obtenerSanidad(loteId);
    return registros.filter(r => r.tipo === tipo);
  } catch (error) {
    console.error('Error al filtrar sanidad:', error);
    return [];
  }
};

// ============= INCUBACIONES =============

export const registrarIncubacion = async (incubacion: Partial<Incubacion>): Promise<Incubacion> => {
  try {
    const incubacionesExistentes = await obtenerIncubaciones();
    
    const fechaInicio = new Date(incubacion.fechaInicio!);
    const fechaMojarHuevos = new Date(fechaInicio);
    fechaMojarHuevos.setDate(fechaMojarHuevos.getDate() + 15);
    
    const fechaNacimiento = new Date(fechaInicio);
    fechaNacimiento.setDate(fechaNacimiento.getDate() + 21);

    const nuevaIncubacion: Incubacion = {
      id: Date.now().toString(),
      ...incubacion,
      fechaMojarHuevos: fechaMojarHuevos.toISOString(),
      fechaEstimadaNacimiento: fechaNacimiento.toISOString(),
      estado: 'activa',
      fechaRegistro: new Date().toISOString(),
    } as Incubacion;

    incubacionesExistentes.push(nuevaIncubacion);
    await AsyncStorage.setItem(KEYS.INCUBACIONES, JSON.stringify(incubacionesExistentes));
    
    // Crear notificaciones automáticas
    await crearNotificacionesIncubacion(nuevaIncubacion);
    
    return nuevaIncubacion;
  } catch (error) {
    console.error('Error al registrar incubación:', error);
    throw error;
  }
};

export const obtenerIncubaciones = async (): Promise<Incubacion[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.INCUBACIONES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error al obtener incubaciones:', error);
    return [];
  }
};

export const actualizarIncubacion = async (id: string, datos: Partial<Incubacion>): Promise<Incubacion> => {
  try {
    const incubaciones = await obtenerIncubaciones();
    const index = incubaciones.findIndex(inc => inc.id === id);
    if (index !== -1) {
      incubaciones[index] = { ...incubaciones[index], ...datos };
      await AsyncStorage.setItem(KEYS.INCUBACIONES, JSON.stringify(incubaciones));
      return incubaciones[index];
    }
    throw new Error('Incubación no encontrada');
  } catch (error) {
    console.error('Error al actualizar incubación:', error);
    throw error;
  }
};

// ============= NOTIFICACIONES =============

export const crearNotificacionesIncubacion = async (incubacion: Incubacion): Promise<Notificacion[]> => {
  try {
    const notificaciones = await obtenerNotificaciones();
    
    const fechaMojar = new Date(incubacion.fechaMojarHuevos);
    const fechaNacimiento = new Date(incubacion.fechaEstimadaNacimiento);
    
    const nuevasNotificaciones: Notificacion[] = [
      // Notificaciones para mojar huevos (día 15)
      {
        id: `${incubacion.id}_mojar_3d`,
        tipo: 'incubacion',
        titulo: 'Próximo: Mojar huevos',
        mensaje: `En 3 días debes mojar los huevos (${incubacion.cantidadHuevos} huevos)`,
        fecha: new Date(fechaMojar.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        incubacionId: incubacion.id,
        leida: false,
      },
      {
        id: `${incubacion.id}_mojar_2d`,
        tipo: 'incubacion',
        titulo: 'Próximo: Mojar huevos',
        mensaje: `En 2 días debes mojar los huevos`,
        fecha: new Date(fechaMojar.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        incubacionId: incubacion.id,
        leida: false,
      },
      {
        id: `${incubacion.id}_mojar_1d`,
        tipo: 'incubacion',
        titulo: 'Mañana: Mojar huevos',
        mensaje: `Mañana debes mojar los huevos`,
        fecha: new Date(fechaMojar.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        incubacionId: incubacion.id,
        leida: false,
      },
      {
        id: `${incubacion.id}_mojar_hoy`,
        tipo: 'incubacion',
        titulo: '¡Hoy! Mojar huevos',
        mensaje: `Hoy es el día 15 - Debes mojar los huevos`,
        fecha: fechaMojar.toISOString(),
        incubacionId: incubacion.id,
        leida: false,
      },
      // Notificaciones para nacimiento (día 21)
      {
        id: `${incubacion.id}_nacer_3d`,
        tipo: 'incubacion',
        titulo: 'Próximo nacimiento',
        mensaje: `En 3 días nacerán los pollitos`,
        fecha: new Date(fechaNacimiento.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        incubacionId: incubacion.id,
        leida: false,
      },
      {
        id: `${incubacion.id}_nacer_1d`,
        tipo: 'incubacion',
        titulo: 'Nacimiento mañana',
        mensaje: `Mañana nacerán los pollitos - Prepara todo lo necesario`,
        fecha: new Date(fechaNacimiento.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        incubacionId: incubacion.id,
        leida: false,
      },
      {
        id: `${incubacion.id}_nacer_hoy`,
        tipo: 'incubacion',
        titulo: '🐣 ¡Día de nacimiento!',
        mensaje: `Hoy es el día estimado de nacimiento`,
        fecha: fechaNacimiento.toISOString(),
        incubacionId: incubacion.id,
        leida: false,
      },
      // Notificación del día 23 para registrar pollos nacidos
      {
        id: `${incubacion.id}_registrar_pollos`,
        tipo: 'registro_nacimiento',
        titulo: '📝 Registrar pollos nacidos',
        mensaje: `¿Cuántos pollos nacieron de esta incubación? Regístralos para crear un nuevo lote`,
        fecha: new Date(fechaNacimiento.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        incubacionId: incubacion.id,
        leida: false,
      },
    ];
    
    notificaciones.push(...nuevasNotificaciones);
    await AsyncStorage.setItem(KEYS.NOTIFICACIONES, JSON.stringify(notificaciones));
    
    return nuevasNotificaciones;
  } catch (error) {
    console.error('Error al crear notificaciones:', error);
    throw error;
  }
};

export const obtenerNotificaciones = async (): Promise<Notificacion[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.NOTIFICACIONES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    return [];
  }
};

export const obtenerNotificacionesActivas = async (): Promise<Notificacion[]> => {
  try {
    const notificaciones = await obtenerNotificaciones();
    const ahora = new Date();
    return notificaciones.filter(n => {
      const fechaNotif = new Date(n.fecha);
      return !n.leida && fechaNotif <= ahora;
    }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  } catch (error) {
    console.error('Error al obtener notificaciones activas:', error);
    return [];
  }
};

export const marcarNotificacionLeida = async (id: string): Promise<void> => {
  try {
    const notificaciones = await obtenerNotificaciones();
    const index = notificaciones.findIndex(n => n.id === id);
    if (index !== -1) {
      notificaciones[index].leida = true;
      await AsyncStorage.setItem(KEYS.NOTIFICACIONES, JSON.stringify(notificaciones));
    }
  } catch (error) {
    console.error('Error al marcar notificación:', error);
    throw error;
  }
};

// ============= UTILIDADES =============

export const limpiarDatos = async () => {
  try {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  } catch (error) {
    console.error('Error al limpiar datos:', error);
    throw error;
  }
};

// Función para registrar pollos nacidos y crear lote automáticamente
export const registrarPollosNacidos = async (
  incubacionId: string, 
  cantidadNacidos: number,
  cantidadMachos: number,
  cantidadHembras: number
): Promise<Lote> => {
  try {
    const incubaciones = await obtenerIncubaciones();
    const incubacion = incubaciones.find(inc => inc.id === incubacionId);
    
    if (!incubacion) {
      throw new Error('Incubación no encontrada');
    }

    const nuevoLote: Partial<Lote> = {
      nombreLote: `${incubacion.idGalloMadre || 'Incubación'} - ${new Date(incubacion.fechaEstimadaNacimiento).toLocaleDateString()}`,
      fechaNacimiento: incubacion.fechaEstimadaNacimiento,
      cantidadNacidos: cantidadNacidos,
      cantidadMachos: cantidadMachos,
      cantidadHembras: cantidadHembras,
      idGalloMadre: incubacion.idGalloMadre,
    };

    const loteCreado = await guardarLote(nuevoLote);

    await actualizarIncubacion(incubacionId, { 
      estado: 'completada',
      cantidadNacidos: cantidadNacidos 
    } as any);

    const notificaciones = await obtenerNotificaciones();
    const notificacionConfirmacion: Notificacion = {
      id: `${Date.now()}_lote_creado`,
      tipo: 'lote_creado',
      titulo: '✅ Lote creado exitosamente',
      mensaje: `Se ha creado el lote "${loteCreado.nombreLote}" con ${cantidadNacidos} pollos (${cantidadMachos} machos, ${cantidadHembras} hembras)`,
      fecha: new Date().toISOString(),
      incubacionId: incubacionId,
      leida: false,
    };
    notificaciones.push(notificacionConfirmacion);
    await AsyncStorage.setItem(KEYS.NOTIFICACIONES, JSON.stringify(notificaciones));

    return loteCreado;
  } catch (error) {
    console.error('Error al registrar pollos nacidos:', error);
    throw error;
  }
};

export const eliminarIncubacion = async (id: string): Promise<void> => {
  try {
    const incubaciones = await obtenerIncubaciones();
    const incubacionesFiltradas = incubaciones.filter(inc => inc.id !== id);
    await AsyncStorage.setItem(KEYS.INCUBACIONES, JSON.stringify(incubacionesFiltradas));
    
    const notificaciones = await obtenerNotificaciones();
    const notificacionesFiltradas = notificaciones.filter(n => n.incubacionId !== id);
    await AsyncStorage.setItem(KEYS.NOTIFICACIONES, JSON.stringify(notificacionesFiltradas));
  } catch (error) {
    console.error('Error al eliminar incubación:', error);
    throw error;
  }
};

export const exportarDatos = async () => {
  try {
    const lotes = await obtenerLotes();
    const sanidad = await obtenerSanidad();
    const incubaciones = await obtenerIncubaciones();
    const notificaciones = await obtenerNotificaciones();
    
    return {
      lotes,
      sanidad,
      incubaciones,
      notificaciones,
      fechaExportacion: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error al exportar datos:', error);
    throw error;
  }
};
