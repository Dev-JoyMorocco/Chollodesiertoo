import type {Config} from '@react-router/dev/config';
import {hydrogenPreset} from '@shopify/hydrogen/react-router-preset';

/**
 * Hydrogen's official preset: app/ and dist/ folders, server rendering, and the
 * React Router features Hydrogen's context needs (middleware, route splitting).
 */
export default {
  presets: [hydrogenPreset()],
} satisfies Config;
