import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export interface UserProfile {
  uuid:           string;
  name:           string;
  email:          string;
  phone:          string | null;
  accountState:   string;
  kycStatus:      string;
  investorType:   string;
  dateOfBirth:    string | null;
  iban:           string | null;
  marketingOptin: boolean;
  country:        string | null;
  emailVerified:  boolean;
}

export const profileKeys = {
  me: ['profile', 'me'] as const,
};

export function useProfile() {
  return useQuery({
    queryKey: profileKeys.me,
    queryFn:  () => apiClient.get<UserProfile>('/profile'),
    staleTime: 60 * 1000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Pick<UserProfile, 'name' | 'phone' | 'iban' | 'marketingOptin'>>) =>
      apiClient.patch<{ updated: boolean }>('/profile', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.me }),
  });
}
