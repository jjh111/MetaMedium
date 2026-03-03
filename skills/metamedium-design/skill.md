<metamedium-design>

# MetaMedium Design Skill

You are now equipped to help design **low/no-mode software** following MetaMedium principles. This skill helps you create interfaces where actions flow from context rather than tool selection, where users build personal vocabularies, and where the system learns from use.

## Core Philosophy

**The MetaMedium Principle**: The interface should be a collaborative medium where human intent and machine capability meet on shared ground—not a control panel where humans issue commands to a machine.

### The Five Pillars

1. **No-Mode Design** - Context determines action, not prior tool selection
2. **Gesture-Based Interaction** - Natural, learnable actions over explicit commands
3. **Collaborative Grounding** - Shared vocabulary that grows through use
4. **Composable Libraries** - User-built primitives that compound into complex structures
5. **Semantic Relationships** - Everything is connected, queryable, meaningful

---

## Quick Reference

### Mode vs No-Mode

| Mode-Based (Avoid) | No-Mode (Prefer) |
|-------------------|------------------|
| Select tool, then act | Act directly, tool inferred |
| Hidden state changes meaning | Context determines meaning |
| Must remember current mode | Current state visible |
| Actions require setup | Actions are immediate |

### The Gesture Principle

Instead of: `Click button → Select item → Click action`
Prefer: `Draw gesture that implies action on items`

**Example**: Selection
- Mode-based: Click "Select Tool", click items, click "Group"
- No-mode: Draw circle around items + checkmark → "Group" appears as option

### The Grounding Principle

The system and user share:
- **Vocabulary**: Named shapes, compositions, patterns
- **Relationships**: Touching, containing, near, based-on
- **History**: What was done, what was learned

The LLM interprets. The grounding makes interpretation actionable.

---

## Design Patterns

### Pattern: Contextual Selection

**Problem**: User needs to select things and act on them
**Mode-based solution**: Selection tool, then action menu
**No-mode solution**:

```
1. User draws gesture that encloses items (lasso)
2. Gesture includes action hint (checkmark tail = confirm)
3. System shows contextual options based on what's selected
4. User acts or dismisses by moving away
```

**Key insight**: The selection gesture itself can carry intent.

### Pattern: Recognition with Escape Hatch

**Problem**: System interprets user input, might be wrong
**Rigid solution**: User must use exact syntax
**No-mode solution**:

```
1. System interprets with confidence levels
2. Top interpretation offered, alternatives visible
3. "Meant something else" always available
4. Corrections teach the system
```

**Key insight**: Interpretation should be confident but never final.

### Pattern: Calibration Onboarding

**Problem**: System needs to learn user's style
**Configuration solution**: Settings panel with options
**No-mode solution**:

```
1. Brief calibration sequence (~2-3 min)
2. User performs natural actions (like "quick brown fox")
3. System captures personal patterns
4. Refinement happens inline through use
```

**Key insight**: Learn from demonstration, not configuration.

### Pattern: Composable Vocabulary

**Problem**: User does same complex action repeatedly
**Macro solution**: Record sequence, assign hotkey
**No-mode solution**:

```
1. User creates composition from selected items
2. Names it in their vocabulary ("molecule")
3. System recognizes pattern next time
4. Composition is queryable ("count molecules")
```

**Key insight**: Named things become building blocks.

---

## Anti-Patterns to Avoid

### Anti-Pattern: Tool Palette

**Symptom**: Row of tool buttons, one must be "active"
**Problem**: Hidden state (which tool is selected?)
**Alternative**: Gestures imply tools, or context provides relevant actions

### Anti-Pattern: Modal Dialogs

**Symptom**: Popup blocks all other interaction
**Problem**: Forces completion or cancellation
**Alternative**: Inline, contextual UI that coexists with canvas

### Anti-Pattern: Command Syntax

**Symptom**: Must type exact command format
**Problem**: Recall burden, no exploration
**Alternative**: Natural variations interpreted, suggestions offered

### Anti-Pattern: Separate Config

**Symptom**: Settings live in different screen/mode
**Problem**: Disconnect between configuration and use
**Alternative**: Calibration through use, inline refinement

---

## Evaluation Checklist

When reviewing a design, ask:

### Flow
- [ ] Can tasks complete without explicit mode switches?
- [ ] Does context (selection, location, history) inform available actions?
- [ ] Are gestures discoverable through exploration?

### Learning
- [ ] Can users build personal vocabulary?
- [ ] Does the system learn from corrections?
- [ ] Is there always "meant something else"?

### Grounding
- [ ] Is interpretation visible (not hidden)?
- [ ] Are relationships explicit and queryable?
- [ ] Can users ask "what is this?" / "why this?"

### Composition
- [ ] Can simple things combine into complex things?
- [ ] Do compositions preserve semantics of components?
- [ ] Can hierarchies be navigated and queried?

---

## Applying to Your Design

When asked to design an interface or feature:

1. **Identify the nouns**: What objects does the user work with?
2. **Identify the verbs**: What actions apply to those objects?
3. **Map context → action**: How does selection/location/history suggest relevant actions?
4. **Design gestures**: What natural movements could trigger actions?
5. **Plan the vocabulary**: What will users name and reuse?
6. **Consider failures**: How does "I meant something else" work?
7. **Evaluate against checklist**: Does it feel like direct manipulation or command-and-control?

---

## Examples

### Drawing Application (MetaMedium Canvas)

- **No-mode selection**: Circle + check gesture selects enclosed shapes
- **Recognition**: Strokes interpreted as shapes, confidence shown
- **Composition**: Save selected shapes as named composition
- **Query**: "Count all circles" works even inside compositions

### Text Editor (Hypothetical)

- **No-mode formatting**: Draw underline gesture under text = underline
- **Recognition**: Handwritten annotations interpreted as formatting
- **Composition**: Save formatted block as "callout" style
- **Query**: "Find all callouts" / "Where did I use bold?"

### Data Visualization (Hypothetical)

- **No-mode binding**: Drag data field onto axis = bind
- **Recognition**: Sketch of chart type → system refines
- **Composition**: Save chart as "sales dashboard" component
- **Query**: "What data feeds into this chart?"

---

## Summary

Design interfaces where:

1. **Actions flow from context**, not tool selection
2. **Gestures are natural** and learnable
3. **Vocabulary grows** through use
4. **Everything is composable** and queryable
5. **Corrections teach** rather than punish

The goal is **collaborative grounding**: a shared space where human intent meets machine capability, and both become more powerful through the partnership.

</metamedium-design>
