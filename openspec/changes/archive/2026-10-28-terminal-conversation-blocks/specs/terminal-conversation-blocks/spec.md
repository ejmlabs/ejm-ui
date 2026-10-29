# Spec Delta

## Purpose

Let every ejmlabs CLI, in Rust or JavaScript, show a conversation with the same blocks.

## ADDED Requirements

### Requirement: Shared conversation blocks

The contract SHALL define `Message`, `ToolCall` and `CommandMenu` with their states, and each terminal target SHALL implement every state and pass the parity gate.

#### Scenario: A target misses a state

- **WHEN** a terminal target's catalog lacks a contract state of a conversation block
- **THEN** `scripts/parity.mjs --strict` fails

### Requirement: Readable without color

Every message kind and tool call state SHALL start with its own glyph, with distinct ASCII forms, so a transcript reads under `NO_COLOR` and in plain ASCII.

#### Scenario: Plain ASCII terminal

- **WHEN** a host renders the blocks with the ASCII glyph set and no color
- **THEN** every line is ASCII and each kind and state is still distinguishable

### Requirement: Bounded tool output

A finished tool call SHALL show at most four output lines, or eight when failed, followed by the hidden line count, unless the host expands it. Output lines SHALL be cut, never reflowed.

#### Scenario: Long output

- **WHEN** a done tool call has more output lines than its preview
- **THEN** the preview ends with `+N lines` and the host's expand key
