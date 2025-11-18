import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    updateDoc,
    where,
    writeBatch
} from 'firebase/firestore';
import { db } from '../api/firebase';
import { autoBackupIfEnabled } from './googleDriveBackup';

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

// Colecciones de Firestore
const COLLECTIONS = {
  LOTES: 'lotes',
  SANIDAD: 'sanidad',
  INCUBACIONES: 'incubaciones',
  NOTIFICACIONES: 'notificaciones',
};

// ============= LOTES =============
export const guardarLote = async (lote: Partial<Lote>): Promise<Lote> => {
  try {
    console.log('🔵 [FIREBASE] Iniciando guardado de lote...');
    console.log('🔵 [FIREBASE] DB conectado?:', db ? 'Sí' : 'NO');
    console.log('🔵 [FIREBASE] Datos recibidos:', JSON.stringify(lote, null, 2));
    
    if (!db) {
      throw new Error('Firebase no está inicializado');
    }
    
    const nuevoLote = {
      ...lote,
      cantidadActual: lote.cantidadNacidos || 0,
      fechaCreacion: new Date().toISOString(),
    };
    
    console.log('🔵 [FIREBASE] Datos a guardar:', JSON.stringify(nuevoLote, null, 2));
    console.log('🔵 [FIREBASE] Intentando escribir en colección:', COLLECTIONS.LOTES);
    
    const docRef = await addDoc(collection(db, COLLECTIONS.LOTES), nuevoLote);
    console.log('✅ [FIREBASE] Lote guardado exitosamente con ID:', docRef.id);
    
    // Backup automático
    autoBackupIfEnabled().catch(err => console.warn('⚠️ Backup automático falló:', err));
    
    return { id: docRef.id, ...nuevoLote } as Lote;
  } catch (error: any) {
    console.error('❌ [FIREBASE] Error al guardar lote:', error);
    console.error('❌ [FIREBASE] Tipo de error:', error?.constructor?.name);
    console.error('❌ [FIREBASE] Mensaje:', error?.message);
    console.error('❌ [FIREBASE] Código:', error?.code);
    throw error;
  }
};

export const obtenerLotes = async (): Promise<Lote[]> => {
  try {
    console.log('🔵 [FIREBASE] Obteniendo lotes desde Firestore...');
    console.log('🔵 [FIREBASE] DB conectado?:', db ? 'Sí' : 'NO');
    
    if (!db) {
      console.error('❌ [FIREBASE] DB no está inicializado');
      return [];
    }
    
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.LOTES));
    const lotes: Lote[] = [];
    querySnapshot.forEach((doc) => {
      lotes.push({ id: doc.id, ...doc.data() } as Lote);
    });
    
    // Si no hay lotes, intentar recuperar desde backup
    if (lotes.length === 0) {
      console.log('⚠️ [FIREBASE] No hay lotes en Firebase, intentando recuperar desde backup...');
      const recuperado = await recuperarDesdeBackupSiNecesario();
      
      if (recuperado) {
        // Volver a consultar después de la recuperación
        const querySnapshotRecuperado = await getDocs(collection(db, COLLECTIONS.LOTES));
        querySnapshotRecuperado.forEach((doc) => {
          lotes.push({ id: doc.id, ...doc.data() } as Lote);
        });
        console.log('✅ [FIREBASE] Datos recuperados:', lotes.length, 'lotes');
      }
    } else {
      console.log('✅ [FIREBASE] Lotes obtenidos:', lotes.length, 'lotes encontrados');
      if (lotes.length > 0) {
        console.log('✅ [FIREBASE] Primer lote:', JSON.stringify(lotes[0], null, 2));
      }
    }
    
    return lotes;
  } catch (error) {
    console.error('❌ [FIREBASE] Error al obtener lotes:', error);
    return [];
  }
}; 

