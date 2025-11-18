
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList } from 'react-native';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../api/firebase';
import { AuthContext } from '../contexts/auth-context';
import { styles } from '../constants/styles';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [summary, setSummary] = useState({ totalLotes: 0, totalAves: 0, upcomingIncubations: [] });

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, `users/${user.uid}/lotes`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let totalLotes = 0;
      let totalAves = 0;
      const upcomingIncubations = [];

      snapshot.forEach(doc => {
        const lote = doc.data();
        totalLotes++;
        totalAves += lote.cantidadActual;
        if (lote.fechaInicioIncubacion) {
          const incubationDate = new Date(lote.fechaInicioIncubacion);
          const estimatedHatchDate = new Date(incubationDate.getTime() + 21 * 24 * 60 * 60 * 1000);
          const daysToHatch = (estimatedHatchDate - new Date()) / (1000 * 60 * 60 * 24);
          if (daysToHatch <= 3) {
            upcomingIncubations.push({ lote: lote.nombre, date: estimatedHatchDate.toDateString() });
          }
        }
      });

      setSummary({ totalLotes, totalAves, upcomingIncubations });
    });

    return unsubscribe;
  }, [user]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <Text>Total de lotes: {summary.totalLotes}</Text>
      <Text>Total de aves vivas: {summary.totalAves}</Text>
      <Text style={styles.title}>Avisos de Incubación</Text>
      <FlatList
        data={summary.upcomingIncubations}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => <Text>{item.lote} - {item.date}</Text>}
      />
    </View>
  );
};

export default Dashboard;
