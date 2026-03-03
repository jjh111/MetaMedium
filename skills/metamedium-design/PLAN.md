# MetaMedium Design Skill - Planning Document

## Purpose

A skill that helps LLM agents design software following MetaMedium principles:
- **Low/No-Mode Interfaces** - Actions flow from context, not tool selection
- **Gesture-Based Interaction** - Natural, learnable gestures over explicit commands
- **Collaborative Grounding** - Shared semantic substrate between human and AI
- **Composable Libraries** - User-built vocabularies that compound over time
- **Semantic Relationships** - Everything is queryable, connected, meaningful

## Target Users

1. **LLM Agents** designing new software features
2. **Developers** using Claude Code to build interfaces
3. **Designers** thinking through interaction patterns

## Skill Structure

```
skills/metamedium-design/
├── skill.md              # Main skill file (loaded by Claude Code)
├── principles/
│   ├── no-mode.md        # No-mode design principles
│   ├── gestures.md       # Gesture design patterns
│   ├── grounding.md      # Collaborative grounding concepts
│   ├── composition.md    # Composable library patterns
│   └── semantics.md      # Semantic relationship design
├── patterns/
│   ├── selection.md      # Selection without modes
│   ├── recognition.md    # Recognition with fallbacks
│   ├── onboarding.md     # Calibration-style onboarding
│   └── context-menus.md  # Contextual (not modal) UI
├── anti-patterns/
│   ├── mode-switching.md # Why modes break flow
│   ├── hidden-state.md   # Why hidden state confuses
│   └── rigid-grammar.md  # Why fixed commands limit
├── evaluation/
│   └── checklist.md      # Evaluation criteria
└── examples/
    ├── drawing-app.md    # MetaMedium canvas example
    ├── text-editor.md    # Text editing example
    └── data-viz.md       # Data visualization example
```

## Core Content Outline

### 1. Principles (The "Why")

**No-Mode Design**
- Mode = hidden state that changes meaning of actions
- Problem: User must track mental state
- Solution: Context determines action, not prior selection

**Gesture-Based Interaction**
- Gestures are learnable, memorable, fast
- Compound gestures for compound actions
- Personalized through calibration

**Collaborative Grounding**
- Shared vocabulary between human and system
- System learns user's terms, not vice versa
- Mathematical precision + semantic flexibility

**Composable Libraries**
- Everything can be named and reused
- Compositions reference components
- Hierarchies are queryable

**Semantic Relationships**
- Spatial: touching, containing, near
- Temporal: before, after, during
- Logical: based-on, composed-of

### 2. Patterns (The "How")

**Selection Pattern**
- Draw to select (lasso + gesture)
- Context menu appears based on selection
- Actions are verbs applied to selection

**Recognition Pattern**
- Tiered interpretation (fast → accurate)
- Always show confidence
- "Meant something else" escape hatch

**Onboarding Pattern**
- Calibration sequence captures user style
- Minimal time investment (~2-3 min)
- Refine inline, redo if needed

**Context Menu Pattern**
- Appears near action, not in fixed location
- Options based on what's selected
- Dismiss by acting or moving away

### 3. Anti-Patterns (The "What Not")

**Mode Switching**
- Bad: Click "Select Tool" then click objects
- Good: Draw around objects to select

**Hidden State**
- Bad: Clipboard contents invisible
- Good: Show what will be pasted

**Rigid Grammar**
- Bad: Must type exact command syntax
- Good: Natural variations interpreted

### 4. Evaluation Checklist

Questions to ask of any design:
- [ ] Can the user accomplish tasks without switching modes?
- [ ] Does context determine available actions?
- [ ] Can the user build reusable vocabulary?
- [ ] Are relationships explicit and queryable?
- [ ] Does the system learn from corrections?
- [ ] Is there always a way to say "I meant something else"?
- [ ] Are gestures/actions discoverable through exploration?
- [ ] Does calibration happen through use, not configuration?

## Skill Invocation

```
/metamedium-design [subcommand]

Subcommands:
  principles    - Show core design principles
  evaluate      - Evaluate a design against principles
  pattern <name> - Get details on a specific pattern
  anti-pattern  - Show common mistakes to avoid
  example <type> - See example application of principles
```

## Implementation Plan

1. **Create skill.md** - Main entry point with overview
2. **Write principles/** - Core philosophy documents
3. **Write patterns/** - Actionable design patterns
4. **Write anti-patterns/** - What to avoid
5. **Write evaluation/** - Checklist for designs
6. **Write examples/** - Concrete applications
7. **Test with Claude** - Invoke skill, check usefulness

## Success Criteria

- An LLM agent can invoke the skill and get actionable guidance
- The skill helps identify mode-heavy designs
- The skill suggests alternatives following MetaMedium principles
- Designs evaluated with the skill feel more fluid/natural
