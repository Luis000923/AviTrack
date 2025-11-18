
import React, { useState, useContext } from 'react';
import { View } from 'react-native';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../api/firebase';
import { AuthContext } from '../contexts/auth-context';
import { Input, Button } from '../components/form-components';
import { styles } from '../constants/styles';

const CreateLote = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [nombre, setNombre] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [cantidadInicial, setCantidadInicial] = useState('');
  const [gallinaMadre, setGallinaMadre] = useState('');
  const [color, setColor] = useState('');
  const [genero, setGenero] = useState('');

  const handleCreate = async () => {
    if (!user) return;

    await addDoc(collection(db, `users/${user.uid}/lotes`), {
      nombre,
      fechaNacimiento,
      cantidadInicial: parseInt(cantidadInicial),
      cantidadActual: parseInt(cantidadInicial),
      gallinaMadre,
      color,
      genero,
    });

    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Input placeholder="Nombre" value={nombre} onChangeText={setNombre} />
      <Input placeholder="Fecha de Nacimiento (YYYY-MM-DD)" value={fechaNacimiento} onChangeText={setFechaNacimiento} />
      <Input placeholder="Cantidad Inicial" value={cantidadInicial} onChangeText={setCantidadInicial} keyboardType="numeric" />
      <Input placeholder="Gallina Madre" value={gallinaMadre} onChangeText={setGallinaMadre} />
      <Input placeholder="Color" value={color} onChangeText={setColor} />
      <Input placeholder="Género" value={genero} onChangeText={setGenero} />
      <Button title="Crear" onPress={handleCreate} />
    </View>
  );
};

export default CreateLote;
