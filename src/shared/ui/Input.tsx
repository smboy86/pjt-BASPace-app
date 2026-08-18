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
        <Text className={`mb-1 text-sm font-medium text-ink-600 ${labelClassName || ''}`}>
          {label}
        </Text>
      )}
      <TextInput
        style={style}
        className={`
          bg-white
          rounded-2xl px-4 py-3
          text-ink-900
          border ${error ? 'border-red-500' : 'border-stone-100'}
          ${inputClassName || ''}
        `}
        placeholderTextColor="#667085"
        {...props}
      />
      {error && <Text className="mt-1 text-xs text-red-500">{error}</Text>}
    </View>
  );
}
