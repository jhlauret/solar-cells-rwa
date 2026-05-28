import { useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export function useSendVerification() {
  return useMutation({
    mutationFn: (partnerUuid: string) =>
      apiClient.post<{ expires_at: string }>('/auth/send-verification', { partnerUuid }),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: ({ partnerUuid, otp }: { partnerUuid: string; otp: string }) =>
      apiClient.post<{ activated: boolean }>('/auth/verify-email', { partnerUuid, otp }),
  });
}
