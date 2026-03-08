---
id: spec_01KJNCFCTG7ENR1NRGHBHYV2DW
title: Configurable cost estimation defaults in config.yaml
type: feature
status: completed
version: 0.1.0
priority: medium
---

# Configurable cost estimation in config.yaml

## Goal

Let teams customize how dark estimates agent costs. The current hardcoded heuristic ($0.05/min, 4K tokens/min) is a rough guess that varies wildly based on model choice, prompt complexity, and tool usage patterns. A team running Opus agents at $15/MTok has very different costs than one running Haiku at $0.25/MTok.

The config should let a team set their own cost model so budget tracking is meaningful from day one, and so cost estimates improve as the team learns their actual spend patterns.

## Context

Current state in `src/pipeline/engine.ts`:
```typescript
// estimateCostIfMissing() — hardcoded heuristic
const estimatedCost = Math.max(0.01, elapsedMin * 0.05); // ~$0.05/min
const estimatedTokens = Math.round(elapsedMin * 4000);   // ~4K tokens/min
```

Current config in `src/types/config.ts` has no cost section. The `build.budget_usd` exists but there's no way to tune the estimation model.

## Requirements

### Config Schema (`src/types/config.ts`)
Add a `cost` section to `DfConfig`:

```yaml
# .df/config.yaml
cost:
  # Model pricing (used for token-based cost calculation)
  model: "sonnet"                    # Default model name (for display)
  input_cost_per_mtok: 3.00          # $/million input tokens
  output_cost_per_mtok: 15.00        # $/million output tokens
  cache_read_cost_per_mtok: 0.30     # $/million cached input tokens

  # Elapsed-time estimation fallback (when token counts unavailable)
  cost_per_minute: 0.05              # $/min estimated cost when no token data
  tokens_per_minute: 4000            # estimated tokens/min for elapsed-time fallback

  # Role-specific overrides (optional — override the defaults per role)
  roles:
    architect:
      cost_per_minute: 0.03          # Architects do less tool use, cheaper
    builder:
      cost_per_minute: 0.08          # Builders do heavy tool use, more expensive
    evaluator:
      cost_per_minute: 0.04          # Read-heavy, moderate cost
```

### Defaults
Provide sensible defaults matching Sonnet 4 pricing:
- `input_cost_per_mtok`: 3.00
- `output_cost_per_mtok`: 15.00
- `cache_read_cost_per_mtok`: 0.30
- `cost_per_minute`: 0.05
- `tokens_per_minute`: 4000
- No role overrides by default

### Engine Integration (`src/pipeline/engine.ts`)
Update `estimateCostIfMissing()` to read from config:
- Use `config.cost.cost_per_minute` (or role-specific override if set)
- Use `config.cost.tokens_per_minute` for token estimation
- When actual token counts are available (from `--cost`/`--tokens` flags), use `input_cost_per_mtok` and `output_cost_per_mtok` to calculate precise cost

### CLI Display
When `dark status` shows cost, include the model name from config:
```
run_01XYZ  running  phase=build  $1.27/$20.00 (sonnet est.)
```

The `(sonnet est.)` suffix signals these are estimates, not actual API costs. When agents self-report real costs via `--cost`, drop the suffix.

### Preset Profiles
Support a `profile` shorthand that sets all pricing fields at once:

```yaml
cost:
  profile: "opus"   # Sets all pricing to Opus 4 rates
```

Profiles:
- `sonnet` — $3/$15 per MTok (default)
- `opus` — $15/$75 per MTok
- `haiku` — $0.25/$1.25 per MTok
- `custom` — use explicit values (the default when individual fields are set)

Profile values can be overridden by explicit fields:
```yaml
cost:
  profile: "opus"
  cost_per_minute: 0.20    # Override the per-minute estimate
```

## Contracts

- `CostConfig`: `{ model, input_cost_per_mtok, output_cost_per_mtok, cache_read_cost_per_mtok, cost_per_minute, tokens_per_minute, roles? }`
- `getCostPerMinute(config, role)`: Returns the cost/min for a given role (role override > default)
- `getTokensPerMinute(config, role)`: Returns the tokens/min for a given role
- `resolveCostProfile(profile)`: Returns full CostConfig for a profile name

## Scenarios

### Functional

1. **Default config works**: No `cost` section in config.yaml. Engine uses Sonnet defaults ($0.05/min). Verify cost estimation produces the same values as the current hardcoded heuristic.

2. **Custom cost_per_minute**: Set `cost.cost_per_minute: 0.20` in config.yaml. Run a build. Verify agents' estimated costs are 4x higher than default.

3. **Role-specific override**: Set `cost.roles.builder.cost_per_minute: 0.10`. Run a build with architect and builder. Verify architect uses default rate, builder uses override.

4. **Profile shorthand**: Set `cost.profile: "opus"`. Verify all pricing fields resolve to Opus rates. Override one field — verify the override takes precedence.

5. **Status display**: Run `dark status` with profile set. Verify output includes model name indicator.

### Changeability

1. **Add new profile**: Adding a "gpt-4o" profile should require only adding an entry to the profiles map, no other changes needed.
