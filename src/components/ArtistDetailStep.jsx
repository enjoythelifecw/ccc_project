import React from 'react';

export default function ArtistDetailStep({ active, children }) {
  if (!active) return null;
  return children;
}
