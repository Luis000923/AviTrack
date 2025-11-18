
import React from 'react';
import { TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { styles } from '../../constants/styles';

export const Input = ({ placeholder, value, onChangeText, secureTextEntry }) => (
  <TextInput
    placeholder={placeholder}
    value={value}
    onChangeText={onChangeText}
    secureTextEntry={secureTextEntry}
    style={styles.input}
  />
);

export const Button = ({ title, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.button}>
    <Text style={styles.buttonText}>{title}</Text>
  </TouchableOpacity>
);
