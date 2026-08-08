import { useMutation, useQueryClient } from "@tanstack/react-query";
import { profileApi } from "../api/profile-api";
import type { ParsedUserDetailFormData } from "../schemas/user-detail-schema";
import type { UserDetailProfile } from "../types/profile-types";
import { profileQueryKeys } from "../utils/query-keys";

interface SaveUserDetailInput {
  userId: number;
  userDetail: UserDetailProfile | null | undefined;
  payload: ParsedUserDetailFormData;
}

export function useSaveUserDetail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, userDetail, payload }: SaveUserDetailInput) => {
      if (userDetail?.id) {
        return profileApi.updateUserDetail(userDetail.id, payload);
      }

      const createPayload = {
        userId,
        ...payload,
      };
      return profileApi.createUserDetail(createPayload);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: profileQueryKeys.detail(variables.userId) });
    },
  });
}
