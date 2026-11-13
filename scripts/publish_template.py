#!/usr/bin/env python3
"""Rebuild the clean template and push it to your separate template repository.

First time:   python scripts/publish_template.py --template-dir "C:\\path\\to\\digital-business-card-template"
After that:   python scripts/publish_template.py

The template folder must be a git clone of your template repo (see SETUP/sharing notes). Your own repo is never touched.
"""
import os, re, shutil, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import make_template as mt  # builds dist/digital-business-card-template and scans it for personal data

CFG = os.path.join(ROOT, "scripts", ".template_repo")


def git(cwd, *args, check=True):
    print("> git " + " ".join(args))
    r = subprocess.run(["git", *args], cwd=cwd, text=True, capture_output=True)
    for s in (r.stdout, r.stderr):
        if s.strip():
            print(s.strip())
    if check and r.returncode != 0:
        sys.exit(f"git {args[0]} failed. See the message above.")
    return r


def clean_desktop_ini(repo):
    for base, _d, files in os.walk(os.path.join(repo, ".git")):
        for f in files:
            if f.lower() == "desktop.ini":
                try:
                    os.chmod(os.path.join(base, f), 0o666); os.remove(os.path.join(base, f))
                except OSError:
                    pass


def latest_title():
    text = open(os.path.join(ROOT, "RELEASE_NOTES.md"), encoding="utf-8").read()
    m = re.search(r"^##\s+(.+)$", text, re.M)
    return m.group(1).strip() if m else "Update"


def main():
    args = sys.argv[1:]
    if "--template-dir" in args:
        path = os.path.abspath(args[args.index("--template-dir") + 1])
        open(CFG, "w", encoding="utf-8").write(path)
    elif os.path.exists(CFG):
        path = open(CFG, encoding="utf-8").read().strip()
    else:
        sys.exit('First run: python scripts/publish_template.py --template-dir "PATH TO YOUR TEMPLATE REPO FOLDER"')
    if not os.path.isdir(os.path.join(path, ".git")):
        sys.exit(f"{path} is not a git repository. Clone your template repo there first (git clone <template repo url> <folder>).")
    if os.path.abspath(path) == ROOT:
        sys.exit("The template folder must be different from this project folder.")

    # Build + scan. make_template exits (and writes nothing) if any personal detail is found.
    mt.copy_tree(); mt.overlay()
    bad = mt.scan()
    if bad:
        shutil.rmtree(mt.DEST, ignore_errors=True)
        sys.exit("STOPPED: personal details found. Nothing was pushed.\n  " + "\n  ".join(bad))

    clean_desktop_ini(path)
    # Mirror the clean build into the template repo (removed files disappear too), keeping its .git folder.
    for name in os.listdir(path):
        if name == ".git":
            continue
        p = os.path.join(path, name)
        shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
    for name in os.listdir(mt.DEST):
        s, d = os.path.join(mt.DEST, name), os.path.join(path, name)
        shutil.copytree(s, d) if os.path.isdir(s) else shutil.copyfile(s, d)

    git(path, "add", "-A")
    if not git(path, "status", "--short").stdout.strip():
        print("Template is already up to date.")
        return
    msg = latest_title()
    for pat in mt.load_patterns():  # the commit message is public too
        if pat.search(msg):
            sys.exit(f"STOPPED: the latest release note title matches a personal-data pattern: {msg!r}. Nothing was pushed.")
    git(path, "commit", "-m", msg)
    branch = git(path, "rev-parse", "--abbrev-ref", "HEAD").stdout.strip()
    has_up = git(path, "rev-parse", "--abbrev-ref", "@{u}", check=False).returncode == 0
    r = git(path, *(["push"] if has_up else ["push", "-u", "origin", branch]), check=False)
    if r.returncode != 0 and has_up:
        git(path, "pull", "--rebase"); git(path, "push")
    elif r.returncode != 0:
        sys.exit("Push failed. See the message above.")
    print("Template repo updated.")


if __name__ == "__main__":
    main()
