import { getMissingBuildMessage } from '@/tests/helpers/site';

// L6 reads a finished build; say once what to run instead of failing every rule.
const message = getMissingBuildMessage();
if (message) throw new Error(message);
