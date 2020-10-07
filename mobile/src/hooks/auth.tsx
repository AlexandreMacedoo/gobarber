import React, { createContext, useCallback, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-community/async-storage'
import api from '../services/api';

interface User {
  id: string;
  email: string;
  avatar_url: string;
  name: string;
}

interface AuthState {
  token: string;
  user: User;
}

interface SignCredential {
  email: string;
  password: string;
}

interface AuthContextData {
  user: User;
  signIn(credentials: SignCredential): Promise<void>;
  signOut(): void;
  updateUser(): Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const AuthProvider: React.FC = ({ children }) => {
  const [data, setData] = useState<AuthState>({} as AuthState);
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStorageData(): Promise<void> {
      const [token, user] = await AsyncStorage.multiGet(['@Gobarber:token', '@Gobarber:user']);

      if (token[1] && user[1]) {
        api.defaults.headers.authorization = `Bearer ${token[1]}`
        setData({ token: token[1], user: JSON.parse(user[1]) })
      }

      setLoading(false)
    }

    loadStorageData()
  }, [])

  const signIn = useCallback(async ({ email, password }) => {
    const response = await api.post('sessions', {
      email,
      password,
    });

    const { token, user } = response.data;

    await AsyncStorage.multiSet([
      ['@Gobarber:token', token],
      ['@Gobarber:user', JSON.stringify(user)]
    ])

    api.defaults.headers.authorization = `Bearer ${token}`

    setData({ token, user });
  }, []);

  const signOut = useCallback(() => {
    AsyncStorage.multiRemove([
      '@Gobarber:token', '@Gobarber:user'
    ]);

    setData({} as AuthState);
  }, []);

  const updateUser = useCallback(
    async (user: User) => {
      AsyncStorage.setItem('@Gobarber:user', JSON.stringify(user));
      setData({
        token: data.token,
        user
      })
    }, [setData, data.token])

  return (
    <AuthContext.Provider value={{ user: data.user, updateUser, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

function useAuth(): AuthContextData {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within a AuthProvider');
  }

  return context;
}

export { AuthProvider, useAuth };
