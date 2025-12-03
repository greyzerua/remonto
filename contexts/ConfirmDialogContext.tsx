import React, { createContext, useContext, useState, ReactNode } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface ConfirmDialogContextType {
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | undefined>(undefined);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [dialogState, setDialogState] = useState<{
    visible: boolean;
    options: ConfirmOptions | null;
    resolve: ((value: boolean) => void) | null;
  }>({
    visible: false,
    options: null,
    resolve: null,
  });

  const showConfirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        visible: true,
        options,
        resolve,
      });
    });
  };

  const handleConfirm = () => {
    setDialogState((prevState) => {
      if (prevState.resolve) {
        prevState.resolve(true);
      }
      return {
        visible: false,
        options: null,
        resolve: null,
      };
    });
  };

  const handleCancel = () => {
    setDialogState((prevState) => {
      if (prevState.resolve) {
        prevState.resolve(false);
      }
      return {
        visible: false,
        options: null,
        resolve: null,
      };
    });
  };

  return (
    <ConfirmDialogContext.Provider value={{ showConfirm }}>
      {children}
      {dialogState.options && (
        <ConfirmDialog
          visible={dialogState.visible}
          title={dialogState.options.title}
          message={dialogState.options.message}
          confirmText={dialogState.options.confirmText}
          cancelText={dialogState.options.cancelText}
          type={dialogState.options.type}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);
  if (context === undefined) {
    throw new Error('useConfirmDialog must be used within a ConfirmDialogProvider');
  }
  return context;
}

