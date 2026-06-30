import React from 'react';
import { LegalTextScreen } from './LegalTextScreen';
import { TERMS_OF_SERVICE } from '../../constants/legal';

export function TermsScreen() {
  return <LegalTextScreen content={TERMS_OF_SERVICE} />;
}
