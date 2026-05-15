import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';

type ScreenPlaceholderProps = {
  description: string;
  title: string;
};

export function ScreenPlaceholder({ description, title }: ScreenPlaceholderProps) {
  return (
    <View className='flex-1 items-center justify-center bg-lightGreen px-6'>
      <StatusBar style='dark' />

      <View className='max-w-[320px] gap-3 rounded-3xl bg-white px-6 py-8'>
        <Text className='text-center text-3xl font-bold text-mainText'>
          {title}
        </Text>
        <Text className='text-center text-base leading-6 text-mainText/80'>
          {description}
        </Text>
      </View>
    </View>
  );
}
