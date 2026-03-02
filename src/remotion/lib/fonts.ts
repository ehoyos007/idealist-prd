import { loadFont as loadSpaceGrotesk } from '@remotion/google-fonts/SpaceGrotesk';
import { loadFont as loadSpaceMono } from '@remotion/google-fonts/SpaceMono';

const spaceGrotesk = loadSpaceGrotesk();
const spaceMono = loadSpaceMono();

export const fontSans = spaceGrotesk.fontFamily;
export const fontMono = spaceMono.fontFamily;
