import React from 'react';

export default function ArtistIntroStep({ active, children }) {
  if (!active) return null;
  return children;
}
