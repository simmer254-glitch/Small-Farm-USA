// Display: Archivo 700/800. Body: Public Sans 400-700. Loaded via @expo-google-fonts/* in app/_layout.tsx.

export const fonts = {
  displayBold: 'Archivo_700Bold',
  displayExtraBold: 'Archivo_800ExtraBold',
  bodyRegular: 'PublicSans_400Regular',
  bodyMedium: 'PublicSans_500Medium',
  bodySemiBold: 'PublicSans_600SemiBold',
  bodyBold: 'PublicSans_700Bold',
} as const;

export const type = {
  screenTitle: { fontFamily: fonts.displayExtraBold, fontSize: 21, color: '#2c3320', letterSpacing: -0.3 },
  greeting: { fontFamily: fonts.displayExtraBold, fontSize: 21, letterSpacing: -0.3 },
  kidGreeting: { fontFamily: fonts.displayExtraBold, fontSize: 24 },
  sectionLabel: { fontFamily: fonts.bodyBold, fontSize: 13, textTransform: 'uppercase' as const, letterSpacing: 0.8 },
  statNumber: { fontFamily: fonts.displayExtraBold, fontSize: 15 },
  statNumberLg: { fontFamily: fonts.displayExtraBold, fontSize: 19 },
  cardTitle: { fontFamily: fonts.displayExtraBold, fontSize: 19 },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: 13.5 },
  rowTitleSm: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
  rowSub: { fontFamily: fonts.bodyRegular, fontSize: 11.5, color: '#8a8672' },
  rowSubSm: { fontFamily: fonts.bodyRegular, fontSize: 11, color: '#8a8672' },
  chip: { fontFamily: fonts.bodySemiBold, fontSize: 12 },
  body: { fontFamily: fonts.bodyRegular, fontSize: 13.5 },
  helper: { fontFamily: fonts.bodyRegular, fontSize: 12.5, color: '#8a8672' },
  buttonLabel: { fontFamily: fonts.displayBold, fontSize: 15, fontWeight: '700' as const },
  buttonLabelSm: { fontFamily: fonts.bodyBold, fontSize: 13 },
  inputLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#8a8672' },
  inputText: { fontFamily: fonts.bodyRegular, fontSize: 15 },
};
