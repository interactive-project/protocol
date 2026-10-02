import { validateGeneratedActivity, parseGeneratedJson, defaultInputLimits, type GenerationContext, type GenerationCatalog } from '@interactive-project/protocol/generation';
declare const catalog: GenerationCatalog;
const context: GenerationContext = { catalog, policy: { execution: false, inputLimits: { maxBytes: 1024 } }, availableDrivers: [],
  validateDomainSchema() { return { valid: true }; },
  validateDomainSemantics() { return { valid: true, requirements: { permissions: [], capabilities: [] } }; }
};
const result = validateGeneratedActivity('{}', context);
if (result.valid) { const type: string = result.activity.type; void type; }
else { const code: string = result.diagnostics[0].code; void code; }
parseGeneratedJson('{}', { maxDepth: defaultInputLimits.maxDepth });
// @ts-expect-error Content cannot inject arbitrary policy permission names.
context.policy = { rootAccess: true };
// @ts-expect-error Validators must be synchronous and side-effect-free.
context.validateDomainSchema = async () => ({ valid: true });
