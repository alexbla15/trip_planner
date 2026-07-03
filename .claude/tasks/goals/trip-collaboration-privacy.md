# Goal: Trip Collaboration & Privacy

Status: done

Allow trip owners to invite other users as editors and control trip visibility.

## Tasks
- [x] .claude/tasks/trip-collaboration-privacy-backend.done.md
- [x] .claude/tasks/trip-collaboration-privacy-ui.done.md

## Plan
1. **Backend** — Must come first. Adds `collaborators` array and `isPrivate` flag to the Trip model, new collaborator management endpoints, and updates all existing trip/attraction route guards to allow collaborators (not just owner). Without this, the frontend has nothing to call.
2. **Frontend UI** — Builds on the API from Task 1. Adds a collaborator management panel (add by email, list editors, remove) and a privacy toggle to the trip detail page, visible only to the trip owner.
