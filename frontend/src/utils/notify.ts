import { Id, ToastOptions, TypeOptions, Zoom, toast } from 'react-toastify';

const baseOptions: ToastOptions = {
    transition: Zoom,
    position: 'top-center',
    hideProgressBar: true,
    theme: 'dark',
    icon: false,
    closeOnClick: true,
    pauseOnHover: true,
    pauseOnFocusLoss: false,
};

const withFreshToastId = (options?: ToastOptions): ToastOptions => ({
    ...options,
    toastId:
        options?.toastId ??
        `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
});

export const notify = {
    info: (message: string, options?: ToastOptions) =>
        toast.info(message, {
            ...baseOptions,
            autoClose: 2500,
            ...withFreshToastId(options),
        }),
    success: (message: string, options?: ToastOptions) =>
        toast.success(message, {
            ...baseOptions,
            autoClose: 2200,
            ...withFreshToastId(options),
        }),
    warning: (message: string, options?: ToastOptions) =>
        toast.warning(message, {
            ...baseOptions,
            autoClose: 2800,
            ...withFreshToastId(options),
        }),
    error: (message: string, options?: ToastOptions) =>
        toast.error(message, {
            ...baseOptions,
            autoClose: 3400,
            ...withFreshToastId(options),
        }),
    loading: (message: string, options?: ToastOptions): Id =>
        toast.loading(message, {
            ...baseOptions,
            autoClose: false,
            closeOnClick: false,
            ...withFreshToastId(options),
        }),
    resolve: (id: Id, message: string, type: TypeOptions = 'success') =>
        toast.update(id, {
            render: message,
            type,
            isLoading: false,
            autoClose: type === 'error' ? 3400 : 2200,
            closeOnClick: true,
        }),
    dismiss: (id?: Id) => toast.dismiss(id),
};
