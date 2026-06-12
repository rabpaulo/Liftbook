import Toast from 'react-native-toast-message';


export const showToast = (text1: string, theme: any, text2?: string) => {
  Toast.show({
    type: 'customToast',
    text1: text1,
    text2: text2,
    position: 'bottom',
    bottomOffset: 100,
    visibilityTime: 2000,
    autoHide: true,
    props: { backgroundColor: theme.backgroundElement, textColor: theme.text }, 
  });
};