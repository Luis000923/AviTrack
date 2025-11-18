import React, { useState } from 'react';
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
import { guardarLote } from '@/services/storage';

export default function NuevoLoteScreen() {
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [idGalloMadre, setIdGalloMadre] = useState('');
  const [cantidadHuevos, setCantidadHuevos] = useState('');
  const [cantidadNacidos, setCantidadNacidos] = useState('');
  const [fechaEncubacion, setFechaEncubacion] = useState('');
  const [color, setColor] = useState('');
  const [cantidadMachos, setCantidadMachos] = useState('');
  const [cantidadHembras, setCantidadHembras] = useState('');
  const [notas, setNotas] = useState('');

  const handleGuardar = async () => {
    // Validaciones básicas
    if (!fechaNacimiento || !idGalloMadre || !cantidadNacidos) {
      Alert.alert('Error', 'Por favor completa los campos obligatorios');
      return;
    }

    try {
      const nuevoLote = {
        fechaNacimiento,
        idGalloMadre,
        cantidadHuevos: parseInt(cantidadHuevos) || 0,
        cantidadNacidos: parseInt(cantidadNacidos),
        fechaEncubacion,
        color: color || '',
        cantidadMachos: parseInt(cantidadMachos) || 0,
        cantidadHembras: parseInt(cantidadHembras) || 0,
        notas,
      };

      await guardarLote(nuevoLote);
      Alert.alert('Éxito', 'Lote registrado correctamente', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el lote');
      console.error(error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nuevo Lote</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Fecha de Nacimiento *</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={fechaNacimiento}
          onChangeText={setFechaNacimiento}
        />

        <Text style={styles.label}>ID Gallo/Madre *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: G001-M002"
          value={idGalloMadre}
          onChangeText={setIdGalloMadre}
        />

        <Text style={styles.label}>Cantidad de Huevos</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          keyboardType="numeric"
          value={cantidadHuevos}
          onChangeText={setCantidadHuevos}
        />

        <Text style={styles.label}>Cantidad Nacidos *</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          keyboardType="numeric"
          value={cantidadNacidos}
          onChangeText={setCantidadNacidos}
        />

        <Text style={styles.label}>Fecha de Encubación</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={fechaEncubacion}
          onChangeText={setFechaEncubacion}
        />

        <Text style={styles.label}>Color</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Negro, Blanco, Mixto"
          value={color}
          onChangeText={setColor}
        />

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

        <Text style={styles.label}>Notas</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Observaciones adicionales"
          value={notas}
          onChangeText={setNotas}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleGuardar}>
          <Text style={styles.saveButtonText}>Guardar Lote</Text>
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
    marginBottom: 40,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
