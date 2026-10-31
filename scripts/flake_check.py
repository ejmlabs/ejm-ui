#!/usr/bin/env python3
"""Compare independent nextest reports without turning a failure green."""

import json
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from collections.abc import Iterable
from pathlib import Path


def report_results(path: Path) -> tuple[dict[tuple[str, str], str], bool]:
    # shortcut: Reports over 50 MiB are refused; raise this bound if suites exceed it.
    if path.stat().st_size > 50 * 1024 * 1024:
        raise ValueError("test report exceeds 50 MiB")
    root = ET.parse(path).getroot()
    if root.tag != "testsuites":
        raise ValueError("not a nextest JUnit report")
    results = {}
    invalid = set()
    incomplete = False
    all_results = []
    for suite in root.findall("testsuite"):
        suite_name = suite.get("name")
        if not suite_name:
            incomplete = True
            invalid.update(
                (case.get("classname"), case.get("name")) for case in suite.findall("testcase")
            )
            continue
        suite_results = []
        for case in suite.findall("testcase"):
            name = case.get("name")
            states = [child.tag for child in case if child.tag in ("failure", "error", "skipped")]
            status = states[0] if states else "passed"
            suite_results.append(status)
            all_results.append(status)
            if not name:
                incomplete = True
                continue
            key = (suite_name, name)
            if case.get("classname") != suite_name:
                invalid.add((case.get("classname"), name))
                invalid.add(key)
            if key in results or len(states) > 1 or any(
                child.tag.startswith(("flaky", "rerun")) for child in case
            ):
                invalid.add(key)
            results[key] = status
        try:
            check_counts(suite, suite_results)
        except ValueError:
            incomplete = True
    if not results:
        incomplete = True
    try:
        check_counts(root, all_results)
    except ValueError:
        incomplete = True
    for key in invalid:
        results.pop(key, None)
    return results, incomplete or bool(invalid)


def check_counts(element: ET.Element, statuses: Iterable[str]) -> None:
    counts = Counter(statuses)
    expected = {
        "tests": sum(counts.values()),
        "failures": counts["failure"],
        "errors": counts["error"],
        "skipped": counts["skipped"],
    }
    for key, value in expected.items():
        # Older nextest omits the skipped count when it emits no skipped cases.
        if key == "skipped" and key not in element.attrib and value == 0:
            continue
        try:
            actual = int(element.attrib[key])
        except (KeyError, ValueError) as error:
            raise ValueError(f"missing or invalid {key} count") from error
        if actual != value:
            raise ValueError(f"{key} count does not match reported tests")


def inventory(path: Path) -> tuple[set[tuple[str, str]], set[tuple[str, str]], bool]:
    data = json.loads(path.read_text(encoding="utf-8"))
    try:
        tests = set()
        skipped = set()
        incomplete = False
        for suite_name, suite in data["rust-suites"].items():
            try:
                listed = suite["status"] == "listed"
                cases = suite["testcases"].items()
            except (KeyError, TypeError, AttributeError):
                incomplete = True
                continue
            incomplete |= not listed
            for name, case in cases:
                key = (suite_name, name)
                tests.add(key)
                try:
                    matches = case["ignored"] is False and case["filter-match"]["status"] == "matches"
                except (KeyError, TypeError):
                    matches = False
                if not listed or not matches:
                    skipped.add(key)
                    incomplete = True
        if not tests or data["test-count"] != len(tests):
            incomplete = True
        return tests, skipped, incomplete
    except (KeyError, TypeError, AttributeError) as error:
        raise ValueError("invalid nextest inventory") from error


def check_cargo_log(path: Path) -> None:
    summaries = re.findall(
        r"^test result: (?:ok|FAILED)\. \d+ passed; \d+ failed; (\d+) ignored; "
        r"\d+ measured; (\d+) filtered out;", path.read_text(encoding="utf-8"), re.MULTILINE
    )
    if not summaries or any(int(ignored) or int(filtered) for ignored, filtered in summaries):
        raise ValueError("Cargo test evidence is missing or contains skipped tests")


