import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mapFirebaseUser,
  mapAuthError,
  loginWithEmail,
  registerWithEmail,
  logoutUser,
  resetPasswordEmail,
  getCurrentUser,
  onAuthStateChangedListener
} from '../index';
import * as firebaseAuth from 'firebase/auth';

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  onAuthStateChanged: vi.fn()
}));

vi.mock('../../../../lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
  functions: {}
}));

describe('Auth API module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mapFirebaseUser', () => {
    it('returns null when user is null', () => {
      expect(mapFirebaseUser(null)).toBeNull();
    });

    it('maps Firebase user fields accurately', () => {
      const mockUser = {
        uid: 'user-123',
        email: 'test@scouts.org.ve',
        displayName: 'Scout User',
        photoURL: 'https://example.com/photo.jpg'
      } as firebaseAuth.User;

      const result = mapFirebaseUser(mockUser);
      expect(result).toEqual({
        uid: 'user-123',
        email: 'test@scouts.org.ve',
        displayName: 'Scout User',
        photoURL: 'https://example.com/photo.jpg'
      });
    });
  });

  describe('mapAuthError', () => {
    it('maps known Firebase Auth errors to user-friendly Spanish messages', () => {
      expect(mapAuthError({ code: 'auth/user-not-found' })).toBe('No existe una cuenta con este correo electrónico.');
      expect(mapAuthError({ code: 'auth/wrong-password' })).toBe('Correo electrónico o contraseña incorrectos.');
      expect(mapAuthError({ code: 'auth/invalid-credential' })).toBe('Correo electrónico o contraseña incorrectos.');
      expect(mapAuthError({ code: 'auth/email-already-in-use' })).toBe('Ya existe una cuenta registrada con este correo electrónico.');
      expect(mapAuthError({ code: 'auth/weak-password' })).toBe('La contraseña debe tener al menos 6 caracteres.');
      expect(mapAuthError({ code: 'auth/invalid-email' })).toBe('El formato del correo electrónico no es válido.');
      expect(mapAuthError({ code: 'auth/too-many-requests' })).toBe('Demasiados intentos fallidos. Por favor, inténtelo de nuevo más tarde.');
      expect(mapAuthError({ code: 'auth/network-request-failed' })).toBe('Error de red. Verifique su conexión a internet.');
      expect(mapAuthError({ code: 'auth/user-disabled' })).toBe('Esta cuenta ha sido deshabilitada.');
    });

    it('falls back to custom message or default message for unexpected errors', () => {
      expect(mapAuthError(new Error('Custom error message'))).toBe('Custom error message');
      expect(mapAuthError(null)).toBe('Ha ocurrido un error inesperado.');
    });
  });

  describe('loginWithEmail', () => {
    it('successfully logs in and returns mapped AuthUser', async () => {
      const mockUserCredential = {
        user: {
          uid: 'uid-456',
          email: 'login@test.com',
          displayName: 'Login User',
          photoURL: null
        }
      } as firebaseAuth.UserCredential;

      vi.mocked(firebaseAuth.signInWithEmailAndPassword).mockResolvedValueOnce(mockUserCredential);

      const result = await loginWithEmail({
        email: 'login@test.com',
        password: 'password123'
      });

      expect(firebaseAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'login@test.com',
        'password123'
      );
      expect(result).toEqual({
        uid: 'uid-456',
        email: 'login@test.com',
        displayName: 'Login User',
        photoURL: null
      });
    });

    it('throws formatted error when signInWithEmailAndPassword rejects', async () => {
      vi.mocked(firebaseAuth.signInWithEmailAndPassword).mockRejectedValueOnce({
        code: 'auth/invalid-credential'
      });

      await expect(
        loginWithEmail({ email: 'wrong@test.com', password: 'bad' })
      ).rejects.toThrow('Correo electrónico o contraseña incorrectos.');
    });
  });

  describe('registerWithEmail', () => {
    it('creates user and updates display name', async () => {
      const mockUser = {
        uid: 'uid-new',
        email: 'register@test.com',
        displayName: 'New Scout',
        photoURL: null
      } as firebaseAuth.User;

      vi.mocked(firebaseAuth.createUserWithEmailAndPassword).mockResolvedValueOnce({
        user: mockUser
      } as firebaseAuth.UserCredential);
      vi.mocked(firebaseAuth.updateProfile).mockResolvedValueOnce();

      const result = await registerWithEmail({
        full_name: 'New Scout',
        email: 'register@test.com',
        password: 'password123',
        confirm_password: 'password123'
      });

      expect(firebaseAuth.createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'register@test.com',
        'password123'
      );
      expect(firebaseAuth.updateProfile).toHaveBeenCalledWith(mockUser, {
        displayName: 'New Scout'
      });
      expect(result.email).toBe('register@test.com');
    });

    it('throws formatted error when registration fails', async () => {
      vi.mocked(firebaseAuth.createUserWithEmailAndPassword).mockRejectedValueOnce({
        code: 'auth/email-already-in-use'
      });

      await expect(
        registerWithEmail({
          full_name: 'Scout',
          email: 'exists@test.com',
          password: 'secret',
          confirm_password: 'secret'
        })
      ).rejects.toThrow('Ya existe una cuenta registrada con este correo electrónico.');
    });
  });

  describe('logoutUser', () => {
    it('calls signOut successfully', async () => {
      vi.mocked(firebaseAuth.signOut).mockResolvedValueOnce();
      await expect(logoutUser()).resolves.toBeUndefined();
      expect(firebaseAuth.signOut).toHaveBeenCalled();
    });

    it('throws mapped error if signOut fails', async () => {
      vi.mocked(firebaseAuth.signOut).mockRejectedValueOnce(new Error('Sign out error'));
      await expect(logoutUser()).rejects.toThrow('Sign out error');
    });
  });

  describe('resetPasswordEmail', () => {
    it('calls sendPasswordResetEmail successfully', async () => {
      vi.mocked(firebaseAuth.sendPasswordResetEmail).mockResolvedValueOnce();
      await expect(resetPasswordEmail('scout@test.com')).resolves.toBeUndefined();
      expect(firebaseAuth.sendPasswordResetEmail).toHaveBeenCalledWith(expect.anything(), 'scout@test.com');
    });

    it('throws mapped error when reset fails', async () => {
      vi.mocked(firebaseAuth.sendPasswordResetEmail).mockRejectedValueOnce({
        code: 'auth/user-not-found'
      });
      await expect(resetPasswordEmail('scout@test.com')).rejects.toThrow(
        'No existe una cuenta con este correo electrónico.'
      );
    });
  });

  describe('getCurrentUser', () => {
    it('returns null if no currentUser in auth', () => {
      expect(getCurrentUser()).toBeNull();
    });
  });

  describe('onAuthStateChangedListener', () => {
    it('subscribes callback to onAuthStateChanged', () => {
      const mockUnsubscribe = vi.fn();
      vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementationOnce((_auth, cb) => {
        // simulate callback with user
        (cb as (user: unknown) => void)({
          uid: 'u-1',
          email: 'test@scouts.org.ve',
          displayName: 'Test',
          photoURL: null
        });
        return mockUnsubscribe;
      });

      const callback = vi.fn();
      const unsub = onAuthStateChangedListener(callback);

      expect(callback).toHaveBeenCalledWith({
        uid: 'u-1',
        email: 'test@scouts.org.ve',
        displayName: 'Test',
        photoURL: null
      });
      expect(unsub).toBe(mockUnsubscribe);
    });
  });
});
