import Toast from 'react-native-toast-message';


export const showToast = (text1: string, text2: string, theme: any, type: string) => {
  Toast.show({
    type: type,
    text1: text1,
    text2: text2,
    position: 'top',
    topOffset: 30,
    visibilityTime: 2000,
    autoHide: true,
    props: { 
      backgroundColor: theme.backgroundElement,
       textColor: theme.text
    }, 
  });
};