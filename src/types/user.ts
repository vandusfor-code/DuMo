export interface User {
  id: string;
  name: string;
  role: string;
  email: string;
  username?: string;
  avatarUrl: string;
  /** Estado operativo (solo asesoras): 'disponible' | 'bano' | 'almuerzo' | 'desconectado'. */
  presenceStatus?: string | null;
}
