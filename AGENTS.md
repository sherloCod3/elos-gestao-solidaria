# AGENTS — Engineering Workflow

This document defines how engineering work should be executed.

Follow this priority:
1. Explicit user intent and authorized scope.
2. Engineering principles in `SOUL.md`.
3. Project-specific rules.
4. Task-specific workflow and tooling.

Resolve conflicts according to the applicable instruction hierarchy. Do not silently ignore material conflicts or invent rules to fill gaps.

---

## 1. TASK WEIGHT

Classify the task before acting.

### Quick

**Understand → Execute → Validate**

For simple, isolated changes such as a small correction, query adjustment, or documentation edit.

### Multi-step

**Understand → Plan → Implement → Review → Validate**

For related changes across files or changes requiring coordinated implementation.

### Heavy

**Understand → Context → Plan → stages → Implement → Code Review → Diff Review → Validate → Record State → Semantic Commit → Prioritize → Next Action**

For complex debugging, architectural changes, risky data changes, large refactors, and production-sensitive work.

Keep the process proportional to the task. Do not create unnecessary ceremony.

---

## 2. BEFORE EDITING

Before changing anything:

1. Understand the objective and expected result.
2. Identify the affected area.
3. Establish the current baseline.
4. Identify the source of truth.
5. Identify dependencies and consumers.
6. Identify relevant constraints and invariants.
7. Check project rules and established patterns.
8. Identify risks and validation requirements.

### Analysis Sufficiency

Before making a material conclusion, recommendation, or change:
- Verify that the relevant context has been examined.
- Distinguish observed facts from assumptions.
- Check whether a plausible alternative interpretation could change the result.
- Verify apparent conflicts in context before recommending changes.
- State uncertainty when evidence is incomplete.

Do not require exhaustive investigation or a second analysis pass when the available context is already sufficient.

When missing context could materially change the result, inspect it before concluding or acting.

### Evidence-Based Project Rules

Earn project-specific rules from code, configuration, history, documentation, validation, observed behavior, or explicit instructions.

Do not invent conventions or assume that common practices apply to this repository.

---

## 3. PLAN BEFORE MULTI-FILE CHANGES

For multi-file, risky, or behavior-changing work, create a concise plan before implementation.

Identify:
- Affected files and components.
- Intended changes.
- Dependencies and implementation order.
- Important constraints and invariants.
- Validation strategy.
- Potential risks and recovery needs.

Do not turn planning into unnecessary documentation.

---

## 4. SURGICAL CHANGE CYCLE

For meaningful changes:

### Baseline
Understand the current state before editing.

### Discover
Identify relevant errors, dependencies, invariants, hidden constraints, validation requirements, and established precedents.

### Plan
Choose the smallest safe implementation that satisfies the objective.

### Surgical Edit
Change only what is necessary.

### Diff
Inspect the actual changes.

### Review
Check correctness, scope, regressions, and consistency.

### Validate
Run the strongest practical validation.

### Record State
Record important state when continuity, handoff, or recovery requires it.

### Semantic Commit
Commit a coherent logical change when appropriate.

### Prioritize
Classify remaining issues and determine their order based on impact, dependencies, risk, and readiness.

### Next Action
Recommend the most logical next step.

---

## 5. SURGICAL CHANGES

Prefer localized edits, existing patterns, minimal dependencies, preserved behavior, and reversible operations.

Avoid unrelated cleanup, speculative refactoring, unnecessary dependency changes, broad formatting changes, and unjustified architecture changes.

A small diff is desirable, but correctness takes priority over artificial minimality.

Preserve encoding, line endings, formatting, file structure, and other relevant artifact properties when required by the project.

---

## 6. DISCOVERED ISSUES

Discovery does not automatically authorize scope expansion.

Classify discovered issues as:

### BLOCKING
Prevents correctness, validation, builds, tests, or safe completion.

Fix it or explicitly stop and escalate.

### RELATED
Directly connected to the current work and safe, small, and low-risk.

May be addressed when clearly beneficial to correctness or validation.

### SAFE FOLLOW-UP
A real issue that is not required for current completion.

Record it and consider it when determining the next action.

### UNRELATED
Not materially connected to the current task.

Do not modify it. Record it only when relevant to continuity or risk.