export const obtenerLotePorId = async (id: string): Promise<Lote | null> => {
  try {
    const docRef = doc(db, COLLECTIONS.LOTES, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Lote;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error al obtener lote:', error);
    return null;
  }
};

export const actualizarLote = async (id: string, datos: Partial<Lote>): Promise<Lote> => {
  try {
    const docRef = doc(db, COLLECTIONS.LOTES, id);
    await updateDoc(docRef, datos);
    
    // Retornar el lote actualizado
    const loteActualizado = await obtenerLotePorId(id);
    if (!loteActualizado) throw new Error('Error al recuperar lote actualizado');
    
    // Backup automático
    autoBackupIfEnabled().catch(err => console.warn('⚠️ Backup automático falló:', err));
    
    return loteActualizado;
  } catch (error) {
    console.error('Error al actualizar lote:', error);
    throw error;
  }
};

export const eliminarLote = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.LOTES, id));
    
    // Backup automático
    autoBackupIfEnabled().catch(err => console.warn('⚠️ Backup automático falló:', err));
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
    const historial = lote.historial || [];
    historial.push(nuevoEvento);
    
    const updates: any = { historial };

    // Actualizar cantidad actual
    if (evento.tipo === 'muerte' || evento.tipo === 'sacrificio') {
      updates.cantidadActual = (lote.cantidadActual || 0) - (evento.cantidad || 1);
      
      // Actualizar género si se especifica
      if (evento.genero === 'macho' && lote.cantidadMachos) {
        const nuevaCantidad = lote.cantidadMachos - (evento.cantidad || 1);
        if (nuevaCantidad < 0) {
          throw new Error('No hay suficientes machos en el lote');
        }
        updates.cantidadMachos = nuevaCantidad;
      } else if (evento.genero === 'hembra' && lote.cantidadHembras) {
        const nuevaCantidad = lote.cantidadHembras - (evento.cantidad || 1);
        if (nuevaCantidad < 0) {
          throw new Error('No hay suficientes hembras en el lote');
        }
        updates.cantidadHembras = nuevaCantidad;
      }
    }

    await actualizarLote(loteId, updates);
    return nuevoEvento;
  } catch (error) {
    console.error('Error al registrar evento:', error);
    throw error;
  }
};

// ============= SANIDAD =============

export const registrarSanidad = async (loteId: string, registroSanidad: Partial<RegistroSanidad>): Promise<RegistroSanidad> => {
  try {
    const nuevoRegistro = {
      loteId,
      ...registroSanidad,
      fechaRegistro: new Date().toISOString(),
    };
    
    const docRef = await addDoc(collection(db, COLLECTIONS.SANIDAD), nuevoRegistro);
    return { id: docRef.id, ...nuevoRegistro } as RegistroSanidad;
  } catch (error) {
    console.error('Error al registrar sanidad:', error);
    throw error;
  }
};

export const obtenerSanidad = async (loteId?: string): Promise<RegistroSanidad[]> => {
  try {
    let q;
    if (loteId) {
      q = query(collection(db, COLLECTIONS.SANIDAD), where("loteId", "==", loteId));
    } else {
      q = collection(db, COLLECTIONS.SANIDAD);
    }
    
    const querySnapshot = await getDocs(q);
    const registros: RegistroSanidad[] = [];
    querySnapshot.forEach((doc) => {
      registros.push({ id: doc.id, ...doc.data() } as RegistroSanidad);
    });
    return registros;
  } catch (error) {
    console.error('Error al obtener sanidad:', error);
    return [];
  }
};

export const actualizarSanidad = async (registroId: string, datos: Partial<RegistroSanidad>): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.SANIDAD, registroId);
    await updateDoc(docRef, datos);
  } catch (error) {
    console.error('Error al actualizar sanidad:', error);
    throw error;
  }
};

export const eliminarSanidad = async (registroId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.SANIDAD, registroId));
  } catch (error) {
    console.error('Error al eliminar sanidad:', error);
    throw error;
  }
};

