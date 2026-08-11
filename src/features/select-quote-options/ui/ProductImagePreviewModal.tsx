import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { IQuoteOptionProduct } from '@/entities/quote-option';

interface IProductImagePreviewModalProps {
  product: IQuoteOptionProduct | null;
  onClose: () => void;
}

export function ProductImagePreviewModal({
  product,
  onClose,
}: IProductImagePreviewModalProps): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoading(Boolean(product?.url));
    setHasError(false);
  }, [product]);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      statusBarTranslucent
      visible={product !== null}
    >
      <SafeAreaView
        accessibilityViewIsModal
        className="flex-1 bg-black"
        edges={['top', 'right', 'bottom', 'left']}
      >
        <View className="min-h-14 flex-row items-center justify-between px-4">
          <Text className="flex-1 text-base font-bold text-white" numberOfLines={1}>
            {product?.name ?? '제품 이미지'}
          </Text>
          <Pressable
            accessibilityLabel="제품 이미지 상세보기 닫기"
            accessibilityRole="button"
            className="ml-3 h-11 w-11 items-center justify-center rounded-full bg-white/15 active:bg-white/25"
            onPress={onClose}
          >
            <Ionicons color="#FFFFFF" name="close" size={28} />
          </Pressable>
        </View>

        <View className="flex-1 items-center justify-center">
          {product?.url && !hasError ? (
            <Image
              accessibilityLabel={`${product.name} 상세 이미지`}
              className="h-full w-full"
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
              onLoad={() => setIsLoading(false)}
              onLoadStart={() => setIsLoading(true)}
              resizeMode="contain"
              source={{ uri: product.url }}
            />
          ) : (
            <View accessibilityRole="alert" className="items-center px-8">
              <Ionicons color="#FFFFFF" name="image-outline" size={44} />
              <Text className="mt-4 text-center text-base font-semibold text-white">
                이미지를 불러오지 못했어요.
              </Text>
              <Text className="mt-2 text-center text-sm leading-5 text-white/70">
                상세보기를 닫고 잠시 후 다시 시도해 주세요.
              </Text>
            </View>
          )}

          {isLoading && (
            <View
              accessibilityLabel="제품 상세 이미지 불러오는 중"
              accessibilityRole="progressbar"
              className="absolute inset-0 items-center justify-center bg-black/30"
            >
              <ActivityIndicator color="#FFFFFF" size="large" />
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
