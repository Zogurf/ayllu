import { Alert, Platform } from 'react-native';

// En react-native-web Alert.alert no hace nada: estos helpers funcionan en web y móvil.
const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

/** Mensaje informativo. Se resuelve cuando la persona lo cierra. */
export function notify(title: string, message?: string): Promise<void> {
  if (isWeb) {
    window.alert(message ? `${title}\n\n${message}` : title);
    return Promise.resolve();
  }
  return new Promise(resolve => {
    Alert.alert(title, message, [{ text: 'Aceptar', onPress: () => resolve() }], {
      cancelable: false,
      onDismiss: () => resolve(),
    });
  });
}

/** Confirmación. Devuelve true solo si la persona acepta. */
export function confirmAction(
  title: string,
  message?: string,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
): Promise<boolean> {
  if (isWeb) {
    return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
  }
  return new Promise(resolve => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmText, onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
