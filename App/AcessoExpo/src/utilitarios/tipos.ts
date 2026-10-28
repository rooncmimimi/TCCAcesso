import type { ComponentRef } from 'react';
import type { TextInput } from 'react-native';

/**
 * Instância de um campo de texto (para chamar `focus()`). O React Native 0.88 exporta
 * `TextInputInstance`, mas o 0.86 (SDK 57, o do Expo Go da loja) não; este tipo vale nos dois.
 */
export type TextInputInstance = ComponentRef<typeof TextInput>;
