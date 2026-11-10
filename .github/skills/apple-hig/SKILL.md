---
name: apple-hig
description: 'Use when designing or reviewing UI against Apple Human Interface Guidelines (HIG): layout, typography, color, dark mode, accessibility, touch targets, navigation (tab bars, sidebars, toolbars), gestures, motion, materials, icons, SF Symbols, iOS/iPadOS/macOS-style patterns, or when asked to make UI feel native/Apple-like.'
argument-hint: 'Component or screen to design/review'
---

# Apple Human Interface Guidelines

Apply Apple HIG principles when building or reviewing UI. For details on a topic, fetch the matching page from the reference table rather than guessing.

## When to Use
- Designing a new component or screen that should feel native on Apple platforms
- Reviewing existing UI for usability, accessibility, or platform consistency
- Choosing navigation structure (tab bar vs sidebar vs toolbar)
- Adapting layout between compact (phone) and regular (tablet/desktop) widths

## Core Principles
- **Clarity**: content first; legible text, precise icons, purposeful decoration only
- **Deference**: UI chrome supports content and stays out of the way
- **Depth**: use layering, materials, and motion to convey hierarchy and context
- **Consistency**: use familiar platform patterns before inventing custom ones

## Review Checklist
1. **Hit targets**: interactive elements are at least 44×44 pt on touch devices
2. **Typography**: clear type hierarchy; text scales with user font-size settings; avoid tiny or light weights for body text
3. **Color**: use semantic/system-like color roles; meet contrast (≥4.5:1 body text); never convey meaning by color alone; support light and dark appearance
4. **Layout**: respect safe areas and notches; consistent margins; adapt between compact and regular widths
5. **Navigation**:
   - Tab bar: 3–5 top-level destinations, always visible, short labels, current tab clearly highlighted
   - Sidebar: for regular widths and many destinations; can replace the tab bar on large screens
   - Don't use navigation controls for actions
6. **Accessibility**: labels for icon-only controls, logical focus order, visible focus, honor reduced motion and reduced transparency
7. **Motion**: brief, purposeful, interruptible; no motion that blocks the user
8. **Feedback**: every action gives an immediate visible response (state change, highlight, progress)
9. **Icons**: consistent stroke weight and size; pair with text where meaning may be ambiguous
10. **Gestures**: standard gestures keep standard meanings; always provide a non-gesture alternative

## Procedure
1. Identify the component type and target platforms/widths
2. Fetch the relevant HIG page(s) from the table below
3. Compare the implementation against the checklist and the fetched guidance
4. Report issues ordered by severity (accessibility > usability > consistency > polish), with concrete fixes

## Reference Pages
| Topic | URL |
|---|---|
| Overview | https://developer.apple.com/design/human-interface-guidelines |
| Design principles | https://developer.apple.com/design/human-interface-guidelines/design-principles |
| Foundations | https://developer.apple.com/design/human-interface-guidelines/foundations |
| Accessibility | https://developer.apple.com/design/human-interface-guidelines/accessibility |
| Color | https://developer.apple.com/design/human-interface-guidelines/color |
| Layout | https://developer.apple.com/design/human-interface-guidelines/layout |
| Materials | https://developer.apple.com/design/human-interface-guidelines/materials |
| Typography | https://developer.apple.com/design/human-interface-guidelines/typography |
| App icons | https://developer.apple.com/design/human-interface-guidelines/app-icons |
| Patterns | https://developer.apple.com/design/human-interface-guidelines/patterns |
| Components | https://developer.apple.com/design/human-interface-guidelines/components |
| Inputs | https://developer.apple.com/design/human-interface-guidelines/inputs |
| Gestures | https://developer.apple.com/design/human-interface-guidelines/gestures |
| Pointing devices | https://developer.apple.com/design/human-interface-guidelines/pointing-devices |
| Designing for macOS | https://developer.apple.com/design/human-interface-guidelines/designing-for-macos |
| Technologies | https://developer.apple.com/design/human-interface-guidelines/technologies |
