import { useMutation } from "@tanstack/react-query";
import { apiInstance } from "../../api";
import { toast } from "react-toastify";
import { geocode } from "../../models/geocode";
import { AxiosError } from "axios";
import { useCenterStore } from "../store/useCenterStore";

const geocodeAddress = async (address: string) => {
    const response = await apiInstance.get<geocode>('/geocode', {
        params: { address },
    });
    return response.data;
};

export const useLocateAddress = () => {
    const setCenter = useCenterStore((state) => state.setCenter);

    return useMutation({
        mutationFn: (address: string) => geocodeAddress(address),
        onSuccess: (data) => {
            if (data) {
                setCenter({ lat: data.latitude, lng: data.longitude });
            }
        },
        onError: (error: AxiosError) => {
            toast(`Failed to locate address: ${error}`);
        },
    });
};

