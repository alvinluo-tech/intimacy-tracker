# Git Workflow & Development Protocol

## 1. Task Assessment (Branching Decision)
Before starting any development, evaluate the complexity and risk of the task:
- **Direct to `dev` Branch:** - Minor UI tweaks (e.g., changing colors, fixing typos).
    - Updating documentation or non-functional assets.
    - Low-risk dependency updates.
- **New Feature Branch Required (`feature/xxx` or `fix/xxx`):**
    - Major UI refactoring (e.g., Bento Grid integration).
    - Introducing new core logic (e.g., Online Timer, Encryption updates).
    - Integrating complex third-party libraries (e.g., Mapbox-gl).
    - Database schema changes or sensitive Auth logic modifications.

## 2. Development Workflow

### Step 1: Initialization
- If a new branch is needed: Create a branch from `dev` named `feature/[task-description]`.
- If no branch is needed: Ensure the current branch is `dev` and pull the latest changes.

### Step 2: Implementation & Verification
- Implement the requested features following the coding standards in `CLAUDE.md`.
- **Pre-Push Check:** You MUST run a compilation/build check (e.g., `npm run build` or `tsc --noEmit`) to ensure no linting or type errors are introduced.
- Address any warnings or errors before proceeding.

### Step 3: Remote Synchronization
- Commit changes with clear, descriptive commit messages (Conventional Commits preferred).
- Push the branch/commits to the remote repository.

## 3. Merging & Validation Protocol
- **Strict Stop:** Do NOT merge the feature branch into `dev` autonomously.
- **User Validation:** After pushing, notify the user and provide the deployment/preview URL (if applicable).
- **Final Approval:** Wait for the user to explicitly say "Verified" or "Merge to dev". 
- **Merge Operation:** Once approved, merge the feature branch into `dev`, resolve any conflicts, and delete the feature branch locally and remotely.

## 4. Safety Guardrails
- Always perform a `git status` before any operation to avoid polluting the staging area.
- If a compilation error persists, stop and ask the user for guidance rather than forcing a push.
- Ensure all sensitive data (API keys, Supabase URLs) are never included in commits.