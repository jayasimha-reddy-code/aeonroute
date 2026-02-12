import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

console.log('[SETUP] jest-dom matchers extended successfully');
console.log('[SETUP] available matchers:', Object.keys(matchers).length);
