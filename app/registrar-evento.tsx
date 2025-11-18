import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Alert 
} from 'react-native';
import { router } from 'expo-router';
import { obtenerLotes, registrarEvento, Lote } from '@/services/storage';
import { Picker } from '@react-native-picker/picker';

interface RouteParams {
  params?: {
    tipo?: 'muerte' | 'sacrificio';
  };
}

export default function RegistrarEventoScreen({ route }: { route?: RouteParams }) {
  const tipo = route?.params?.tipo || 'muerte'; // 'muerte' o 'sacrificio'
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loteSeleccionado, setLoteSeleccionado] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [cantidad, setCantidad] = useState('1');
  const [motivo, setMotivo] = useState('');
  const [categoria, setCategoria] = useState('natural'); // Para sacrificio
  const [genero, setGenero] = useState('macho'); // macho o hembra

  useEffect(() => {
    cargarLotes();
  }, []);

  const cargarLotes = async () => {
    const lotesData = await obtenerLotes();
    setLotes(lotesData.filter((l: Lote) => l.cantidadActual > 0));
  };

  const handleGuardar = async () => {
    if (!loteSeleccionado || !cantidad || !genero) {
      Alert.alert('Error', 'Por favor completa los campos obligatorios (Lote, Cantidad y Género)');
      return;
    }

    const cantidadNum = parseInt(cantidad);
    const lote = lotes.find((l: Lote) => l.id === loteSeleccionado);

    if (!lote) {
      Alert.alert('Error', 'Lote no encontrado');
      return;
    }

    if (cantidadNum > lote.cantidadActual) {
      Alert.alert('Error', `La cantidad no puede ser mayor a ${lote.cantidadActual}`);
      return;
    }

    // Validar que haya suficientes pollos del género seleccionado
    if (genero === 'macho') {
      const machosDisponibles = lote.cantidadMachos || 0;
      if (cantidadNum > machosDisponibles) {
        Alert.alert('Error', `Solo hay ${machosDisponibles} machos disponibles en este lote`);
        return;
      }
      if (machosDisponibles === 0) {
        Alert.alert('Error', '0 machos en este lote');
        return;
      }
    } else if (genero === 'hembra') {
      const hembrasDisponibles = lote.cantidadHembras || 0;
      if (cantidadNum > hembrasDisponibles) {
        Alert.alert('Error', `Solo hay ${hembrasDisponibles} hembras disponibles en este lote`);
        return;
      }
      if (hembrasDisponibles === 0) {
        Alert.alert('Error', '0 hembras en este lote');
        return;
      }
    }

    try {
      const evento = {
        tipo,
        fecha,
        cantidad: cantidadNum,
        motivo,
        genero: genero as 'macho' | 'hembra',
        ...(tipo === 'sacrificio' && { categoria }),
      };

      await registrarEvento(loteSeleccionado, evento);
      
      Alert.alert(
        'Éxito',
        `${tipo === 'muerte' ? 'Muerte' : 'Sacrificio'} registrado correctamente`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar el evento');
      console.error(error);
    }
  };

  const titulo = tipo === 'muerte' ? 'Registrar Muerte Natural' : 'Registrar Sacrificio';
  const icon = tipo === 'muerte' ? '💀' : '🔪';

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.header, { backgroundColor: tipo === 'muerte' ? '#FF3B30' : '#FF9500' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{icon} {titulo}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Seleccionar Lote *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={loteSeleccionado}
            onValueChange={(value) => setLoteSeleccionado(value)}
            style={styles.picker}
          >
            <Picker.Item label="Seleccione un lote..." value="" />
            {lotes.map((lote) => (
              <Picker.Item 
                key={lote.id} 
                label={`${lote.nombreLote || lote.idGalloMadre} - ${lote.cantidadActual} aves`} 
                value={lote.id} 
              />
            ))}
          </Picker>
        </View>

        {loteSeleccionado && (
          <View style={styles.cantidadRow}>
            <View style={styles.cantidadInfo}>
              <Text style={styles.cantidadLabel}>Total disponible:</Text>
              <Text style={styles.cantidadTotal}>
                {lotes.find(l => l.id === loteSeleccionado)?.cantidadActual || 0} pollos
              </Text>
            </View>
            <View style={styles.cantidadInputContainer}>
              <Text style={styles.label}>Cantidad *</Text>
              <TextInput
                style={styles.cantidadInput}
                placeholder="1"
                keyboardType="numeric"
                value={cantidad}
                onChangeText={setCantidad}
              />
            </View>
          </View>
        )}

        <Text style={styles.label}>Fecha *</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={fecha}
          onChangeText={setFecha}
        />

        <Text style={styles.label}>Género *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={genero}
            onValueChange={(value) => setGenero(value)}
            style={styles.picker}
          >
            <Picker.Item label="Macho" value="macho" />
            <Picker.Item label="Hembra" value="hembra" />
          </Picker>
        </View>

        {tipo === 'sacrificio' && (
          <>
            <Text style={styles.label}>Categoría</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={categoria}
                onValueChange={(value) => setCategoria(value)}
                style={styles.picker}
              >
                <Picker.Item label="Natural/Consumo" value="natural" />
                <Picker.Item label="Venta" value="venta" />
                <Picker.Item label="Emergencia" value="emergencia" />
              </Picker>
            </View>
          </>
        )}

        <Text style={styles.label}>Motivo/Observaciones</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={tipo === 'muerte' ? 'Causa de la muerte...' : 'Detalles del sacrificio...'}
          value={motivo}
          onChangeText={setMotivo}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleGuardar}>
          <Text style={styles.saveButtonText}>Registrar</Text>
        </TouchableOpacity>
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
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: 'white',
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
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  picker: {
    height: 50,
  },
  cantidadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  cantidadInfo: {
    flex: 1,
  },
  cantidadLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  cantidadTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  cantidadInputContainer: {
    alignItems: 'flex-end',
  },
  cantidadInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    fontWeight: 'bold',
    borderWidth: 2,
    borderColor: '#007AFF',
    width: 80,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#34C759',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
