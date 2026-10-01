/* oxlint-disable react/only-export-components */
import React, { createContext, useContext } from 'react';
import type { User } from '../types';

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
  const isSuperAdmin = currentUser?.email === 'anhtuantran0512@gmail.com';
  return (
    <AuthContext.Provider value={{ currentUser, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
