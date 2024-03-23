import { BaseToast, ErrorToast, SuccessToast, ToastProps } from 'react-native-toast-message';

export const toastConfig = {
  info: (props: ToastProps) => (
    <BaseToast
      {...props}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: "600",
      }}
      text2Style={{
        fontSize: 15,
        fontWeight: "500",
      }}
    />
  ),
  error: (props: ToastProps) => (
    <ErrorToast
      {...props}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: "600",
      }}
      text2Style={{
        fontSize: 15,
        fontWeight: "400",
      }}
    />
  ),
  success: (props: ToastProps) => (
    <SuccessToast
      {...props}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: "600",
      }}
      text2Style={{
        fontSize: 15,
        fontWeight: "400",
      }}
    />
  ),
};
