## Packages
framer-motion | Page transitions and smooth micro-interactions for a premium feel
date-fns | Formatting transaction dates
clsx | Utility for conditional classes
tailwind-merge | Utility for merging tailwind classes safely
react-hook-form | Form handling for checkout
@hookform/resolvers | Zod resolver for form validation
lucide-react | Icons (already in base stack, but explicitly noting usage for category mapping)

## Notes
- Mocking user ID to 1 for API calls as requested.
- Wrapping the main app layout in a mobile-constrained container (max-w-md) to give a native app feel on desktop browsers.
- Price and balance are assumed to be in IDR (Rupiah) base units.
- Icons are mapped dynamically from the 'icon' string field in the categories table.
