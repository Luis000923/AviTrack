// Credenciales de usuario para autenticación
// Formato: { username: string, password: string, name: string }

export const users = [
  {
    username: 'user1',
    password: 'password1',
    name: 'Usuario Uno',
  },
   {
    username: 'luis',
    password: 'luis123',
    name: 'Usuario Uno',
  },
  {
    username: 'admin',
    password: 'admin123',
    name: 'Administrador',
  },
  {
    username: 'demo',
    password: 'demo123',
    name: 'Usuario Demo',
  },
];

// Función para validar credenciales
export const validateCredentials = (username, password) => {
  const user = users.find(
    u => u.username === username && u.password === password
  );
  return user || null;
};
