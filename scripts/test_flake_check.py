import json
import os
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

from flake_check import report_results


def report(cases: list[tuple[str, str]]) -> str:
    counts = (
        f'tests="{len(cases)}" failures="{sum("<failure" in state for _, state in cases)}" '
        f'errors="{sum("<error" in state for _, state in cases)}" '
        f'skipped="{sum("<skipped" in state for _, state in cases)}"'
    )
    return (
        f'<testsuites {counts}><testsuite name="pkg::suite" {counts}>'
        + "".join(
            f'<testcase classname="pkg::suite" name="{name}">{state}</testcase>'
            for name, state in cases
        )
        + "</testsuite></testsuites>"
    )


class FlakeCheckTests(unittest.TestCase):
    def write_reports(self, root: Path, first: str, second: str) -> tuple[Path, Path]:
        a, b = root / "first.xml", root / "second.xml"
        a.write_text(first, encoding="utf-8")
        b.write_text(second, encoding="utf-8")
        return a, b

    def test_compares_tests_even_when_both_runs_fail(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self.write_reports(
                Path(directory),
                report([("first", "<failure/>"), ("second", "")]),
                report([("first", ""), ("second", "<failure/>")]),
            )
            first, second = (report_results(path) for path in paths)
            self.assertFalse(first[1] or second[1])
            self.assertEqual(first[0][("pkg::suite", "first")], "failure")
            self.assertEqual(second[0][("pkg::suite", "first")], "passed")
            self.assertEqual(first[0][("pkg::suite", "second")], "passed")
            self.assertEqual(second[0][("pkg::suite", "second")], "failure")

    def test_skips_errors_missing_and_duplicate_tests_are_not_flakes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            good = report([("x", ""), ("other", "")])
            for other in [
                report([("x", ""), ("x", "<failure/>")]),
                good.replace('tests="2"', 'tests="3"', 1),
                "<testsuites />",
            ]:
                _, path = self.write_reports(root, good, other)
                self.assertTrue(report_results(path)[1])
            _, path = self.write_reports(root, good, "<testsuites>")
            with self.assertRaises(ET.ParseError):
                report_results(path)

    def test_captured_output_cannot_spoof_a_test_result(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            a, b = self.write_reports(
                Path(directory),
                report([("x", "<failure><system-out>test evil ... ok</system-out></failure>")]),
                report([("x", "")]),
            )
            self.assertEqual(report_results(a), ({("pkg::suite", "x"): "failure"}, False))
            self.assertEqual(report_results(b), ({("pkg::suite", "x"): "passed"}, False))

    def test_second_run_does_not_hide_the_initial_failure(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            cargo = root / "cargo"
            cargo.write_text(
                """#!/usr/bin/env python3
import json, sys, tomllib
from pathlib import Path
if sys.argv[1] == "nextest":
    if sys.argv[2] == "list":
        print(json.dumps({"test-count": 1, "rust-suites": {"pkg::suite": {
            "status": "listed", "testcases": {"write": {"ignored": False,
            "filter-match": {"status": "matches"}}}}}}))
        raise SystemExit(0)
    marker = Path("ran")
    first = not marker.exists()
    marker.touch()
    config = Path(sys.argv[sys.argv.index("--config-file") + 1])
    output = Path(tomllib.loads(config.read_text())["profile"]["ci"]["junit"]["path"])
    state = "<failure/>" if first else ""
    count = "1" if first else "0"
    attrs = " tests='1' failures='" + count + "' errors='0' skipped='0'"
    output.write_text("<testsuites" + attrs + "><testsuite name='pkg::suite'" + attrs
                      + "><testcase classname='pkg::suite' name='write'>" + state
                      + "</testcase></testsuite></testsuites>")
    raise SystemExit(100 if first else 0)
print("test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s")
print("test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s")
raise SystemExit(0)
""",
                encoding="utf-8",
            )
            cargo.chmod(0o755)
            env = {**os.environ, "PATH": str(root) + os.pathsep + os.environ.get("PATH", "")}
            script = Path(__file__).with_name("flake_check.py")
            result = subprocess.run(
                [sys.executable, str(script), str(root / "evidence")],
                cwd=root,
                env=env,
                capture_output=True,
                text=True,
            )
            summary = json.loads((root / "evidence/summary.json").read_text())
            self.assertEqual(result.returncode, 1)
            self.assertEqual(summary["cargo_test_exit_codes"], [0, 0])
            self.assertEqual(summary["exit_codes"], [100, 0])
            self.assertFalse(summary["incomplete"])
            self.assertEqual(summary["mixed"], [["pkg::suite", "write"]])

    def test_failed_cargo_gate_stays_failed_when_nextest_passes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            cargo = root / "cargo"
            cargo.write_text(
                """#!/usr/bin/env python3
import json, sys, tomllib
from pathlib import Path
if sys.argv[1] == "nextest":
    if sys.argv[2] == "list":
        print(json.dumps({"test-count": 1, "rust-suites": {"pkg::suite": {
            "status": "listed", "testcases": {"write": {"ignored": False,
            "filter-match": {"status": "matches"}}}}}}))
        raise SystemExit(0)
    config = Path(sys.argv[sys.argv.index("--config-file") + 1])
    output = Path(tomllib.loads(config.read_text())["profile"]["ci"]["junit"]["path"])
    attrs = " tests='1' failures='0' errors='0' skipped='0'"
    output.write_text("<testsuites" + attrs + "><testsuite name='pkg::suite'" + attrs
                      + "><testcase classname='pkg::suite' name='write'/></testsuite></testsuites>")
    raise SystemExit(0)
marker = Path("cargo-ran")
print("test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s")
if not marker.exists():
    marker.touch()
    print("shared-process test failed")
    raise SystemExit(101)
""",
                encoding="utf-8",
            )
            cargo.chmod(0o755)
            env = {**os.environ, "PATH": str(root) + os.pathsep + os.environ.get("PATH", "")}
            result = subprocess.run(
                [
                    sys.executable,
                    str(Path(__file__).with_name("flake_check.py")),
                    str(root / "evidence"),
                ],
                cwd=root,
                env=env,
                capture_output=True,
                text=True,
            )
            summary = json.loads((root / "evidence/summary.json").read_text())
            self.assertEqual(result.returncode, 1)
            self.assertEqual(summary["cargo_test_exit_codes"], [101, 0])
            self.assertTrue(summary["cargo_test_inconsistent"])
            self.assertEqual(summary["exit_codes"], [0, 0])
            self.assertEqual(summary["mixed"], [])
            self.assertIn(
                "shared-process test failed", (root / "evidence/cargo-test-1.log").read_text()
            )

    def test_missing_reports_and_build_failures_are_incomplete(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            cargo = root / "cargo"
            cargo.write_text(
                "#!/bin/sh\n"
                'if [ "$1" = nextest ]; then echo "test fake ... ok"; exit 101; fi\n'
                "exit 0\n",
                encoding="utf-8",
            )
            cargo.chmod(0o755)
            env = {**os.environ, "PATH": str(root) + os.pathsep + os.environ.get("PATH", "")}
            result = subprocess.run(
                [
                    sys.executable,
                    str(Path(__file__).with_name("flake_check.py")),
                    str(root / "evidence"),
                ],
                cwd=root,
                env=env,
                capture_output=True,
                text=True,
            )
            summary = json.loads((root / "evidence/summary.json").read_text())
            self.assertNotEqual(result.returncode, 0)
            self.assertTrue(summary["incomplete"])
            self.assertEqual(summary["mixed"], [])

    def test_reliability_requires_complete_evidence_including_doctests(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            cargo = root / "cargo"
            cargo.write_text(
                '''#!/usr/bin/env python3
import json, os, sys, tomllib
from pathlib import Path

scenario = os.environ["SCENARIO"]
if sys.argv[1] == "nextest":
    if sys.argv[2] == "list":
        cases = {"write": {"ignored": False, "filter-match": {"status": "matches"}}}
        if scenario == "omitted":
            cases["missing"] = {"ignored": False, "filter-match": {"status": "matches"}}
        if scenario == "ignored":
            cases["missing"] = {"ignored": True, "filter-match": {"status": "mismatch", "reason": "ignored"}}
        if scenario == "filtered":
            cases["missing"] = {"ignored": False, "filter-match": {"status": "mismatch", "reason": "expression"}}
        print(json.dumps({"test-count": len(cases), "rust-suites": {
            "pkg::suite": {"status": "listed", "testcases": cases}}}))
        raise SystemExit(0)
    config = Path(sys.argv[sys.argv.index("--config-file") + 1])
    output = Path(tomllib.loads(config.read_text())["profile"]["ci"]["junit"]["path"])
    skipped = scenario == "skipped"
    attrs = " tests='1' failures='0' errors='0' skipped='" + str(int(skipped)) + "'"
    output.write_text("<testsuites" + attrs + "><testsuite name='pkg::suite'" + attrs
                      + "><testcase classname='pkg::suite' name='write'>"
                      + ("<skipped/>" if skipped else "")
                      + "</testcase></testsuite></testsuites>")
    raise SystemExit(0)
if any(arg in sys.argv for arg in ("--doc", "--lib", "--bins", "--tests", "--examples", "--all-targets", "--no-run")):
    raise SystemExit(2)
print("     Running unittests src/lib.rs (target/debug/deps/pkg)")
print("test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s")
print("   Doc-tests pkg")
ignored = int(scenario == "ignored_doctest")
print(f"test result: ok. {1 - ignored} passed; 0 failed; {ignored} ignored; 0 measured; 0 filtered out; finished in 0.00s")
''',
                encoding="utf-8",
            )
            cargo.chmod(0o755)
            for scenario in ("clean", "skipped", "omitted", "ignored", "filtered", "ignored_doctest"):
                with self.subTest(scenario=scenario):
                    env = {**os.environ, "PATH": str(root) + os.pathsep + os.environ.get("PATH", ""), "SCENARIO": scenario}
                    evidence = root / scenario
                    result = subprocess.run(
                        [sys.executable, str(Path(__file__).with_name("flake_check.py")), str(evidence)],
                        cwd=root, env=env, capture_output=True, text=True,
                    )
                    summary = json.loads((evidence / "summary.json").read_text())
                    self.assertEqual(result.returncode, 0 if scenario == "clean" else 1, result.stderr)
                    self.assertEqual(summary["incomplete"], scenario != "clean")
                    self.assertIn("Doc-tests pkg", (evidence / "cargo-test-1.log").read_text())


    def test_old_nextest_missing_skipped_counts_requires_no_skipped_cases(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            good = report([("x", "")]).replace(' skipped="0"', "")
            a, b = self.write_reports(root, good, good)
            self.assertFalse(report_results(a)[1] or report_results(b)[1])
            b.write_text(report([("x", "<skipped/>")]).replace(' skipped="1"', ""))
            self.assertTrue(report_results(b)[1])

    def test_comparable_results_survive_unrelated_incomplete_evidence(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            cargo = root / "cargo"
            cargo.write_text(
                '''#!/usr/bin/env python3
import json, os, sys, tomllib
from pathlib import Path

scenario = os.environ["SCENARIO"]
if sys.argv[1] != "nextest":
    if scenario != "cargo_log":
        print("test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out;")
    raise SystemExit(0)
if sys.argv[2] == "list":
    cases = {name: {"ignored": False, "filter-match": {"status": "matches"}}
             for name in ("x", "y") if scenario != "inventory" or name != "y"}
    if scenario == "inventory_skipped_x": cases["x"]["ignored"] = True
    if scenario == "inventory_skipped_sibling": cases["y"]["ignored"] = True
    print(json.dumps({"test-count": len(cases), "rust-suites": {
        "pkg::suite": {"status": "listed", "testcases": cases}}}))
    raise SystemExit(1 if scenario == "listing" else 0)
config = Path(sys.argv[sys.argv.index("--config-file") + 1])
output = Path(tomllib.loads(config.read_text())["profile"]["ci"]["junit"]["path"])
first = output.name == "attempt-1.xml"
x = "<failure/>" if first else ""
y = ""
if first and scenario == "skipped_sibling": y = "<skipped/>"
if first and scenario == "ambiguous_sibling": y = "<failure/><skipped/>"
if first and scenario == "skipped_x": x = "<skipped/>"
if first and scenario == "error_x": x = "<error/>"
if first and scenario == "ambiguous_x": x = "<failure/><skipped/>"
cases = [("x", x), ("y", y)]
if first and scenario == "missing_sibling": cases.pop()
if first and scenario == "duplicate_sibling": cases.append(("y", ""))
if first and scenario == "duplicate_x": cases.append(("x", ""))
attrs = (" tests='" + str(len(cases)) + "' failures='" + str(sum("<failure" in s for _, s in cases))
         + "' errors='" + str(sum("<error" in s for _, s in cases))
         + "' skipped='" + str(sum("<skipped" in s for _, s in cases)) + "'")
if scenario == "counts" and first: attrs = attrs.replace("tests='2'", "tests='3'")
output.write_text("<testsuites" + attrs + "><testsuite name='pkg::suite'" + attrs + ">"
                  + "".join("<testcase classname='pkg::suite' name='" + n + "'>" + s
                            + "</testcase>" for n, s in cases)
                  + "</testsuite></testsuites>")
if first and scenario == "attempt": raise SystemExit(101)
if first and scenario == "exit_code": raise SystemExit(0)
raise SystemExit(100 if first else 0)
''',
                encoding="utf-8",
            )
            cargo.chmod(0o755)
            scenarios = (
                "missing_sibling", "skipped_sibling", "duplicate_sibling", "ambiguous_sibling",
                "counts", "cargo_log", "listing", "inventory", "attempt", "exit_code",
                "inventory_skipped_sibling", "inventory_skipped_x", "skipped_x", "error_x",
                "ambiguous_x", "duplicate_x",
            )
            for scenario in scenarios:
                with self.subTest(scenario=scenario):
                    env = {**os.environ, "PATH": str(root) + os.pathsep + os.environ.get("PATH", ""),
                           "SCENARIO": scenario}
                    evidence = root / scenario
                    result = subprocess.run(
                        [sys.executable, str(Path(__file__).with_name("flake_check.py")), str(evidence)],
                        cwd=root, env=env, capture_output=True, text=True,
                    )
                    summary = json.loads((evidence / "summary.json").read_text())
                    self.assertEqual(result.returncode, 1, result.stderr)
                    self.assertTrue(summary["incomplete"], result.stderr)
                    expected = [] if scenario in ("inventory_skipped_x", "skipped_x", "error_x", "ambiguous_x", "duplicate_x") else [["pkg::suite", "x"]]
                    self.assertEqual(summary["mixed"], expected, result.stderr)


if __name__ == "__main__":
    unittest.main()