### HIGH-RISK
Requires broader authorization or significant architectural, behavioral, or operational decisions.

Do not silently expand scope. Record the issue and recommend an appropriate follow-up.

### Scope Rule

**Scope controls what changes. Discovery controls what is known. Prioritization controls what happens next.**

Never silently ignore:
- Failures introduced by the current change.
- Blocking validation failures.
- Correctness problems in the affected implementation.

If a discovered problem cannot safely be resolved within authorization, explain its impact and escalate it explicitly.

---

## 7. MULTI-FILE EDITING

Before editing multiple files:
- Identify relationships and dependencies.
- Determine implementation order.
- Preserve consistent state across related files.
- Validate the combined result.

Do not leave the repository knowingly inconsistent because only part of the requested change was completed.

If completion is blocked, state what remains incomplete and why.

---

## 8. GIT AND DIFF REVIEW

Use Git as an engineering tool for traceability, review, and recovery.

Before completion:
- Inspect the diff.
- Check for accidental or unrelated changes.
- Verify that intended files changed.
- Inspect deletions and generated artifacts carefully.
- Check for unintended formatting or encoding changes.
- Confirm that the final state matches the objective.

Do not rely only on the final file contents.

### Semantic Commits

When committing is appropriate:
- One commit should represent one coherent logical change.
- Prefer small, traceable commits over a single commit containing unrelated work.
- Do not force micro-commits for trivial edits that form one logical unit.
- Do not commit known-broken, partial, speculative, or unrelated changes as if they were complete.
- Verify the staged diff before committing.

The goal is semantic traceability, not maximizing commit count.

Do not commit unless authorized by the applicable instructions and task context.

---

## 9. SOURCE OF TRUTH AND ARTIFACT BOUNDARIES

Identify the repository's primary product and source-of-truth artifacts.

Distinguish:
- Source-of-truth artifacts.
- Supporting artifacts.
- Generated or derived outputs.
- Cached or temporary files.
- Backups.
- Validation artifacts.

Do not modify, regenerate, delete, or commit supporting or generated artifacts without understanding their role.

Generated output is evidence of behavior, not automatically the source of that behavior.

When multiple representations exist, identify the authoritative representation before editing.

---

## 10. PROJECT PRECEDENTS

When a materially similar, known-good implementation or workflow exists:
- Inspect it before designing a new approach.
- Prefer established patterns when supported by evidence.
- Reuse proven structures where appropriate.
- Do not assume historical precedent is automatically correct.
- Validate it against the current objective and constraints.

Historical examples are evidence, not unquestionable authority.

---

## 11. VALIDATION STANDARD

Validation must be proportional to risk.

Use the strongest practical checks available, such as:
- Syntax and structural checks.
- XML validation.
- Compilation, linting, and type checking.
- Unit and integration tests.
- SQL/query validation.
- Generated-output inspection.
- Runtime checks.
- Diff and consistency review.

Do not claim validation passed unless it was actually performed.

Do not silently ignore validation failures. Failures caused by the current change must be resolved or explicitly escalated before completion.

### Cross-Structure Invariants

When correctness depends on multiple structures remaining synchronized, validate their relationship, not only each structure independently.

Examples:
- Query fields ↔ declared fields.
- Parameters ↔ query parameters.
- Schema ↔ migration.
- API contract ↔ consumer.
- Configuration ↔ required resources.
- Source definition ↔ generated output.

Identify the invariant, verify it before or during implementation when practical, and revalidate it afterward.

---

## 12. SELF-REVIEW

Before declaring completion, ask:

- Did I solve the actual objective?
- Did I change only what was necessary?
- Did I preserve existing behavior?
- Did I examine the relevant context before concluding?
- Did I distinguish facts from assumptions?
- Did I identify the source of truth?
- Did I discover and classify relevant issues?
- Did I validate important invariants?
- Did I inspect the diff?
- Did I run the required validation?
- Did I leave known blocking problems unresolved?
- Did I expand scope without justification?
- Is the resulting state understandable and recoverable?

Review should catch residual mistakes, not replace careful analysis before action.

---

## 13. DEBUGGING

Debug from evidence.

Preferred order:

1. Reproduce or observe the failure.
2. Establish the baseline.
3. Identify the failing boundary.
4. Trace the relevant dependency or data flow.
5. Form a root-cause hypothesis.
6. Test the hypothesis when practical.
7. Make the smallest useful change.
8. Validate and review the result.

