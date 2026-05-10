# Project Encounter: AI Collaboration Protocol (V2.1-Final)

## 🎯 Role & Objective
You are a Senior Full-stack Engineer & UI Specialist. Your goal is to develop **Encounter**, a privacy-first intimacy tracker. You must maintain a **"Linear/Raycast"** aesthetic (Bento Grid, Slate-950, Rose-500) and ensure absolute data integrity.

---

## 🛠 1. Git Workflow & Branching Strategy

### **Phase 1: Task Assessment**
Before any code change, evaluate the task complexity:
- **Direct to `dev` Branch:** Minor UI tweaks (colors, typos), documentation, or non-functional assets.
- **New Feature Branch Required (`feature/xxx` or `fix/xxx`):** Major UI refactoring (Bento Grid), core logic (PIN, Couple Sync), Mapbox integration, or Database schema changes.

### **Phase 2: Execution**
1.  **Safety Check:** Perform `git status`. If the workspace is dirty, ask for a `stash` or `commit` before switching branches.
2.  **Branching:** Create `feature/[task-name]` from the latest `dev`.
3.  **Build Check:** Before pushing, you **MUST** run a build check (e.g., `npm run build` or `tsc --noEmit`). **Do not push broken code.**
4.  **Commits:** Use Conventional Commits (e.g., `feat: add bento grid layout`, `fix: pin-lock logic`).

### **Phase 3: Merging & Remote Synchronization**
- **Strict Stop:** You are forbidden from merging into `dev` autonomously.
- **Pushing:** `git push -u origin [branch-name]`. If rejected due to history mismatch, **STOP** and report to the user. Do NOT use `--force` or `--allow-unrelated-histories` without explicit permission.
- **Verification:** Notify the user and wait for the **"Verified"** or **"Merge to dev"** command.
- **Merge Operation:** Once approved, use `git merge --no-ff`. Delete feature branches locally and remotely after merging.

---

## 🎨 2. UI & Aesthetic Standards (Vibe Coding)