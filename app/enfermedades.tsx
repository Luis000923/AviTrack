/**
 * @file app/enfermedades.tsx
 * @description Pantalla para la gestión de la salud de las aves.
 * Permite registrar y consultar enfermedades, vitaminas, antibióticos y vacunas aplicadas a los lotes.
 * Ofrece funcionalidades para crear, editar y eliminar registros de sanidad.
 * 
 * Se conecta con:
 *  - `services/storage.ts`: para toda la lógica de almacenamiento (obtener, crear, actualizar, eliminar registros de sanidad y lotes).
 *  - `expo-router`: para la navegación.
 *  - `@react-native-picker/picker`: para seleccionar lotes en los formularios.
 */

import { actualizarSanidad, eliminarSanidad, Lote, obtenerLotes, obtenerSanidad, registrarSanidad, RegistroSanidad } from '@/services/storage';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

type TipoTratamiento = 'enfermedad' | 'vitamina' | 'antibiotico' | 'vacuna';

interface Medicamento {
  nombre: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
}

export default function EnfermedadesScreen() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [registros, setRegistros] = useState<RegistroSanidad[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoTratamiento>('enfermedad');
  const [editando, setEditando] = useState<RegistroSanidad | null>(null);
  
  // Estados del formulario
  const [loteSeleccionado, setLoteSeleccionado] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [nombre, setNombre] = useState('');
  const [dosis, setDosis] = useState('');
  const [frecuencia, setFrecuencia] = useState('');
  const [duracion, setDuracion] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [enfermedad, setEnfermedad] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const lotesData = await obtenerLotes();
      const registrosData = await obtenerSanidad();
      setLotes(lotesData);
      setRegistros(registrosData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    }
  };

  const abrirModal = (tipo: TipoTratamiento) => {
    setTipoSeleccionado(tipo);
    limpiarFormulario();
    setEditando(null);
    setModalVisible(true);
  };

  const abrirEdicion = (registro: RegistroSanidad) => {
    setEditando(registro);
    setTipoSeleccionado(registro.tipo);
    setLoteSeleccionado(registro.loteId);
    setFecha(registro.fecha);
    setNombre(registro.nombre || '');
    setDosis(registro.dosis || '');
    setFrecuencia(registro.frecuencia || '');
    setDuracion(registro.duracion || '');
    setObservaciones(registro.observaciones || '');
    setEnfermedad(registro.enfermedad || '');
    setSintomas(registro.sintomas || '');
    setMedicamentos(registro.medicamentos || []);
    setModalVisible(true);
  };

  const limpiarFormulario = () => {
    setLoteSeleccionado('');
    setFecha(new Date().toISOString().split('T')[0]);
    setNombre('');
    setDosis('');
    setFrecuencia('');
    setDuracion('');
    setObservaciones('');
    setEnfermedad('');
    setSintomas('');
    setMedicamentos([]);
  };

  const agregarMedicamento = () => {
    if (!nombre || !dosis) {
      Alert.alert('Error', 'Completa nombre y dosis del medicamento');
      return;
    }
    
    const nuevoMedicamento: Medicamento = {
      nombre,
      dosis,
      frecuencia,
      duracion
    };
    
    setMedicamentos([...medicamentos, nuevoMedicamento]);
    setNombre('');
    setDosis('');
    setFrecuencia('');
    setDuracion('');
  };

  const eliminarMedicamento = (index: number) => {
    const nuevosMedicamentos = medicamentos.filter((_, i) => i !== index);
    setMedicamentos(nuevosMedicamentos);
  };

  const handleGuardar = async () => {
    if (!loteSeleccionado) {
      Alert.alert('Error', 'Selecciona un lote');
      return;
    }

    if (tipoSeleccionado === 'enfermedad') {
      if (!enfermedad || medicamentos.length === 0) {
        Alert.alert('Error', 'Completa el nombre de la enfermedad y agrega al menos un medicamento');
        return;
      }
    } else {
      if (!nombre) {
        Alert.alert('Error', 'Completa el nombre del producto');
        return;
      }
    }

    try {
      const datosRegistro: Partial<RegistroSanidad> = {
        tipo: tipoSeleccionado,
        fecha,
        observaciones,
      };

      if (tipoSeleccionado === 'enfermedad') {
        datosRegistro.enfermedad = enfermedad;
        datosRegistro.sintomas = sintomas;
        datosRegistro.medicamentos = medicamentos;
        datosRegistro.nombre = enfermedad; // Para mostrar en la lista
      } else {
        datosRegistro.nombre = nombre;
        datosRegistro.dosis = dosis;
        datosRegistro.frecuencia = frecuencia;
        datosRegistro.duracion = duracion;
      }

      if (editando) {
        await actualizarSanidad(editando.id, datosRegistro);
      } else {
        await registrarSanidad(loteSeleccionado, datosRegistro);
      }
      
      setModalVisible(false);
      await cargarDatos();
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el registro');
      console.error(error);
    }
  };

  const confirmarEliminar = (registro: RegistroSanidad) => {
    Alert.alert(
      'Eliminar Registro',
      `¿Estás seguro de eliminar este registro?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => handleEliminar(registro.id)
        }
      ]
    );
  };

  const handleEliminar = async (registroId: string) => {
    try {
      await eliminarSanidad(registroId);
      await cargarDatos();
    } catch (error) {
      Alert.alert('Error', 'No se pudo eliminar el registro');
      console.error(error);
    }
  };

  const getTituloModal = () => {
    const titulos = {
      enfermedad: editando ? 'Editar Enfermedad' : 'Registrar Enfermedad',
      vitamina: editando ? 'Editar Vitamina' : 'Registrar Vitamina',
      antibiotico: editando ? 'Editar Antibiótico' : 'Registrar Antibiótico',
      vacuna: editando ? 'Editar Vacuna' : 'Registrar Vacuna'
    };
    return titulos[tipoSeleccionado];
  };

  const getIcono = (tipo: TipoTratamiento) => {
    const iconos = {
      enfermedad: '🏥',
      vitamina: '💊',
      antibiotico: '💉',
      vacuna: '🩹'
    };
    return iconos[tipo];
  };

  const renderRegistro = ({ item }: { item: RegistroSanidad }) => {
    const lote = lotes.find(l => l.id === item.loteId);
    
    return (
      <View style={styles.registroCard}>
        <View style={styles.registroHeader}>
          <View style={styles.iconoBadge}>
            <Text style={styles.registroIcon}>{getIcono(item.tipo)}</Text>
          </View>
          <View style={styles.registroInfo}>
            <Text style={styles.registroNombre}>
              {item.tipo === 'enfermedad' ? item.enfermedad : item.nombre}
            </Text>
            <View style={styles.metaInfo}>
              <View style={styles.metaBadge}>
                <Text style={styles.metaText}>
                  {item.loteId === 'TODOS' ? '🌐 Todos los lotes' : `${lote?.nombreLote || lote?.idGalloMadre || 'N/A'}`}
                </Text>
              </View>
              <View style={styles.fechaBadge}>
                <Text style={styles.fechaText}>📅 {new Date(item.fecha).toLocaleDateString()}</Text>
              </View>
            </View>
          </View>
        </View>
        
        {item.tipo === 'enfermedad' && item.medicamentos && item.medicamentos.length > 0 && (
          <View style={styles.medicamentosSection}>
            <Text style={styles.medicamentosTitle}>💊 Medicamentos</Text>
            {item.medicamentos.map((med, index) => (
              <View key={index} style={styles.medicamentoItem}>
                <Text style={styles.medicamentoNombre}>{med.nombre}</Text>
                <View style={styles.medicamentoDetalles}>
                  {med.dosis && <Text style={styles.medicamentoDetalle}>💧 {med.dosis}</Text>}
                  {med.frecuencia && <Text style={styles.medicamentoDetalle}>⏰ {med.frecuencia}</Text>}
                  {med.duracion && <Text style={styles.medicamentoDetalle}>📆 {med.duracion}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}
        
        {item.tipo !== 'enfermedad' && (
          <View style={styles.detallesSection}>
            {item.dosis && (
              <View style={styles.detalleItem}>
                <Text style={styles.detalleIcono}>💧</Text>
                <View style={styles.detalleTexto}>
                  <Text style={styles.detalleLabel}>Dosis</Text>
                  <Text style={styles.detalleValor}>{item.dosis}</Text>
                </View>
              </View>
            )}
            {item.frecuencia && (
              <View style={styles.detalleItem}>
                <Text style={styles.detalleIcono}>⏰</Text>
                <View style={styles.detalleTexto}>
                  <Text style={styles.detalleLabel}>Frecuencia</Text>
                  <Text style={styles.detalleValor}>{item.frecuencia}</Text>
                </View>
              </View>
            )}
            {item.duracion && (
              <View style={styles.detalleItem}>
                <Text style={styles.detalleIcono}>📆</Text>
                <View style={styles.detalleTexto}>
                  <Text style={styles.detalleLabel}>Duración</Text>
                  <Text style={styles.detalleValor}>{item.duracion}</Text>
                </View>
              </View>
            )}
          </View>
        )}
        
        {item.sintomas && (
          <View style={styles.sintomasSection}>
            <Text style={styles.sintomasLabel}>🩺 Síntomas</Text>
            <Text style={styles.sintomasTexto}>{item.sintomas}</Text>
          </View>
        )}
        
        {item.observaciones && (
          <View style={styles.observacionesSection}>
            <Text style={styles.observacionesLabel}>📝 Observaciones</Text>
            <Text style={styles.observacionesTexto}>{item.observaciones}</Text>
          </View>
        )}
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => abrirEdicion(item)}
            activeOpacity={0.8}
          >
            <View style={styles.buttonGradient}>
              <Text style={styles.buttonIcon}>✏️</Text>
              <Text style={styles.buttonText}>Editar</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => confirmarEliminar(item)}
            activeOpacity={0.8}
          >
            <View style={styles.buttonGradient}>
              <Text style={styles.buttonIcon}>🗑️</Text>
              <Text style={styles.buttonText}>Eliminar</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const registrosFiltrados = registros.filter(r => {
    // Si estamos en enfermedades y hay búsqueda, buscar en todos los tipos
    if (tipoSeleccionado === 'enfermedad' && busqueda.trim()) {
      const terminoBusqueda = busqueda.toLowerCase();
      
      // Buscar en observaciones
      if (r.observaciones && r.observaciones.toLowerCase().includes(terminoBusqueda)) {
        return true;
      }
      
      // Buscar en medicamentos (para enfermedades)
      if (r.medicamentos && r.medicamentos.length > 0) {
        const encontradoEnMedicamentos = r.medicamentos.some(med => 
          med.nombre.toLowerCase().includes(terminoBusqueda) ||
          (med.dosis && med.dosis.toLowerCase().includes(terminoBusqueda)) ||
          (med.frecuencia && med.frecuencia.toLowerCase().includes(terminoBusqueda)) ||
          (med.duracion && med.duracion.toLowerCase().includes(terminoBusqueda))
        );
        if (encontradoEnMedicamentos) return true;
      }
      
      // Buscar en nombre del producto (vitaminas, antibióticos, vacunas)
      if (r.nombre && r.nombre.toLowerCase().includes(terminoBusqueda)) {
        return true;
      }
      
      // Buscar en nombre de enfermedad
      if (r.enfermedad && r.enfermedad.toLowerCase().includes(terminoBusqueda)) {
        return true;
      }
      
      // Buscar en síntomas
      if (r.sintomas && r.sintomas.toLowerCase().includes(terminoBusqueda)) {
        return true;
      }
      
      // Buscar en dosis, frecuencia, duración
      if ((r.dosis && r.dosis.toLowerCase().includes(terminoBusqueda)) ||
          (r.frecuencia && r.frecuencia.toLowerCase().includes(terminoBusqueda)) ||
          (r.duracion && r.duracion.toLowerCase().includes(terminoBusqueda))) {
        return true;
      }
      
      return false;
    }
    
    // Si no hay búsqueda o no estamos en enfermedades, filtrar normalmente por tipo
    return r.tipo === tipoSeleccionado;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🏥 Gestión de Salud</Text>
      </View>

      <View style={styles.categorias}>
        <TouchableOpacity 
          style={[styles.categoriaBtn, tipoSeleccionado === 'enfermedad' && styles.categoriaBtnActive]}
          onPress={() => setTipoSeleccionado('enfermedad')}
        >
          <Text style={styles.categoriaIcon}>🏥</Text>
          <Text style={styles.categoriaText}>Enfermedades</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.categoriaBtn, tipoSeleccionado === 'vitamina' && styles.categoriaBtnActive]}
          onPress={() => setTipoSeleccionado('vitamina')}
        >
          <Text style={styles.categoriaIcon}>💊</Text>
          <Text style={styles.categoriaText}>Vitaminas</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.categoriaBtn, tipoSeleccionado === 'antibiotico' && styles.categoriaBtnActive]}
          onPress={() => setTipoSeleccionado('antibiotico')}
        >
          <Text style={styles.categoriaIcon}>💉</Text>
          <Text style={styles.categoriaText}>Antibióticos</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.categoriaBtn, tipoSeleccionado === 'vacuna' && styles.categoriaBtnActive]}
          onPress={() => setTipoSeleccionado('vacuna')}
        >
          <Text style={styles.categoriaIcon}>🩹</Text>
          <Text style={styles.categoriaText}>Vacunas</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => abrirModal(tipoSeleccionado)}
      >
        <Text style={styles.addButtonText}>+ Nuevo Registro</Text>
      </TouchableOpacity>

      {tipoSeleccionado === 'enfermedad' && (
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar en todas las categorías..."
            value={busqueda}
            onChangeText={setBusqueda}
            placeholderTextColor="#999"
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda('')} style={styles.clearButton}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {registrosFiltrados.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {busqueda.trim() && tipoSeleccionado === 'enfermedad'
              ? `No se encontraron resultados para "${busqueda}" en ninguna categoría`
              : `No hay registros de ${tipoSeleccionado}s`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={registrosFiltrados}
          renderItem={renderRegistro}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}

      {/* Modal para nuevo registro */}
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
                <Text style={styles.modalTitle}>{getTituloModal()}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Seleccionar Lote *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={loteSeleccionado}
                  onValueChange={(value) => setLoteSeleccionado(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Seleccione un lote..." value="" />
                  <Picker.Item label="🌐 Todos los lotes" value="TODOS" style={{ fontWeight: 'bold' }} />
                  {lotes.map((lote) => (
                    <Picker.Item 
                      key={lote.id} 
                      label={`${lote.nombreLote || lote.idGalloMadre} - ${lote.cantidadActual} aves`}
                      value={lote.id} 
                    />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>Fecha *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={fecha}
                onChangeText={setFecha}
              />

              {tipoSeleccionado === 'enfermedad' ? (
                <>
                  <Text style={styles.label}>Nombre de la Enfermedad *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: Newcastle, Bronquitis..."
                    value={enfermedad}
                    onChangeText={setEnfermedad}
                  />

                  <Text style={styles.label}>Síntomas</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe los síntomas observados..."
                    value={sintomas}
                    onChangeText={setSintomas}
                    multiline
                    numberOfLines={3}
                  />

                  <View style={styles.medicamentosContainer}>
                    <Text style={styles.sectionTitle}>💊 Medicamentos</Text>
                    
                    <Text style={styles.label}>Nombre del Medicamento</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Nombre del medicamento"
                      value={nombre}
                      onChangeText={setNombre}
                    />

                    <Text style={styles.label}>Dosis</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ej: 5ml por litro de agua"
                      value={dosis}
                      onChangeText={setDosis}
                    />

                    <Text style={styles.label}>Frecuencia</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ej: Cada 12 horas, Diario..."
                      value={frecuencia}
                      onChangeText={setFrecuencia}
                    />

                    <Text style={styles.label}>Duración del Tratamiento</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ej: 5 días, 1 semana..."
                      value={duracion}
                      onChangeText={setDuracion}
                    />

                    <TouchableOpacity 
                      style={styles.addMedicamentoButton}
                      onPress={agregarMedicamento}
                    >
                      <Text style={styles.addMedicamentoText}>+ Agregar Medicamento</Text>
                    </TouchableOpacity>

                    {medicamentos.length > 0 && (
                      <View style={styles.medicamentosLista}>
                        <Text style={styles.medicamentosListaTitle}>Medicamentos agregados:</Text>
                        {medicamentos.map((med, index) => (
                          <View key={index} style={styles.medicamentoChip}>
                            <View style={styles.medicamentoChipInfo}>
                              <Text style={styles.medicamentoChipNombre}>{med.nombre}</Text>
                              {med.dosis && <Text style={styles.medicamentoChipDetalle}>Dosis: {med.dosis}</Text>}
                            </View>
                            <TouchableOpacity onPress={() => eliminarMedicamento(index)}>
                              <Text style={styles.medicamentoChipDelete}>✕</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.label}>Nombre del Producto *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={`Nombre de la ${tipoSeleccionado}`}
                    value={nombre}
                    onChangeText={setNombre}
                  />

                  <Text style={styles.label}>Dosis</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: 5ml por litro de agua"
                    value={dosis}
                    onChangeText={setDosis}
                  />

                  <Text style={styles.label}>Frecuencia</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: Cada 12 horas, Diario..."
                    value={frecuencia}
                    onChangeText={setFrecuencia}
                  />

                  <Text style={styles.label}>Duración del Tratamiento</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: 5 días, 1 semana..."
                    value={duracion}
                    onChangeText={setDuracion}
                  />
                </>
              )}

              <Text style={styles.label}>Observaciones</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Notas adicionales..."
                value={observaciones}
                onChangeText={setObservaciones}
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleGuardar}
              >
                <Text style={styles.saveButtonText}>Guardar Registro</Text>
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
  categorias: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoriaBtn: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  categoriaBtnActive: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#34C759',
  },
  categoriaIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  categoriaText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#34C759',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  clearButton: {
    padding: 5,
  },
  clearIcon: {
    fontSize: 16,
    color: '#999',
    fontWeight: 'bold',
  },
  list: {
    padding: 15,
  },
  registroCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  registroHeader: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  iconoBadge: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  registroIcon: {
    fontSize: 28,
  },
  registroInfo: {
    flex: 1,
  },
  registroNombre: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  metaInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 12,
    color: '#2e7d32',
    fontWeight: '600',
  },
  fechaBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  fechaText: {
    fontSize: 12,
    color: '#1565c0',
    fontWeight: '600',
  },
  detallesSection: {
    marginTop: 12,
    marginBottom: 12,
  },
  detalleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  detalleIcono: {
    fontSize: 24,
    marginRight: 12,
  },
  detalleTexto: {
    flex: 1,
  },
  detalleLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 2,
  },
  detalleValor: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  sintomasSection: {
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  sintomasLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#e65100',
    marginBottom: 6,
  },
  sintomasTexto: {
    fontSize: 14,
    color: '#5d4037',
    lineHeight: 20,
  },
  observacionesSection: {
    backgroundColor: '#f3e5f5',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#9c27b0',
  },
  observacionesLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#6a1b9a',
    marginBottom: 6,
  },
  observacionesTexto: {
    fontSize: 14,
    color: '#4a148c',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
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
    maxHeight: '80%',
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  picker: {
    height: 50,
  },
  saveButton: {
    backgroundColor: '#34C759',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
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
  medicamentosSection: {
    backgroundColor: '#e8f5e9',
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  medicamentosTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1b5e20',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  medicamentoItem: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  medicamentoNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 8,
  },
  medicamentoDetalles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  medicamentoDetalle: {
    fontSize: 12,
    color: '#555',
    backgroundColor: '#f1f8e9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  buttonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  medicamentosContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#34C759',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 15,
    textAlign: 'center',
  },
  addMedicamentoButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  addMedicamentoText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  medicamentosLista: {
    marginTop: 15,
  },
  medicamentosListaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
  },
  medicamentoChip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#34C759',
  },
  medicamentoChipInfo: {
    flex: 1,
  },
  medicamentoChipNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  medicamentoChipDetalle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  medicamentoChipDelete: {
    fontSize: 20,
    color: '#FF3B30',
    fontWeight: 'bold',
    paddingHorizontal: 10,
  },
});