export const obtenerSanidadPorTipo = async (tipo: string, loteId?: string): Promise<RegistroSanidad[]> => {
  try {
    let q;
    if (loteId) {
      q = query(
        collection(db, COLLECTIONS.SANIDAD), 
        where("loteId", "==", loteId),
        where("tipo", "==", tipo)
      );
    } else {
      q = query(
        collection(db, COLLECTIONS.SANIDAD), 
        where("tipo", "==", tipo)
      );
    }
    
    const querySnapshot = await getDocs(q);
    const registros: RegistroSanidad[] = [];
    querySnapshot.forEach((doc) => {
      registros.push({ id: doc.id, ...doc.data() } as RegistroSanidad);
    });
    return registros;
  } catch (error) {
    console.error('Error al filtrar sanidad:', error);
    return [];
  }
};

// ============= INCUBACIONES =============

export const registrarIncubacion = async (incubacion: Partial<Incubacion>): Promise<Incubacion> => {
  try {
    const fechaInicio = new Date(incubacion.fechaInicio!);
    const fechaMojarHuevos = new Date(fechaInicio);
    fechaMojarHuevos.setDate(fechaMojarHuevos.getDate() + 15);
    
    const fechaNacimiento = new Date(fechaInicio);
    fechaNacimiento.setDate(fechaNacimiento.getDate() + 21);

    const nuevaIncubacion = {
      ...incubacion,
      fechaMojarHuevos: fechaMojarHuevos.toISOString(),
      fechaEstimadaNacimiento: fechaNacimiento.toISOString(),
      estado: 'activa',
      fechaRegistro: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.INCUBACIONES), nuevaIncubacion);
    const incubacionGuardada = { id: docRef.id, ...nuevaIncubacion } as Incubacion;
    
    // Crear notificaciones automáticas
    await crearNotificacionesIncubacion(incubacionGuardada);
    
    return incubacionGuardada;
  } catch (error) {
    console.error('Error al registrar incubación:', error);
    throw error;
  }
};

export const obtenerIncubaciones = async (): Promise<Incubacion[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.INCUBACIONES));
    const incubaciones: Incubacion[] = [];
    querySnapshot.forEach((doc) => {
      incubaciones.push({ id: doc.id, ...doc.data() } as Incubacion);
    });
    return incubaciones;
  } catch (error) {
    console.error('Error al obtener incubaciones:', error);
    return [];
  }
};