def run(command: list[str], log: Path, *, separate_stderr: bool = False) -> int | None:
    with log.open("w", encoding="utf-8") as stream:
        try:
            process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=None if separate_stderr else subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
            )
        except OSError as error:
            print(f"Could not start {command[0]}: {error}", file=stream)
            return None
        assert process.stdout is not None
        for line in process.stdout:
            sys.stdout.write(line)
            sys.stdout.flush()
            stream.write(line)
            stream.flush()
        return process.wait()


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("usage: python3 scripts/flake_check.py OUTPUT_DIRECTORY")
    output = Path(sys.argv[1]).resolve()
    output.mkdir()
    baseline = []
    attempts = []
    listings = []
    for number in (1, 2):
        baseline.append(
            run(
                ["cargo", "test", "--locked", "--workspace", "--no-fail-fast", "--color", "never"],
                output / f"cargo-test-{number}.log",
            )
        )
        report = output / f"attempt-{number}.xml"
        config = output / f"attempt-{number}.toml"
        config.write_text(
            "[profile.ci.junit]\npath = "
            + json.dumps(str(report))
            + '\nstore-failure-output = false\n',
            encoding="utf-8",
        )
        listings.append(
            run(
                ["cargo", "nextest", "list", "--locked", "--workspace", "--message-format", "json",
                 "--profile", "ci", "--config-file", str(config), "--user-config-file", "none"],
                output / f"inventory-{number}.json",
                separate_stderr=True,
            )
        )
        attempts.append(
            run(
                [
                    "cargo",
                    "nextest",
                    "run",
                    "--locked",
                    "--workspace",
                    "--no-fail-fast",
                    "--retries",
                    "0",
                    "--color",
                    "never",
                    "--profile",
                    "ci",
                    "--config-file",
                    str(config),
                    "--user-config-file",
                    "none",
                    "--no-tests",
                    "fail",
                ],
                output / f"attempt-{number}.log",
            )
        )
    incomplete = any(code is None for code in baseline) or any(
        code not in (0, 100) for code in attempts
    ) or any(code != 0 for code in listings)
    results = []
    excluded = set()
    for number, code in enumerate(baseline, 1):
        try:
            if code == 0:
                check_cargo_log(output / f"cargo-test-{number}.log")
        except (OSError, ValueError) as error:
            print(f"Incomplete Cargo evidence: {error}", file=sys.stderr)
            incomplete = True
    for number, code in enumerate(attempts, 1):
        try:
            current, report_incomplete = report_results(output / f"attempt-{number}.xml")
            incomplete |= report_incomplete or any(status in ("error", "skipped") for status in current.values())
            incomplete |= ("failure" in current.values()) != (code == 100)
        except (OSError, ET.ParseError, ValueError) as error:
            print(f"Cannot read test report: {error}", file=sys.stderr)
            current = {}
            incomplete = True
        results.append(current)
        try:
            listed, skipped, inventory_incomplete = inventory(output / f"inventory-{number}.json")
            excluded.update(skipped)
            incomplete |= inventory_incomplete or listed != current.keys()
        except (OSError, ValueError) as error:
            print(f"Cannot read test inventory: {error}", file=sys.stderr)
            incomplete = True
    first, second = results
    incomplete |= first.keys() != second.keys()
    mixed = sorted(
        key for key in first.keys() & second.keys() - excluded
        if {first[key], second[key]} == {"passed", "failure"}
    )
    baseline_differed = all(code is not None for code in baseline) and (baseline[0] == 0) != (
        baseline[1] == 0
    )
    summary = {
        "cargo_test_exit_codes": baseline,
        "cargo_test_inconsistent": baseline_differed,
        "exit_codes": attempts,
        "list_exit_codes": listings,
        "mixed": mixed,
        "incomplete": incomplete,
    }
    (output / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    for suite, name in mixed:
        print(f"Flaky test: {suite} :: {name}", file=sys.stderr)
    if baseline_differed:
        print("Cargo test suite outcomes differed; inspect cargo-test logs.", file=sys.stderr)
    print(f"Test evidence: {output}")
    return int(incomplete or any(code != 0 for code in baseline + attempts))


if __name__ == "__main__":
    sys.exit(main())
