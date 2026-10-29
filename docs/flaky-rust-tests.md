# Rust test reliability

The Rust reliability workflow runs on main and daily. It runs the ejm-tui tests
twice through Cargo and twice through cargo-nextest 0.9.124. It names any test
with both a pass and a failure and fails if any run fails or evidence is
incomplete. It runs doctests separately. The human-admitted PR gate is unchanged.

To reproduce, install the pinned runner with
`cargo install --locked --version 0.9.124 cargo-nextest`, then from
`crates/ejm-tui` run `python3 ../../scripts/flake_check.py /tmp/ui-rust-flakes`
using a new output directory. Reports and logs are kept locally; the workflow
keeps the Actions log. Nextest runs each test in a separate process, so the
ordinary Cargo runs remain necessary to catch shared-process interference.

Nextest 0.9.124 omits ignored tests from its JUnit reports. Tests reported in
only one attempt make the comparison incomplete; tests omitted from both
are not classified or counted as passes.