export const actualizarIncubacion = async (id: string, datos: Partial<Incubacion>): Promise<Incubacion> => {
  try {
    const docRef = doc(db, COLLECTIONS.INCUBACIONES, id);
    await updateDoc(docRef, datos);
    
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Incubacion;
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
    const fechaMojar = new Date(incubacion.fechaMojarHuevos);
    const fechaNacimiento = new Date(incubacion.fechaEstimadaNacimiento);
    
    const nuevasNotificaciones = [
      // Notificaciones para mojar huevos (día 15)
      {
        tipo: 'incubacion',
        titulo: 'Próximo: Mojar huevos',
        mensaje: `En 3 días debes mojar los huevos (${incubacion.cantidadHuevos} huevos)`,
        fecha: new Date(fechaMojar.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        incubacionId: incubacion.id,
        leida: false,
      },
      {
        tipo: 'incubacion',
        titulo: 'Próximo: Mojar huevos',
        mensaje: `En 2 días debes mojar los huevos`,
        fecha: new Date(fechaMojar.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        incubacionId: incubacion.id,
        leida: false,
      },
      {
        tipo: 'incubacion',
        titulo: 'Mañana: Mojar huevos',
        mensaje: `Mañana debes mojar los huevos`,
        fecha: new Date(fechaMojar.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        incubacionId: incubacion.id,
        leida: false,
      },
      {
        tipo: 'incubacion',
        titulo: '¡Hoy! Mojar huevos',
        mensaje: `Hoy es el día 15 - Debes mojar los huevos`,
        fecha: fechaMojar.toISOString(),
        incubacionId: incubacion.id,
        leida: false,
      },
      // Notificaciones para nacimiento (día 21)
      {
        tipo: 'incubacion',
        titulo: 'Próximo nacimiento',
        mensaje: `En 3 días nacerán los pollitos`,
        fecha: new Date(fechaNacimiento.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        incubacionId: incubacion.id,
        leida: false,
      },
      {
        tipo: 'incubacion',
        titulo: 'Nacimiento mañana',
        mensaje: `Mañana nacerán los pollitos - Prepara todo lo necesario`,
        fecha: new Date(fechaNacimiento.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        incubacionId: incubacion.id,
        leida: false,
      },
      {
        tipo: 'incubacion',
        titulo: '🐣 ¡Día de nacimiento!',
        mensaje: `Hoy es el día estimado de nacimiento`,
        fecha: fechaNacimiento.toISOString(),
        incubacionId: incubacion.id,
        leida: false,
      },
      // Notificación del día 23 para registrar pollos nacidos
      {
        tipo: 'registro_nacimiento',
        titulo: '📝 Registrar pollos nacidos',
        mensaje: `¿Cuántos pollos nacieron de esta incubación? Regístralos para crear un nuevo lote`,
        fecha: new Date(fechaNacimiento.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        incubacionId: incubacion.id,
        leida: false,
      },
    ];
    
    const batch = writeBatch(db);
    const notificacionesGuardadas: Notificacion[] = [];

    nuevasNotificaciones.forEach(notif => {
      const docRef = doc(collection(db, COLLECTIONS.NOTIFICACIONES));
      batch.set(docRef, notif);
      notificacionesGuardadas.push({ id: docRef.id, ...notif } as Notificacion);
    });

    await batch.commit();
    
    return notificacionesGuardadas;
  } catch (error) {
    console.error('Error al crear notificaciones:', error);
    throw error;
  }
};

export const obtenerNotificaciones = async (): Promise<Notificacion[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.NOTIFICACIONES));
    const notificaciones: Notificacion[] = [];
    querySnapshot.forEach((doc) => {
      notificaciones.push({ id: doc.id, ...doc.data() } as Notificacion);
    });
    return notificaciones;
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    return [];
  }
};

export const obtenerNotificacionesActivas = async (): Promise<Notificacion[]> => {
  try {
    const q = query(collection(db, COLLECTIONS.NOTIFICACIONES), where("leida", "==", false));
    const querySnapshot = await getDocs(q);
    
    const notificaciones: Notificacion[] = [];
    querySnapshot.forEach((doc) => {
      notificaciones.push({ id: doc.id, ...doc.data() } as Notificacion);
    });

    const ahora = new Date();
    return notificaciones.filter(n => {
      const fechaNotif = new Date(n.fecha);
      return fechaNotif <= ahora;
    }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  } catch (error) {
    console.error('Error al obtener notificaciones activas:', error);
    return [];
  }
};

export const marcarNotificacionLeida = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.NOTIFICACIONES, id);
    await updateDoc(docRef, { leida: true });
  } catch (error) {
    console.error('Error al marcar notificación:', error);
    throw error;
  }
};

// ============= UTILIDADES =============

export const limpiarDatos = async () => {
  try {
    // Nota: En Firestore no es recomendable borrar colecciones enteras desde el cliente
    // por temas de rendimiento y costos. Se recomienda hacerlo desde la consola o Cloud Functions.
    console.warn('La limpieza de datos completa no está implementada para Firestore por seguridad.');
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

    const notificacionConfirmacion = {
      tipo: 'lote_creado',
      titulo: '✅ Lote creado exitosamente',
      mensaje: `Se ha creado el lote "${loteCreado.nombreLote}" con ${cantidadNacidos} pollos (${cantidadMachos} machos, ${cantidadHembras} hembras)`,
      fecha: new Date().toISOString(),
      incubacionId: incubacionId,
      leida: false,
    };
    
    await addDoc(collection(db, COLLECTIONS.NOTIFICACIONES), notificacionConfirmacion);

    return loteCreado;
  } catch (error) {
    console.error('Error al registrar pollos nacidos:', error);
    throw error;
  }
};

export const eliminarIncubacion = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.INCUBACIONES, id));
    
    // Eliminar notificaciones asociadas
    const q = query(collection(db, COLLECTIONS.NOTIFICACIONES), where("incubacionId", "==", id));
    const querySnapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

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

// ============= IMPORTAR DATOS DESDE BACKUP =============

