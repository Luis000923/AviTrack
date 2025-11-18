// Credenciales de usuario para autenticación
// Formato: { username: string, password: string, name: string }

export const users = [
  {
    username: 'l',
    password: '1',
    name: 'Chepe',
  },
   {
    username: 'luis',
    password: 'Luis',
    name: 'papá',
  },
];

// Función para validar credenciales
export const validateCredentials = (username, password) => {
  const user = users.find(
    u => u.username === username && u.password === password
  );
  return user || null;
};
