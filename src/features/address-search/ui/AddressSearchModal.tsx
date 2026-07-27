import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { IPostcodeSearchResult } from '../types';
import { PostcodeSearchView } from './PostcodeSearchView';

interface IAddressSearchModalProps {
  onClose: () => void;
  onConfirm: (address: string) => void;
  visible: boolean;
}

const getSelectedAddress = (result: IPostcodeSearchResult): string =>
  result.userSelectedType === 'R'
    ? result.roadAddress || result.address
    : result.jibunAddress || result.address;

export function AddressSearchModal({
  onClose,
  onConfirm,
  visible,
}: IAddressSearchModalProps): React.JSX.Element {
  const [selectedAddress, setSelectedAddress] = useState('');
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedAddress('');
      setHasLoadError(false);
    }
  }, [visible]);

  const handleSelected = useCallback((result: IPostcodeSearchResult): void => {
    setSelectedAddress(getSelectedAddress(result));
  }, []);

  const handleError = useCallback((): void => {
    setHasLoadError(true);
  }, []);

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center justify-between border-b border-stone-100 px-4 py-3">
          <Pressable
            accessibilityLabel="주소 검색 닫기"
            className="h-11 w-11 items-center justify-center rounded-full active:bg-stone-50"
            onPress={onClose}
          >
            <Ionicons color="#25302E" name="close" size={24} />
          </Pressable>
          <Text className="text-lg font-bold text-ink-900">주소 입력</Text>
          <View className="h-11 w-11" />
        </View>

        <View className="flex-1">
          {hasLoadError ? (
            <View className="flex-1 items-center justify-center px-6">
              <Text className="text-center text-sm leading-6 text-red-600">
                주소 검색창을 불러오지 못했어요. 네트워크를 확인한 뒤 다시 열어 주세요.
              </Text>
            </View>
          ) : (
            <PostcodeSearchView onError={handleError} onSelected={handleSelected} />
          )}
        </View>

        <View className="border-t border-stone-100 px-5 pb-3 pt-4">
          <Text className="mb-3 min-h-6 text-sm text-ink-600">
            {selectedAddress || '검색 결과에서 주소를 선택해 주세요.'}
          </Text>
          <Pressable
            accessibilityLabel="선택한 주소 확인"
            className={`min-h-12 items-center justify-center rounded-2xl ${
              selectedAddress ? 'bg-brand-900 active:opacity-80' : 'bg-stone-100'
            }`}
            disabled={!selectedAddress}
            onPress={() => onConfirm(selectedAddress)}
          >
            <Text className={`font-bold ${selectedAddress ? 'text-white' : 'text-ink-500'}`}>
              확인
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
