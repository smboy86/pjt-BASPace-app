import { TextInput, View, Text, TextInputProps } from 'react-native';

interface IInputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
  labelClassName?: string;
  inputClassName?: string;
}

export function Input({
  label,
  error,
  style,
  className,
  labelClassName,
  inputClassName,
  ...props
}: IInputProps): React.JSX.Element {
  return (
    <View className={`w-full ${className || ''}`}>
      {label && (
        <Text className={`text-sm font-medium text-text-muted mb-1 ${labelClassName || ''}`}>
          {label}
        </Text>
      )}
      <TextInput
        style={style}
        className={`
          bg-surface dark:bg-surface-dark 
          rounded-2xl px-4 py-3
          text-primary dark:text-primary-dark
          border ${error ? 'border-red-500' : 'border-transparent'}
          ${inputClassName || ''}
        `}
        placeholderTextColor="#A1A1AA"
        {...props}
      />
      {error && <Text className="text-xs text-red-500 mt-1">{error}</Text>}
    </View>
  );
}
