
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, TextInput } from 'react-native';
import { doc, onSnapshot, updateDoc, addDoc, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../api/firebase';
import { AuthContext } from '../contexts/auth-context';
import { Button } from '../components/form-components';
import { styles } from '../constants/styles';

const LoteDetail = ({ route }) => {
  const { user } = useContext(AuthContext);
  const { loteId } = route.params;
  const [lote, setLote] = useState(null);
  const [history, setHistory] = useState([]);
  const [newHistory, setNewHistory] = useState({ type: '', description: '' });

  useEffect(() => {
    if (!user) return;

    const loteRef = doc(db, `users/${user.uid}/lotes`, loteId);
    const unsubscribeLote = onSnapshot(loteRef, (doc) => {
      setLote({ id: doc.id, ...doc.data() });
    });

    const historyQuery = query(collection(loteRef, 'historial'), orderBy('fecha', 'desc'));
    const unsubscribeHistory = onSnapshot(historyQuery, (snapshot) => {
      const historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(historyData);
    });

    return () => {
      unsubscribeLote();
      unsubscribeHistory();
    };
  }, [user, loteId]);

  const handleUpdate = async (type, data) => {
    const loteRef = doc(db, `users/${user.uid}/lotes`, loteId);
    const historyRef = collection(loteRef, 'historial');

    await addDoc(historyRef, {
      type,
      ...data,
      fecha: new Date().toISOString(),
    });

    if (type === 'muerte' || type === 'sacrificio') {
      await updateDoc(loteRef, {
        cantidadActual: lote.cantidadActual - 1,
      });
    }
  };

  if (!lote) {
    return <Text>Loading...</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{lote.nombre}</Text>
      <Text>Cantidad Actual: {lote.cantidadActual}</Text>
      
      <TextInput placeholder="Tipo de evento (muerte, enfermedad...)" value={newHistory.type} onChangeText={text => setNewHistory({...newHistory, type: text})} style={styles.input} />
      <TextInput placeholder="Descripción" value={newHistory.description} onChangeText={text => setNewHistory({...newHistory, description: text})} style={styles.input} />
      <Button title="Añadir al historial" onPress={() => handleUpdate(newHistory.type, { description: newHistory.description })} />

      <Text style={styles.title}>Historial</Text>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>Tipo: {item.type}</Text>
            <Text>Fecha: {new Date(item.fecha).toLocaleString()}</Text>
            {item.description && <Text>Descripción: {item.description}</Text>}
          </View>
        )}
      />
    </View>
  );
};

export default LoteDetail;
