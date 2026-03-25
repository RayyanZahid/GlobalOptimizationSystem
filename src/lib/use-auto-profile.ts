'use client';

import { useState, useEffect } from 'react';
import { UserInputs } from './types';

interface AutoProfileData {
  country?: string;
  state?: string;
  city?: string;
  zip?: string;
  income?: number;
  housing?: 'apartment' | 'house' | 'large_house';
  transport?: 'transit' | 'car' | 'suv' | 'frequent_flyer';
  householdSize?: number;
  medianRooms?: number;
  commuteMode?: string;
  heatingFuel?: string;
  gridRegion?: string;
  confidence: number;
  sources: string[];
}

export function useAutoProfile() {
  const [autoProfile, setAutoProfile] = useState<AutoProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auto-profile')
      .then(res => res.json())
      .then(data => {
        setAutoProfile(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Convert auto profile to UserInputs format
  const asUserInputs = (): UserInputs => {
    if (!autoProfile) return {};
    return {
      country: autoProfile.country,
      income: autoProfile.income,
      housing: autoProfile.housing,
      transport: autoProfile.transport,
    };
  };

  return { autoProfile, loading, asUserInputs };
}
