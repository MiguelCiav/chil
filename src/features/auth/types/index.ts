import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: 'El correo electrónico es requerido' })
    .email({ message: 'Ingrese un correo electrónico válido' }),
  password: z
    .string()
    .min(1, { message: 'La contraseña es requerida' })
    .min(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
});

export type LoginCredentials = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, { message: 'El nombre completo debe tener al menos 2 caracteres' })
      .max(100, { message: 'El nombre completo no puede exceder 100 caracteres' }),
    email: z
      .string()
      .trim()
      .min(1, { message: 'El correo electrónico es requerido' })
      .email({ message: 'Ingrese un correo electrónico válido' }),
    password: z
      .string()
      .min(1, { message: 'La contraseña es requerida' })
      .min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
    confirm_password: z
      .string()
      .min(1, { message: 'Debe confirmar la contraseña' })
  })
  .refine(data => data.password === data.confirm_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_password']
  });

export type RegisterCredentials = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: 'El correo electrónico es requerido' })
    .email({ message: 'Ingrese un correo electrónico válido' })
});

export type ForgotPasswordParams = z.infer<typeof forgotPasswordSchema>;

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (data: LoginCredentials) => Promise<void>;
  register: (data: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}
