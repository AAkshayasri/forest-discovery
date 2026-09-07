import { useContext } from 'react';
import { NotificationContext } from '../context/NotificationContext';

export const useToast = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useToast must be used within a NotificationProvider');
  }
  return context;
};

export default useToast;
