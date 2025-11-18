import { registrarIncubacion } from '@/services/storage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function NuevaIncubacionScreen() {
  const [fechaInicio, setFechaInicio] = useState('');
  const [cantidadHuevos, setCantidadHuevos] = useState('');
  const [idGalloMadre, setIdGalloMadre] = useState('');
  const [notas, setNotas] = useState('');

  const handleGuardar = async () => {
    if (!fechaInicio || !cantidadHuevos) {
      Alert.alert('Error', 'Por favor completa los campos obligatorios');
      return;
    }

    try {
      const incubacion = {
        fechaInicio,
        cantidadHuevos: parseInt(cantidadHuevos),
        idGalloMadre,
        notas,
      };

      const resultado = await registrarIncubacion(incubacion);
      
      const fechaMojar = new Date(resultado.fechaMojarHuevos).toLocaleDateString();
      const fechaNacer = new Date(resultado.fechaEstimadaNacimiento).toLocaleDateString();

      Alert.alert(
        'Incubación Registrada', 
        `Fechas importantes:\n\n` +
        `📅 Mojar huevos (día 15): ${fechaMojar}\n` +
        `🐣 Nacimiento estimado (día 21): ${fechaNacer}\n\n` +
        `Se han programado notificaciones automáticas.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar la incubación');
      console.error(error);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView 
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nueva Incubación</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ Información</Text>
          <Text style={styles.infoText}>
            • Día 15: Debes mojar los huevos{'\n'}
            • Día 21: Nacimiento estimado{'\n'}
            • Recibirás notificaciones automáticas
          </Text>
        </View>

        <Text style={styles.label}>Fecha de Inicio *</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={fechaInicio}
          onChangeText={setFechaInicio}
        />

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

        <TouchableOpacity style={styles.saveButton} onPress={handleGuardar}>
          <Text style={styles.saveButtonText}>Registrar Incubación</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
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
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 22,
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
