#!/usr/bin/env python3
"""Commit and push this repo, using the newest entry of RELEASE_NOTES.md as the commit message.

Usage (from anywhere):   python scripts/push.py
Optional:                python scripts/push.py --dry-run
Both repos:              python scripts/push.py --all   (also updates your template repo; see publish_template.py)
"""
import os, re, subprocess, sys, tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DRY = "--dry-run" in sys.argv


def git(*args, check=True):
    print("> git " + " ".join(args))
    r = subprocess.run(["git", *args], cwd=ROOT, text=True, capture_output=True)
    if r.stdout.strip():
        print(r.stdout.strip())
    if r.stderr.strip():
        print(r.stderr.strip())
    if check and r.returncode != 0:
        sys.exit(f"git {args[0]} failed (exit {r.returncode}). See the message above.")
    return r


def latest_notes():
    path = os.path.join(ROOT, "RELEASE_NOTES.md")
    if not os.path.exists(path):
        sys.exit("RELEASE_NOTES.md not found.")
    text = open(path, encoding="utf-8").read()
    m = re.search(r"^##\s+(.+?)\n(.*?)(?=^##\s|\Z)", text, re.S | re.M)
    if not m:
        sys.exit("RELEASE_NOTES.md needs at least one '## Title' entry.")
    return f"{m.group(1).strip()}\n\n{m.group(2).strip()}\n"


def main():
    try:
        subprocess.run(["git", "--version"], check=True, capture_output=True)
    except (OSError, subprocess.CalledProcessError):
        sys.exit("git is not installed or not on PATH. Install it with: winget install --id Git.Git -e")

    # Google Drive drops desktop.ini files inside .git, which breaks git. Remove them.
    for base, _dirs, files in os.walk(os.path.join(ROOT, ".git")):
        for f in files:
            if f.lower() == "desktop.ini":
                try:
                    os.chmod(os.path.join(base, f), 0o666)
                    os.remove(os.path.join(base, f))
                except OSError:
                    pass

    msg = latest_notes()
    print("Commit message:\n" + "-" * 40 + "\n" + msg + "-" * 40)
    git("add", "-A")
    status = git("status", "--short").stdout.strip()
    if not status:
        print("Nothing to commit. Pushing any unpushed commits.")
    elif DRY:
        print("Dry run: stopping before commit/push.")
        return
    else:
        with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as tf:
            tf.write(msg)
        try:
            git("commit", "-F", tf.name)
        finally:
            os.remove(tf.name)
    if DRY:
        return
    branch = git("rev-parse", "--abbrev-ref", "HEAD").stdout.strip()
    has_up = git("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}", check=False).returncode == 0
    push = ["push"] if has_up else ["push", "-u", "origin", branch]
    r = git(*push, check=False)
    if r.returncode != 0 and has_up:
        print("Push was rejected. Trying: git pull --rebase, then push again.")
        git("pull", "--rebase")
        git("push")
    elif r.returncode != 0:
        sys.exit("Push failed. See the message above.")
    print("Done. Cloudflare will build and deploy automatically.")
    if "--all" in sys.argv:
        tpl = os.path.join(ROOT, "scripts", "publish_template.py")
        if not os.path.exists(tpl):
            sys.exit("--all only applies to the original project (it publishes the shareable template). Nothing more to do.")
        print("\nNow updating the template repo...")
        sys.exit(subprocess.run([sys.executable, tpl]).returncode)


if __name__ == "__main__":
    main()
