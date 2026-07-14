import Toast from 'react-native-toast-message';

type ToastType = 'success' | 'error';

export const showToast = (text1: string, text2: string, theme: any, type: ToastType) => {
  const isSuccess = type === 'success';

  Toast.show({
    type,
    text1,
    text2,
    position: 'top',
    topOffset: 30,
    visibilityTime: 2000,
    autoHide: true,
    props: {
      backgroundColor: isSuccess ? theme.successSoft : theme.dangerSoft,
      borderColor: isSuccess ? theme.success : theme.danger,
      textColor: isSuccess ? theme.success : theme.danger,
    },
  });
};
