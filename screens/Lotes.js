
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../api/firebase';
import { AuthContext } from '../contexts/auth-context';
import { Button } from '../components/form-components';
import { styles } from '../constants/styles';

const Lotes = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [lotes, setLotes] = useState([]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, `users/${user.uid}/lotes`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lotesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLotes(lotesData);
    });

    return unsubscribe;
  }, [user]);

  return (
    <View style={styles.container}>
      <Button title="Crear Lote" onPress={() => navigation.navigate('CreateLote')} />
      <FlatList
        data={lotes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('LoteDetail', { loteId: item.id })}>
            <Text>Nombre: {item.nombre}</Text>
            <Text>Fecha de Nacimiento: {item.fechaNacimiento}</Text>
            <Text>Cantidad Inicial: {item.cantidadInicial}</Text>
            <Text>Cantidad Actual: {item.cantidadActual}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default Lotes;
