import { create } from 'zustand';

export type TUserRole = 'customer' | 'partner' | 'admin';

export interface IDemoUser {
  id: string;
  name: string;
  role: TUserRole;
  companyName?: string;
}

interface IDemoSessionState {
  user: IDemoUser | null;
  selectRole: (role: TUserRole) => void;
  signOut: () => void;
}

const ROLE_USERS: Record<TUserRole, IDemoUser> = {
  customer: { id: 'customer-1', name: '김소담', role: 'customer' },
  partner: { id: 'partner-1', name: '박시공', role: 'partner', companyName: '그린바스 성동점' },
  admin: { id: 'admin-1', name: '이관리', role: 'admin', companyName: '바스페이스 운영팀' },
};

export const useDemoSessionStore = create<IDemoSessionState>()((set) => ({
  user: null,
  selectRole: (role) => set({ user: ROLE_USERS[role] }),
  signOut: () => set({ user: null }),
}));
