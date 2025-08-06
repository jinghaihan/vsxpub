# vsxpub

A CLI tool for publishing VS Code extensions to the Marketplace, OpenVSX, and GitHub Releases.

## Usage

```sh
npx vsxpub
```

You can skip publishing to specific platforms by using the `--skip-git`, `--skip-vsce`, or `--skip-ovsx` flags.

Examples:
- Local development: `npx vsxpub --skip-git` to skip GitHub releases
- CI/CD pipeline: `npx vsxpub --skip-vsce --skip-ovsx` to avoid configuring secrets

## Environment Variables

Required environment variables:
- `GITHUB_TOKEN` - GitHub personal access token
- `VSCE_PAT` - VS Code Marketplace personal access token
- `OVSX_PAT` - OpenVSX registry personal access token

For local development, follow the vsce and ovsx documentation to set up personal access tokens. For CI/CD, add these as GitHub repository `secrets` or skip specific platforms.

## GitHub Actions Integration

### Important: Release Page Creation

**Before using `vsxpub`, ensure that your GitHub release page has been created.** You can use tools like [`changelogithub`](https://github.com/antfu/changelogithub) to automatically create release pages with changelogs.

### Example Workflow

```yaml
name: Release

permissions:
  contents: write

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install pnpm
        uses: pnpm/action-setup@v3

      - name: Set node
        uses: actions/setup-node@v4
        with:
          node-version: lts/*

      # Create release page with changelog
      - run: npx changelogithub
        env:
          GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}

      # Generate .vsix file
      - name: Generate .vsix file
        run: pnpm package

      # Publish extension to all platforms
      # Or you can skip publishing to specific platforms in CI and run npx vsxpub locally without configuring secrets
      - name: Publish Extension
        run: npx vsxpub
        env:
          GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
          VSCE_PAT: ${{secrets.VSCE_PAT}}
          OVSX_PAT: ${{secrets.OVSX_PAT}}
```

## Why?

Modern IDEs like Cursor and Windsurf that fork VS Code obtain their extensions from OpenVSX instead of the official VS Code Marketplace. This creates significant additional workload for VS Code extension developers who need to manually synchronize their extensions to OpenVSX. When versions become inconsistent between the two platforms, it causes numerous problems for users who expect the same extension experience across different IDEs.

## License

[MIT](./LICENSE) License © [jinghaihan](https://github.com/jinghaihan)
