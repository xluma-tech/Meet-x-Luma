export enum UserRole {
  HOST = 'host',
  COHOST = 'cohost',
  PARTICIPANT = 'participant',
  GUEST = 'guest',
}

export interface Permission {
  canStartMeeting: boolean;
  canEndMeeting: boolean;
  canMuteParticipants: boolean;
  canRemoveParticipants: boolean;
  canShareScreen: boolean;
  canChat: boolean;
  canUseCamera: boolean;
  canUseMicrophone: boolean;
  canInviteParticipants: boolean;
  canManageCohosts: boolean;
}

export const rolePermissions: Record<UserRole, Permission> = {
  [UserRole.HOST]: {
    canStartMeeting: true,
    canEndMeeting: true,
    canMuteParticipants: true,
    canRemoveParticipants: true,
    canShareScreen: true,
    canChat: true,
    canUseCamera: true,
    canUseMicrophone: true,
    canInviteParticipants: true,
    canManageCohosts: true,
  },
  [UserRole.COHOST]: {
    canStartMeeting: false,
    canEndMeeting: false,
    canMuteParticipants: true,
    canRemoveParticipants: true,
    canShareScreen: true,
    canChat: true,
    canUseCamera: true,
    canUseMicrophone: true,
    canInviteParticipants: true,
    canManageCohosts: false,
  },
  [UserRole.PARTICIPANT]: {
    canStartMeeting: false,
    canEndMeeting: false,
    canMuteParticipants: false,
    canRemoveParticipants: false,
    canShareScreen: true,
    canChat: true,
    canUseCamera: true,
    canUseMicrophone: true,
    canInviteParticipants: false,
    canManageCohosts: false,
  },
  [UserRole.GUEST]: {
    canStartMeeting: false,
    canEndMeeting: false,
    canMuteParticipants: false,
    canRemoveParticipants: false,
    canShareScreen: false,
    canChat: true,
    canUseCamera: true,
    canUseMicrophone: true,
    canInviteParticipants: false,
    canManageCohosts: false,
  },
};

export function getPermissions(role: UserRole): Permission {
  return rolePermissions[role];
}

export function hasPermission(role: UserRole, permission: keyof Permission): boolean {
  return rolePermissions[role][permission];
}
