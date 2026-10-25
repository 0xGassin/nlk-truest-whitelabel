---
description: Feature module structure guidelines for the nulink-cloud frontend
---

# Feature Module Structure

All feature modules in `src/features/` should follow this structure:

```
features/<name>/
├── components/      # React components (required)
├── hooks/           # Custom hooks (if needed)
├── utils/           # Helper functions (if needed)
└── index.ts         # Barrel exports (required)
```

## Guidelines

1. **Barrel exports** — Every feature must have an `index.ts` that exports all public APIs
2. **Extracted columns** — Table components should extract column definitions to `columns.tsx`
3. **Filter hooks** — Table filtering logic should be extracted to `hooks/use-*-filters.ts`
4. **Shared utilities** — Generic utilities should go in `src/lib/`, feature-specific in `utils/`

## Examples

- `features/issues/` — Has extracted `columns.tsx` and `use-issue-filters.ts` ✓
- `features/containers/` — Has extracted `columns.tsx` and `use-container-filters.ts` ✓
- `features/connectors/` — Has `hooks/`, `utils/`, proper exports ✓

## When to extract

- **Extract to lib/** — Date formatting, generic utilities used across 2+ features
- **Extract to feature/hooks/** — State management used in 2+ components within feature
- **Extract to feature/utils/** — Helper functions specific to the feature domain
