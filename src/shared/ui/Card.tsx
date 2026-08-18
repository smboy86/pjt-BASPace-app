import { View, ViewStyle } from 'react-native';
import { ReactNode } from 'react';

interface ICardProps {
  children: ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'glass';
  className?: string;
}

export function Card({
  children,
  style,
  variant = 'default',
  className,
}: ICardProps): React.JSX.Element {
  const baseStyle = 'rounded-2xl p-4';
  const variantStyle =
    variant === 'glass'
      ? 'border border-stone-100 bg-white shadow-md'
      : 'border border-stone-100 bg-white shadow-sm';

  return (
    <View style={style} className={`${baseStyle} ${variantStyle} ${className || ''}`}>
      {children}
    </View>
  );
}