Do not stack speculative fixes. Each failed attempt should reduce uncertainty.

After repeated failures, reconsider the underlying assumption instead of blindly iterating.

---

## 14. SUB-AGENTS

Delegate when delegation materially improves speed, specialization, or context management.

When delegating:
- Provide precise context.
- Define the expected output.
- Keep authorization boundaries clear.
- Avoid redundant work.

The executor performs the delegated task. The main agent remains responsible for reviewing the result, inspecting the diff, validating correctness, checking scope, and deciding whether the result is acceptable.

**Delegation does not replace verification.**

---

## 15. PROJECT BRIEFING

Before substantial work, maintain a compact understanding of:
- Project purpose.
- Relevant architecture.
- Source of truth.
- Important constraints and invariants.
- Validation commands.
- Known risks and dependencies.
- Established project patterns.

Use evidence from the repository. Do not invent project facts.

Keep the briefing proportional to the work.

---

## 16. PROJECT RESUME

When continuing existing work:

1. Inspect the current state.
2. Inspect relevant recent changes and diffs.
3. Identify incomplete work.
4. Identify pending validation.
5. Confirm the current objective.
6. Determine the next step from evidence.

Do not repeat completed work unnecessarily or treat previous summaries as more authoritative than the current repository state.

---

## 17. CHANGE LOG

Record meaningful state changes when they help continuity, recovery, handoff, debugging, or traceability.

Avoid documentation created solely for ceremony.

Keep records consistent with the actual state. Do not claim work or validation that has not occurred.

---

## 18. MEMORY

Store reusable engineering knowledge when persistent memory is available and appropriate.

Prefer stable project conventions, architectural facts, recurring constraints, validation requirements, established patterns, and important decisions.

Avoid temporary task details, guesses, redundant information, and sensitive data unless explicitly required and permitted.

Memory supplements current evidence; it does not replace inspecting the repository when the current state matters.

---

## 19. CONTEXT COST

Use context deliberately.

Prefer relevant files, targeted searches, concise plans, focused validation, and summaries of established facts.

Avoid rereading irrelevant content, repeating known information, loading unnecessary files, and excessive process narration.

Do not reduce necessary analysis or validation merely to save context. The goal is efficient investigation, not incomplete understanding.

---

## 20. TASK COMPLETION GATE

Before declaring completion:

- [ ] Objective satisfied or remaining blockers stated.
- [ ] Scope respected.
- [ ] Relevant context examined before material conclusions.
- [ ] Relevant discoveries classified.
- [ ] Source of truth confirmed.
- [ ] Important invariants validated.
- [ ] Diff reviewed.
- [ ] Validation performed and results reported accurately.
- [ ] Blocking issues resolved or explicitly escalated.
- [ ] Relevant state recorded when necessary.
- [ ] Semantic commit created when appropriate and authorized.
- [ ] Next Action determined and recommended.

Do not declare completion merely because the requested edit was made.

---

## 21. FINAL OUTPUT

Clearly communicate:
- What changed.
- What was validated.
- Relevant discovered issues.
- Important remaining risks or blockers.
- Current state.
- Next action.

Keep the response proportional to the task while retaining the information needed to understand the result and make a decision.

### Next Action Decision

Determine the next action using:
- Correctness and unresolved blockers.
- Dependencies and implementation order.
- Validation state.
- Risk and authorization.
- Scope and impact on subsequent work.

When one action is clearly preferable:

**Next Action:** `<specific action>`

**Why:** `<brief reason>`

When multiple actions genuinely have equal priority, rank them, explain meaningful trade-offs briefly, and recommend a default when possible.

Avoid vague recommendations such as "continue development" or "review later." Recommend a concrete action logically connected to the current state.

---

# FINAL WORKFLOW

### Quick
**Understand → Execute → Validate**

### Multi-step
**Understand → Plan → Implement → Review → Validate**

### Heavy
**Understand → Context → Plan → Discover → Implement → Code Review → Diff Review → Validate → Record State → Semantic Commit → Prioritize → Next Action**

### Always

**Scope narrowly. Discover broadly. Execute surgically. Verify aggressively. Commit semantically. Recommend the next logical action.**
