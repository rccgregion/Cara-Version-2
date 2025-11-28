import React from 'react';
import { UserProfile } from './types';

export const UserContext = React.createContext<{
  user: UserProfile;
  addXp: (amount: number) => void;
  completeTask: (task: string) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
}>({
  user: {
    name: "Guest",
    role: "Professional",
    level: 1,
    xp: 0,
    streak: 0,
    dailyGoal: false,
    hasOnboarded: false
  },
  addXp: () => {},
  completeTask: () => {},
  updateProfile: () => {}
});