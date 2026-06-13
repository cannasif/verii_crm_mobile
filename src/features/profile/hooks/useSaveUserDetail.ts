import { useMutation, useQueryClient } from "@tanstack/react-query";
import { profileApi } from "../api/profileApi";
import type { ParsedUserDetailFormData } from "../schemas/userDetailSchema";
import type { UserDetailProfile } from "../types";

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
      queryClient.invalidateQueries({ queryKey: ["profile", "detail", variables.userId] });
    },
  });
}
