import { z } from "zod";

export const signUpSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, "공개 이름은 2자 이상이어야 합니다.")
      .max(20, "공개 이름은 20자 이하여야 합니다."),
    email: z.string().trim().email("올바른 이메일 형식이 아닙니다."),
    password: z
      .string()
      .min(8, "비밀번호는 8자 이상이어야 합니다.")
      .max(72, "비밀번호는 72자 이하여야 합니다."),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["passwordConfirm"],
  });

export const loginSchema = z.object({
  email: z.string().trim().email("올바른 이메일 형식이 아닙니다."),
  password: z.string().min(1, "비밀번호를 입력하세요."),
});

export const profileUpdateSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "공개 이름은 2자 이상이어야 합니다.")
    .max(20, "공개 이름은 20자 이하여야 합니다."),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
