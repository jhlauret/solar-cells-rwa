import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KycStatus {
  state:          string;
  level?:         string;
  expires_at?:    string;
  submitted_at?:  string;
  validated_at?:  string;
  document_count?: number;
}

export interface KycCase {
  uuid:  string;
  state: string;
  name:  string;
}

export interface UploadDocumentInput {
  caseUuid:     string;
  documentType: string;
  file:         File;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const kycKeys = {
  status: ['kyc', 'status'] as const,
  case:   ['kyc', 'case']   as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useKycStatus() {
  return useQuery({
    queryKey: kycKeys.status,
    queryFn:  () => apiClient.get<KycStatus>('/kyc/status'),
    staleTime: 30 * 1000,
  });
}

export function useStartKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<KycCase>('/kyc/start'),
    onSuccess:  () => qc.invalidateQueries({ queryKey: kycKeys.status }),
  });
}

export function useSavePersonalInfo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      dateOfBirth:  string;
      nationality:  string;
      phone:        string;
      iban?:        string;
    }) => apiClient.post<{ updated: boolean }>('/kyc/personal-info', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: kycKeys.status }),
  });
}

export function useSaveSourceOfFunds() {
  return useMutation({
    mutationFn: (data: { fundSource: string; monthlyIncome: string }) =>
      apiClient.post<{ saved: boolean }>('/kyc/source-of-funds', data),
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ caseUuid, documentType, file }: UploadDocumentInput) => {
      const fd = new FormData();
      fd.append('caseUuid',     caseUuid);
      fd.append('documentType', documentType);
      fd.append('file',         file);
      return apiClient.upload<{ documentUuid: string; sha256: string }>('/kyc/upload-document', fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: kycKeys.status }),
  });
}

export function useSubmitKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (caseUuid: string) =>
      apiClient.post<{ submitted: boolean }>('/kyc/submit', { caseUuid }),
    onSuccess: () => qc.invalidateQueries({ queryKey: kycKeys.status }),
  });
}