export const importarDatosDesdeBackup = async (datos: any): Promise<boolean> => {
  try {
    console.log('📥 [IMPORT] Iniciando importación de datos desde backup...');
    
    if (!datos) {
      console.error('❌ [IMPORT] No hay datos para importar');
      return false;
    }

    let importados = 0;

    // Importar lotes
    if (datos.lotes && Array.isArray(datos.lotes)) {
      console.log('📦 [IMPORT] Importando', datos.lotes.length, 'lotes...');
      for (const lote of datos.lotes) {
        try {
          const { id, ...loteData } = lote; // Remover el ID para crear uno nuevo
          await addDoc(collection(db, COLLECTIONS.LOTES), loteData);
          importados++;
        } catch (error) {
          console.error('❌ [IMPORT] Error al importar lote:', error);
        }
      }
      console.log('✅ [IMPORT] Lotes importados:', importados);
    }

    // Importar registros de sanidad
    if (datos.sanidad && Array.isArray(datos.sanidad)) {
      console.log('🏥 [IMPORT] Importando', datos.sanidad.length, 'registros de sanidad...');
      for (const registro of datos.sanidad) {
        try {
          const { id, ...registroData } = registro;
          await addDoc(collection(db, COLLECTIONS.SANIDAD), registroData);
        } catch (error) {
          console.error('❌ [IMPORT] Error al importar sanidad:', error);
        }
      }
    }

    // Importar incubaciones
    if (datos.incubaciones && Array.isArray(datos.incubaciones)) {
      console.log('🥚 [IMPORT] Importando', datos.incubaciones.length, 'incubaciones...');
      for (const incubacion of datos.incubaciones) {
        try {
          const { id, ...incubacionData } = incubacion;
          await addDoc(collection(db, COLLECTIONS.INCUBACIONES), incubacionData);
        } catch (error) {
          console.error('❌ [IMPORT] Error al importar incubación:', error);
        }
      }
    }

    // Importar notificaciones
    if (datos.notificaciones && Array.isArray(datos.notificaciones)) {
      console.log('🔔 [IMPORT] Importando', datos.notificaciones.length, 'notificaciones...');
      for (const notificacion of datos.notificaciones) {
        try {
          const { id, ...notificacionData } = notificacion;
          await addDoc(collection(db, COLLECTIONS.NOTIFICACIONES), notificacionData);
        } catch (error) {
          console.error('❌ [IMPORT] Error al importar notificación:', error);
        }
      }
    }

    console.log('✅ [IMPORT] Importación completada exitosamente');
    return true;
  } catch (error) {
    console.error('❌ [IMPORT] Error al importar datos:', error);
    return false;
  }
};

// Recuperar datos desde el backup más reciente si no hay datos en Firebase
const recuperarDesdeBackupSiNecesario = async (): Promise<boolean> => {
  try {
    console.log('🔍 [RECOVERY] Verificando si es necesario recuperar desde backup...');
    
    // Verificar si ya hay datos en Firebase
    const lotes = await getDocs(collection(db, COLLECTIONS.LOTES));
    
    if (!lotes.empty) {
      console.log('ℹ️ [RECOVERY] Ya hay datos en Firebase, no es necesario recuperar');
      return false;
    }

    console.log('⚠️ [RECOVERY] No hay datos en Firebase, buscando backup...');
    
    // Intentar obtener el backup más reciente
    const { getMostRecentBackup } = await import('./googleDriveBackup');
    const backupData = await getMostRecentBackup();
    
    if (!backupData) {
      console.log('ℹ️ [RECOVERY] No se encontró ningún backup disponible');
      return false;
    }

    console.log('📥 [RECOVERY] Backup encontrado, importando datos...');
    const success = await importarDatosDesdeBackup(backupData);
    
    if (success) {
      console.log('✅ [RECOVERY] Datos recuperados exitosamente desde backup');
    } else {
      console.log('❌ [RECOVERY] Error al recuperar datos desde backup');
    }
    
    return success;
  } catch (error) {
    console.error('❌ [RECOVERY] Error en recuperación automática:', error);
    return false;
  }
};
