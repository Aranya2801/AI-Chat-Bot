# Contributing to AI Chat Bot

Thank you for your interest in contributing! 🎉

## Getting Started

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/YOUR_USERNAME/AI-Chat-Bot.git`
3. **Install** dependencies: `npm install`
4. **Create** a `.env` file from `.env.example` and add your API key
5. **Start** the dev server: `npm run dev`

## Development Workflow

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes, then commit
git add .
git commit -m "feat: add your feature description"

# Push and open a PR
git push origin feature/your-feature-name
```

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | When to use |
|--------|-------------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation |
| `style:` | Code style (no logic change) |
| `refactor:` | Code refactor |
| `perf:` | Performance improvement |
| `test:` | Adding tests |
| `chore:` | Build/config changes |

## Code Style

- Run `npm run lint` before committing
- Run `npm run format` to auto-format
- Components: PascalCase (`ChatWindow.jsx`)
- Utilities: camelCase (`chatApi.js`)
- CSS: BEM-like naming (`.message__body`, `.message--user`)

## Pull Request Guidelines

- Keep PRs focused on one feature/fix
- Write a clear description
- Add screenshots for UI changes
- Link related issues with `Closes #123`

## Questions?

Open a [Discussion](https://github.com/Aranya2801/AI-Chat-Bot/discussions) or reach out via Issues.
