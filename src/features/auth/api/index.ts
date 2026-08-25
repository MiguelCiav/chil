import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
  Unsubscribe
} from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import { AuthUser, LoginCredentials, RegisterCredentials } from '../types';

export function mapFirebaseUser(user: User | null): AuthUser | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL
  };
}

export function mapAuthError(error: unknown): string {
  if (!error) return 'Ha ocurrido un error inesperado.';
  const code = (error as { code?: string })?.code;
  const message = (error as Error)?.message || '';

  switch (code) {
    case 'auth/user-not-found':
      return 'No existe una cuenta con este correo electrónico.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Correo electrónico o contraseña incorrectos.';
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta registrada con este correo electrónico.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/invalid-email':
      return 'El formato del correo electrónico no es válido.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos. Por favor, inténtelo de nuevo más tarde.';
    case 'auth/network-request-failed':
      return 'Error de red. Verifique su conexión a internet.';
    case 'auth/user-disabled':
      return 'Esta cuenta ha sido deshabilitada.';
    default:
      return message || 'Ha ocurrido un error al procesar su solicitud.';
  }
}

export async function loginWithEmail(credentials: LoginCredentials): Promise<AuthUser> {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      credentials.email.trim(),
      credentials.password
    );
    const mapped = mapFirebaseUser(userCredential.user);
    if (!mapped) throw new Error('Error al obtener los datos de la sesión.');
    return mapped;
  } catch (error) {
    const errorMsg = mapAuthError(error);
    throw new Error(errorMsg, { cause: error });
  }
}

export async function registerWithEmail(data: RegisterCredentials): Promise<AuthUser> {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.email.trim(),
      data.password
    );
    if (data.full_name) {
      await updateProfile(userCredential.user, {
        displayName: data.full_name.trim()
      });
    }
    const mapped = mapFirebaseUser(userCredential.user);
    if (!mapped) throw new Error('Error al inicializar los datos del usuario.');
    return mapped;
  } catch (error) {
    const errorMsg = mapAuthError(error);
    throw new Error(errorMsg, { cause: error });
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    const errorMsg = mapAuthError(error);
    throw new Error(errorMsg, { cause: error });
  }
}

export async function resetPasswordEmail(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error) {
    const errorMsg = mapAuthError(error);
    throw new Error(errorMsg, { cause: error });
  }
}

export function getCurrentUser(): AuthUser | null {
  return mapFirebaseUser(auth.currentUser);
}

export function onAuthStateChangedListener(
  callback: (user: AuthUser | null) => void
): Unsubscribe {
  return onAuthStateChanged(auth, (user) => {
    callback(mapFirebaseUser(user));
  });
}
