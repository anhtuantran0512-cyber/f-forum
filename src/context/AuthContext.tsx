/* Bản quyền trí tuệ thuộc về BroAmStuck */
/* oxlint-disable react/only-export-components */
import React, { createContext, useContext } from 'react';
import type { User } from '../types';
import { isMasterAdmin } from '../config/admin';

export interface AuthContextType {
  currentUser: User | null;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isSuperAdmin: false,
});

export const AuthProvider: React.FC<{
  currentUser: User | null;
  children: React.ReactNode;
}> = ({ currentUser, children }) => {
  const isSuperAdmin = isMasterAdmin(currentUser?.email);
  return (
    <AuthContext.Provider value={{ currentUser, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
