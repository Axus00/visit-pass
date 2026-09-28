import {
  Building2,
  CalendarClock,
  ClipboardList,
  DoorOpen,
  FileSpreadsheet,
  History,
  Home,
  type LucideIcon,
  ScanLine,
  Settings,
  Star,
  Ticket,
  UserPlus,
  Users,
} from 'lucide-react';

import type * as VisitPass from '#modules/visit-pass';

export type NavItem = {
  to: string;
  label: string;
  /** Shorter label for the mobile bottom bar. */
  shortLabel: string;
  icon: LucideIcon;
  /** Only the first entries fit in the mobile bottom bar. */
  showOnMobile: boolean;
  exact?: boolean;
};

export const NAVIGATION = {
  resident: [
    {
      to: '/app/m/$membershipId/residente',
      label: 'Inicio',
      shortLabel: 'Inicio',
      icon: Home,
      showOnMobile: true,
      exact: true,
    },
    {
      to: '/app/m/$membershipId/residente/autorizaciones',
      label: 'Autorizaciones',
      shortLabel: 'Pases',
      icon: Ticket,
      showOnMobile: true,
    },
    {
      to: '/app/m/$membershipId/residente/favoritos',
      label: 'Favoritos',
      shortLabel: 'Favoritos',
      icon: Star,
      showOnMobile: true,
    },
    {
      to: '/app/m/$membershipId/residente/historial',
      label: 'Historial de visitas',
      shortLabel: 'Historial',
      icon: History,
      showOnMobile: true,
    },
  ],
  porter: [
    {
      to: '/app/m/$membershipId/porteria',
      label: 'Inicio',
      shortLabel: 'Inicio',
      icon: Home,
      showOnMobile: true,
      exact: true,
    },
    {
      to: '/app/m/$membershipId/porteria/escanear',
      label: 'Escanear Pase',
      shortLabel: 'Escanear',
      icon: ScanLine,
      showOnMobile: true,
    },
    {
      to: '/app/m/$membershipId/porteria/registro',
      label: 'Registro manual',
      shortLabel: 'Registro',
      icon: UserPlus,
      showOnMobile: true,
    },
    {
      to: '/app/m/$membershipId/porteria/dentro',
      label: 'Visitantes dentro',
      shortLabel: 'Dentro',
      icon: DoorOpen,
      showOnMobile: true,
    },
    {
      to: '/app/m/$membershipId/porteria/turnos',
      label: 'Turnos y reportes',
      shortLabel: 'Turnos',
      icon: CalendarClock,
      showOnMobile: true,
    },
  ],
  administrator: [
    {
      to: '/app/m/$membershipId/admin',
      label: 'Inicio',
      shortLabel: 'Inicio',
      icon: Home,
      showOnMobile: true,
      exact: true,
    },
    {
      to: '/app/m/$membershipId/admin/visitas',
      label: 'Visitas',
      shortLabel: 'Visitas',
      icon: ClipboardList,
      showOnMobile: true,
    },
    {
      to: '/app/m/$membershipId/admin/membresias',
      label: 'Membresías',
      shortLabel: 'Personas',
      icon: Users,
      showOnMobile: true,
    },
    {
      to: '/app/m/$membershipId/admin/turnos',
      label: 'Turnos',
      shortLabel: 'Turnos',
      icon: CalendarClock,
      showOnMobile: true,
    },
    {
      to: '/app/m/$membershipId/admin/apartamentos',
      label: 'Apartamentos',
      shortLabel: 'Aptos',
      icon: Building2,
      showOnMobile: false,
    },
    {
      to: '/app/m/$membershipId/admin/reportes',
      label: 'Reportes de turno',
      shortLabel: 'Reportes',
      icon: FileSpreadsheet,
      showOnMobile: false,
    },
    {
      to: '/app/m/$membershipId/admin/ajustes',
      label: 'Ajustes',
      shortLabel: 'Ajustes',
      icon: Settings,
      showOnMobile: false,
    },
  ],
} as const satisfies Record<VisitPass.Role, ReadonlyArray<NavItem>>;
