# Documentation Standards for all Agents

All agents use Markdown files to create specifications, and document their work. All agents have to follow a specific folder/file structure:

./ (project root)
    /purple
        /documentation <-- Created by `implement-spec` command if not exist yet
            /{YYMMDD}-{feature-slug} <-- Created by `implement-spec` command
                user-provided-product-spec-{feature-slug}.md <-- Written by user, copied into here by `implement-spec` command
                user-provided-technical-spec-{feature-slug}.md <-- Optionally written by user, copied into here by `implement-spec` command
                /agent-written-specifications <-- Created by `implement-spec` command
                    agent-written-product-spec-{feature-slug}.md <-- Created by `product-spec-writer` agent
                    implementation-spec-{feature-slug}.md  <-- Created by `engineering-architect` agent
                /completed-tickets-documentation <-- Created by `implement-spec` command
                    {phase}-{ticketnumber}-{feature-slug}-documentation.md  <-- Created by `implementation-engineer` agent
                    ... (one for each completed ticket)
                /qa-results <-- Created by QA agents
    /repos
        ... (repos that are relevant to this project) <-- Loaded by Purple CLI

The project root is the base folder out of which agents operate, not a specific codebase inside of `repos`

> **Note:** `purple/` may be a symlink. If Glob returns no results, use Bash or Read to access files directly.