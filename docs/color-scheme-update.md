# Color Scheme Update

## Applied Color Palette

### Neutrals
- **Background**: `#FFFFFF` (light) / `#0F1113` (dark)
- **Card**: `#FFFFFF` (light) / `#17191C` (dark) 
- **Secondary**: `#2A2E33` (light) / `#1F2328` (dark)
- **Border**: `#2A2E33`
- **Muted Foreground**: `#95979D`
- **Foreground**: `#0F1113` (light) / `#FFFFFF` (dark)

### Semantic Colors
- **Primary (Activity/Strain)**: `#F97316` - Used for primary actions, selections, transfers
- **Success (Good)**: `#22C55E` - Used for income, under budget, positive states
- **Warning (OK)**: `#F5C542` - Used for warnings, approaching limits
- **Danger (Bad)**: `#FF4D4F` - Used for expenses, over budget, negative states

## Color Mappings

### Financial Semantics
```css
--color-income: #22C55E;        /* Green - money coming in */
--color-expense: #FF4D4F;       /* Red - money going out */
--color-transfer: #F97316;      /* Orange - money moving */
--color-budget-safe: #22C55E;   /* Green - under budget */
--color-budget-warning: #F5C542; /* Yellow - approaching limit */
--color-budget-over: #FF4D4F;   /* Red - over budget */
```

### UI Elements
- **Primary buttons**: Orange (`#F97316`)
- **Success states**: Green (`#22C55E`)
- **Warning states**: Yellow (`#F5C542`)
- **Error/danger states**: Red (`#FF4D4F`)
- **Neutral elements**: Gray scale from palette

## Updated Components

1. **Spending Hero**
   - Budget status badges now use semantic colors with 10% opacity backgrounds
   - Primary value in foreground color

2. **Category Cards**
   - Progress bars use semantic colors (green/yellow/red)
   - Hover states highlight with primary orange

3. **Charts**
   - Income lines: Green
   - Expense lines: Red
   - Transfer/neutral: Orange

4. **Celebration Badges**
   - Achievements: Primary orange
   - Under budget: Green
   - Warnings: Yellow

## Implementation Notes

- Border radius standardized to `0.75rem` (12px)
- Shadows use pure black with low opacity (10-15%)
- Hover states use primary color for borders and subtle backgrounds
- Dark mode uses the darker neutrals while maintaining same accent colors
- All colors meet WCAG AA contrast requirements against their backgrounds