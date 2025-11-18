import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { obtenerLotes, actualizarLote, Lote, guardarLote, eliminarLote } from '@/services/storage';

export default function LotesScreen() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [loteEditando, setLoteEditando] = useState<Lote | null>(null);
  
  // Estados del formulario
  const [cantidad, setCantidad] = useState('');
  const [cantidadMachos, setCantidadMachos] = useState('');
  const [cantidadHembras, setCantidadHembras] = useState('');
  const [nombreLote, setNombreLote] = useState('');
  const [galloAsignado, setGalloAsignado] = useState('');
  const [gallinaAsignada, setGallinaAsignada] = useState('');
  const [fechaCreacion, setFechaCreacion] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [modalColoresVisible, setModalColoresVisible] = useState(false);
  const [pollosIndividuales, setPollosIndividuales] = useState<any[]>([]);
  const [coloresSugeridos, setColoresSugeridos] = useState<string[]>([]);

  useEffect(() => {
    cargarLotes();
  }, []);

  useEffect(() => {
    // Actualizar colores sugeridos cada vez que cambien los lotes
    const coloresUnicos = new Set<string>();
    lotes.forEach(lote => {
      if (lote.coloresIndividuales) {
        lote.coloresIndividuales.forEach(pollo => {
          if (pollo.color && pollo.color.trim() !== '' && pollo.color !== '') {
            coloresUnicos.add(pollo.color.trim());
          }
        });
      }
      if (lote.color && lote.color.trim() !== '' && lote.color !== '') {
        coloresUnicos.add(lote.color.trim());
      }
    });
    setColoresSugeridos(Array.from(coloresUnicos));
  }, [lotes]);

  useEffect(() => {
    // Actualizar sugerencias cuando se modifican pollos en el modal actual
    if (modalColoresVisible) {
      const coloresUnicos = new Set<string>();
      
      // Añadir colores de todos los lotes
      lotes.forEach(lote => {
        if (lote.coloresIndividuales) {
          lote.coloresIndividuales.forEach(pollo => {
            if (pollo.color && pollo.color.trim() !== '' && pollo.color !== '') {
              coloresUnicos.add(pollo.color.trim());
            }
          });
        }
      });
      
      // Añadir colores del modal actual
      pollosIndividuales.forEach(pollo => {
        if (pollo.color && pollo.color.trim() !== '' && pollo.color !== '') {
          coloresUnicos.add(pollo.color.trim());
        }
      });
      
      setColoresSugeridos(Array.from(coloresUnicos));
    }
  }, [pollosIndividuales, modalColoresVisible, lotes]);

  const cargarLotes = async () => {
    try {
      const lotesData = await obtenerLotes();
      setLotes(lotesData);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los lotes');
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarLote = async () => {
    if (!cantidad || !nombreLote) {
      Alert.alert('Error', 'Por favor completa cantidad y nombre del lote');
      return;
    }

    const cantidadTotal = parseInt(cantidad);
    const machos = parseInt(cantidadMachos) || 0;
    const hembras = parseInt(cantidadHembras) || 0;

    if (machos + hembras !== cantidadTotal) {
      Alert.alert('Error', 'La suma de machos y hembras debe ser igual a la cantidad total');
      return;
    }

    try {
      const nuevoLote = {
        nombreLote: nombreLote,
        fechaNacimiento: new Date().toISOString().split('T')[0],
        idGalloMadre: nombreLote,
        cantidadHuevos: cantidadTotal,
        cantidadNacidos: cantidadTotal,
        color: '',
        cantidadMachos: machos,
        cantidadHembras: hembras,
      };

      await guardarLote(nuevoLote);
      
      limpiarFormulario();
      setModalVisible(false);
      await cargarLotes();
      
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el lote');
      console.error(error);
    }
  };

  const limpiarFormulario = () => {
    setCantidad('');
    setCantidadMachos('');
    setCantidadHembras('');
    setNombreLote('');
    setGalloAsignado('');
    setGallinaAsignada('');
    setFechaCreacion('');
  };

  const abrirEdicion = (lote: Lote) => {
    setLoteEditando(lote);
    setCantidadMachos(lote.cantidadMachos?.toString() || '0');
    setCantidadHembras(lote.cantidadHembras?.toString() || '0');
    setNombreLote(lote.nombreLote || lote.idGalloMadre);
    setGalloAsignado(lote.idGalloMadre.includes('Gallo') ? lote.idGalloMadre : '');
    setGallinaAsignada(lote.idGalloMadre.includes('Gallina') ? lote.idGalloMadre : '');
    setFechaCreacion(lote.fechaCreacion || lote.fechaNacimiento);
    setFechaNacimiento(new Date(lote.fechaNacimiento));
   
    // Inicializar pollos individuales si no existen
    if (lote.coloresIndividuales && lote.coloresIndividuales.length > 0) {
      
      const pollosLimpios = lote.coloresIndividuales.map(pollo => ({
        ...pollo,
        color: pollo.color === '' ? '' : pollo.color
      }));
      setPollosIndividuales(pollosLimpios);
    } else {
      // Crear array de pollos basado en cantidad actual
      const pollos = [];
      for (let i = 0; i < lote.cantidadMachos; i++) {
        pollos.push({
          id: `${lote.id}-M${i + 1}`,
          genero: 'macho',
          color: '',
          estado: 'vivo'
        });
      }
      for (let i = 0; i < lote.cantidadHembras; i++) {
        pollos.push({
          id: `${lote.id}-H${i + 1}`,
          genero: 'hembra',
          color: '',
          estado: 'vivo'
        });
      }
      setPollosIndividuales(pollos);
    }
    
    setEditModalVisible(true);
  };

  const abrirModalColores = () => {
    setModalColoresVisible(true);
  };

  const actualizarColorPollo = (index: number, nuevoColor: string) => {
    const pollosActualizados = [...pollosIndividuales];
    pollosActualizados[index].color = nuevoColor;
    setPollosIndividuales(pollosActualizados);
  };

  const onChangeFechaNacimiento = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || fechaNacimiento;
    setShowDatePicker(Platform.OS === 'ios');
    setFechaNacimiento(currentDate);
  };

  const handleActualizarLote = async () => {
    if (!loteEditando) return;

    const numMachos = parseInt(cantidadMachos) || 0;
    const numHembras = parseInt(cantidadHembras) || 0;
    const totalNuevo = numMachos + numHembras;

    if (totalNuevo <= 0) {
      Alert.alert('Error', 'Debe haber al menos 1 ave en el lote');
      return;
    }

    try {
      // Ajustar pollos individuales según las nuevas cantidades
      let pollosActualizados = [...pollosIndividuales];
      
      // Filtrar por género
      const machos = pollosActualizados.filter(p => p.genero === 'macho');
      const hembras = pollosActualizados.filter(p => p.genero === 'hembra');

      // Ajustar machos
      if (machos.length > numMachos) {
        // Eliminar exceso
        pollosActualizados = pollosActualizados.filter((p, idx) => {
          if (p.genero === 'macho') {
            const machosHastaAhora = pollosActualizados.slice(0, idx).filter(x => x.genero === 'macho').length;
            return machosHastaAhora < numMachos;
          }
          return true;
        });
      } else if (machos.length < numMachos) {
        // Agregar más machos
        for (let i = machos.length; i < numMachos; i++) {
          pollosActualizados.push({
            id: `${loteEditando.id}-M${i + 1}`,
            genero: 'macho',
            color: '',
            estado: 'vivo'
          });
        }
      }

      // Ajustar hembras
      const hembrasActuales = pollosActualizados.filter(p => p.genero === 'hembra');
      if (hembrasActuales.length > numHembras) {
        // Eliminar exceso
        pollosActualizados = pollosActualizados.filter((p, idx) => {
          if (p.genero === 'hembra') {
            const hembrasHastaAhora = pollosActualizados.slice(0, idx).filter(x => x.genero === 'hembra').length;
            return hembrasHastaAhora < numHembras;
          }
          return true;
        });
      } else if (hembrasActuales.length < numHembras) {
        // Agregar más hembras
        for (let i = hembrasActuales.length; i < numHembras; i++) {
          pollosActualizados.push({
            id: `${loteEditando.id}-H${i + 1}`,
            genero: 'hembra',
            color: '',
            estado: 'vivo'
          });
        }
      }

      const datosActualizados: Partial<Lote> = {
        nombreLote: nombreLote || loteEditando.nombreLote || loteEditando.idGalloMadre,
        idGalloMadre: nombreLote || loteEditando.idGalloMadre,
        fechaNacimiento: fechaNacimiento.toISOString().split('T')[0],
        cantidadActual: totalNuevo,
        cantidadMachos: numMachos,
        cantidadHembras: numHembras,
        coloresIndividuales: pollosActualizados,
      };

      await actualizarLote(loteEditando.id, datosActualizados);
      
      limpiarFormulario();
      setEditModalVisible(false);
      setLoteEditando(null);
      await cargarLotes();
      
      Alert.alert('Éxito', `Lote actualizado correctamente\n\n📊 Total: ${totalNuevo} aves\n♂️ Machos: ${numMachos}\n♀️ Hembras: ${numHembras}`);
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el lote');
      console.error(error);
    }
  };

  const confirmarEliminar = (lote: Lote) => {
    Alert.alert(
      'Eliminar Lote',
      `¿Estás seguro de eliminar el lote "${lote.nombreLote || lote.idGalloMadre}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => handleEliminarLote(lote.id)
        }
      ]
    );
  };

  const handleEliminarLote = async (loteId: string) => {
    try {
      await eliminarLote(loteId);
      await cargarLotes();
      Alert.alert('Éxito', 'Lote eliminado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo eliminar el lote');
      console.error(error);
    }
  };

  const renderLote = ({ item }: { item: Lote }) => {
    const fechaNac = new Date(item.fechaNacimiento).toLocaleDateString();
    const fechaCreac = item.fechaCreacion ? new Date(item.fechaCreacion).toLocaleDateString() : fechaNac;
    const porcentajeVivo = item.cantidadNacidos > 0 
      ? ((item.cantidadActual / item.cantidadNacidos) * 100).toFixed(1)
      : '0';
    const porcentajeNum = parseFloat(porcentajeVivo);

    return (
      <View style={styles.loteCard}>
        <View style={styles.loteHeader}>
          <Text style={styles.loteId}>{item.nombreLote || item.idGalloMadre}</Text>
          <View style={[
            styles.estadoBadge,
            { backgroundColor: porcentajeNum > 70 ? '#34C759' : porcentajeNum > 40 ? '#FF9500' : '#FF3B30' }
          ]}>
            <Text style={styles.estadoText}>{porcentajeVivo}% vivo</Text>
          </View>
        </View>
         <View style={styles.loteInfo}>
          <Text style={styles.infoText}>📅 Fecha Creación: {fechaCreac}</Text>
          <Text style={styles.infoText}>🐣 Fecha Nacimiento: {fechaNac}</Text>
        </View>

        <View style={styles.loteStats}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{item.cantidadActual}</Text>
            <Text style={styles.statLabel}>Actual</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{item.cantidadNacidos}</Text>
            <Text style={styles.statLabel}>Nacidos</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{item.cantidadNacidos - item.cantidadActual}</Text>
            <Text style={styles.statLabel}>Muertos</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{item.cantidadMachos || 0}</Text>
            <Text style={styles.statLabel}>Machos</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{item.cantidadHembras || 0}</Text>
            <Text style={styles.statLabel}>Hembras</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => abrirEdicion(item)}
          >
            <Text style={styles.buttonText}>✏️ Editar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => confirmarEliminar(item)}
          >
            <Text style={styles.buttonText}>🗑️ Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestión de Lotes</Text>
        <TouchableOpacity 
          style={styles.addButtonHeader}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonHeaderText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      {lotes.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay lotes registrados</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.addButtonText}>+ Crear Primer Lote</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={lotes}
          renderItem={renderLote}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={cargarLotes}
        />
      )}

      {/* Modal para crear nuevo lote */}
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
                <Text style={styles.modalTitle}>Nuevo Lote</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Cantidad Total *</Text>
              <TextInput
                style={styles.input}
                placeholder="Número de aves"
                keyboardType="numeric"
                value={cantidad}
                onChangeText={setCantidad}
              />

              <Text style={styles.label}>Nombre del Lote *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Lote Primavera 2025"
                value={nombreLote}
                onChangeText={setNombreLote}
              />

              <Text style={styles.sectionTitle}>Género (Opcional)</Text>

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Machos</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    keyboardType="numeric"
                    value={cantidadMachos}
                    onChangeText={setCantidadMachos}
                  />
                </View>

                <View style={styles.halfInput}>
                  <Text style={styles.label}>Hembras</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    keyboardType="numeric"
                    value={cantidadHembras}
                    onChangeText={setCantidadHembras}
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleGuardarLote}
              >
                <Text style={styles.saveButtonText}>Guardar Lote</Text>
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

      {/* Modal para editar lote existente */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Editar Lote</Text>
                <TouchableOpacity onPress={() => {
                  setEditModalVisible(false);
                  setLoteEditando(null);
                  limpiarFormulario();
                }}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Nombre del Lote *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre del lote"
                value={nombreLote}
                onChangeText={setNombreLote}
              />

              <Text style={styles.sectionTitle}>Cantidad de Aves</Text>
              <Text style={styles.helperText}>Actualiza la cantidad de machos y hembras. Puedes reducir si hay bajas.</Text>

              <Text style={styles.label}>Cantidad de Machos</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 9"
                keyboardType="numeric"
                value={cantidadMachos}
                onChangeText={setCantidadMachos}
              />

              <Text style={styles.label}>Cantidad de Hembras</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 9"
                keyboardType="numeric"
                value={cantidadHembras}
                onChangeText={setCantidadHembras}
              />

              <View style={[styles.infoBox, { marginTop: 10, marginBottom: 20 }]}>
                <Text style={styles.infoText}>
                  📊 Total nuevo: {(parseInt(cantidadMachos) || 0) + (parseInt(cantidadHembras) || 0)} aves
                  {loteEditando && (
                    `\n📈 Total anterior: ${loteEditando.cantidadActual}`
                  )}
                </Text>
              </View>

              <Text style={styles.sectionTitle}>Asignar Gallo/Gallina (Opcional)</Text>
              <Text style={styles.helperText}>Puedes asignar identificadores o dejarlo con el nombre actual</Text>

              <Text style={styles.label}>ID Gallo</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Gallo-001"
                value={galloAsignado}
                onChangeText={setGalloAsignado}
              />

              <Text style={styles.label}>ID Gallina</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Gallina-A45"
                value={gallinaAsignada}
                onChangeText={setGallinaAsignada}
              />

              <Text style={styles.sectionTitle}>Modificar Fecha de Nacimiento</Text>
              <Text style={styles.helperText}>Selecciona la fecha desde el calendario</Text>
              
              <Text style={styles.label}>Fecha de Nacimiento</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  📅 {fechaNacimiento.toLocaleDateString('es-ES', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={fechaNacimiento}
                  mode="date"
                  display="default"
                  onChange={onChangeFechaNacimiento}
                  maximumDate={new Date()}
                />
              )}

              <Text style={styles.sectionTitle}>Fecha de Creación (No editable)</Text>
              <Text style={styles.helperText}>Esta fecha no se puede modificar</Text>
              
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyText}>
                  📅 {loteEditando ? new Date(loteEditando.fechaCreacion).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : ''}
                </Text>
              </View>

              <Text style={styles.sectionTitle}>Colores Individuales</Text>
              <Text style={styles.helperText}>Asigna un color a cada pollo individualmente</Text>
              
              <TouchableOpacity 
                style={styles.colorButton} 
                onPress={abrirModalColores}
              >
                <Text style={styles.colorButtonText}>
                  🎨 Editar Colores ({pollosIndividuales.length} pollos)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleActualizarLote}
              >
                <Text style={styles.saveButtonText}>Guardar Cambios</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => {
                  setEditModalVisible(false);
                  setLoteEditando(null);
                  limpiarFormulario();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal para editar colores individuales */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalColoresVisible}
        onRequestClose={() => setModalColoresVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Colores Individuales</Text>
              <TouchableOpacity onPress={() => setModalColoresVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 500 }}>
              {pollosIndividuales.map((pollo, index) => (
                <View key={pollo.id} style={styles.polloItem}>
                  <View style={styles.polloInfo}>
                    <Text style={styles.polloId}>
                      {pollo.genero === 'macho' ? '♂️' : '♀️'} Pollo #{index + 1}
                    </Text>
                    <Text style={styles.polloGenero}>
                      {pollo.genero === 'macho' ? 'Macho' : 'Hembra'}
                    </Text>
                  </View>
                  <TextInput
                    style={styles.colorInput}
                    placeholder="Color del pollo"
                    value={pollo.color}
                    onChangeText={(texto) => actualizarColorPollo(index, texto)}
                  />
                  {coloresSugeridos.length > 0 && pollo.color.trim() === '' && (
                    <View style={styles.sugerenciasInline}>
                      <Text style={styles.sugerenciasInlineLabel}>Sugerencias:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {coloresSugeridos.map((color, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.sugerenciaChipSmall}
                            onPress={() => actualizarColorPollo(index, color)}
                          >
                            <Text style={styles.sugerenciaTextSmall}>{color}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={() => setModalColoresVisible(false)}
            >
              <Text style={styles.saveButtonText}>Guardar Colores</Text>
            </TouchableOpacity>
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
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  backButton: {
    marginBottom: 10,
    position: 'absolute',
    top: 50,
    left: 20,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  addButtonHeader: {
    backgroundColor: '#34C759',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonHeaderText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  list: {
    padding: 15,
  },
  loteCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  loteId: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  estadoText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loteInfo: {
    marginBottom: 15,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  loteStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
    flexWrap: 'wrap',
  },
  stat: {
    alignItems: 'center',
    minWidth: '18%',
    marginBottom: 5,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 20,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    flex: 1,
    marginRight: 10,
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
    marginBottom: 10,
  },
  dateButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  dateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  colorButton: {
    backgroundColor: '#FF9500',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  colorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  polloItem: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  polloInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  polloId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  polloGenero: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  colorInput: {
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  readOnlyField: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 15,
  },
  readOnlyText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  sugerenciasContainer: {
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sugerenciasLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  sugerenciasScroll: {
    flexDirection: 'row',
  },
  sugerenciaChip: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  sugerenciaText: {
    color: '#1976D2',
    fontSize: 13,
    fontWeight: '600',
  },
  sugerenciasInline: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sugerenciasInlineLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginBottom: 6,
  },
  sugerenciaChipSmall: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  sugerenciaTextSmall: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '600',
  },
});

