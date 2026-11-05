import { useCallback, useState } from 'react';
import { authApi } from '../../utils/api';
import { errorMessage } from '../../utils/errorMessage';
import { LoginRequest, RegisterRequest, User } from '../../types';

/** Hook de autenticación: consume /api/auth (login, register, change-password) */
export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = useCallback(async (data: LoginRequest) => {
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login(data.userName, data.password);
      return res.data as { token: string; user: User };
    } catch (err: any) {
      setError(errorMessage(err, 'Error signing in.'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    setLoading(true);
    setError('');
    try {
      const res = await authApi.register(data.userName, data.userEmail, data.password);
      return res.data;
    } catch (err: any) {
      setError(errorMessage(err, 'Error signing up.'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      setLoading(true);
      setError('');
      try {
        await authApi.changePassword(currentPassword, newPassword);
      } catch (err: any) {
        setError(errorMessage(err, 'Error changing password.'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { login, register, changePassword, loading, error, setError };
};
