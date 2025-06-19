import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  isCollapsed: boolean;
  isMobile: boolean;
  toggle: () => void;
  collapse: () => void;
  expand: () => void;
  setMobile: (mobile: boolean) => void;
}

export const useSidebar = create<SidebarState>()(
  persist(
    (set) => ({
      isCollapsed: false,
      isMobile: false,
      toggle: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
      collapse: () => set({ isCollapsed: true }),
      expand: () => set({ isCollapsed: false }),
      setMobile: (mobile: boolean) => set({ isMobile: mobile }),
    }),
    {
      name: 'sidebar-state',
      partialize: (state) => ({ isCollapsed: state.isCollapsed }), // Only persist collapsed state
    }
  )
);