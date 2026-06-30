import React from 'react';
import { LegalTextScreen } from './LegalTextScreen';
import { PRIVACY_POLICY } from '../../constants/legal';

export function PrivacyPolicyScreen() {
  return <LegalTextScreen content={PRIVACY_POLICY} />;
}
