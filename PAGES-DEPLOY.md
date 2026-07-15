## GH Pages deploy setup

Used deploy script: [.github/workflows/build_and_deploy.yml](.github/workflows/build_and_deploy.yml).

The workflow is triggered manually — go to `Repository` > `Actions` > `Build and Deploy` > `Run workflow`.

### Repository variables (NEXT_PUBLIC_*)

The build reads runtime config from `NEXT_PUBLIC_*` environment variables. In CI they are injected from GitHub Actions **repository variables** (not from `env/.env.*` files, which are only for local dev).

`Repository` > `Settings` > `Secrets and variables` > `Actions` > `Variables` > `New repository variable`:

| Variable | Example value |
| --- | --- |
| `NEXT_PUBLIC_ENV` | `production` |
| `NEXT_PUBLIC_ORIGIN` | `https://kirtan.site/` |
| `NEXT_PUBLIC_G_ID` | Google Analytics measurement ID |
| `NEXT_PUBLIC_SEARCH_ACCOUNT_ID` | Search provider account ID |
| `NEXT_PUBLIC_SEARCH_API_KEY` | Search provider API key |

### GH_TOKEN

Setup `secrets.GH_TOKEN` — used by `JamesIves/github-pages-deploy-action@v4` to push the built site to the `gh-pages` branch.

`User icon` > `Settings` > `Developer Settings` > `Personal Access Tokens` > `Fine-grained tokens` > `Generate new token`.

**Resource owner**: `current repository`.

**Repository access**: `Only select repositories` = `current repository`.

**Permissions**: `Repository permissions` > `Contents` = `Read and write`.

Then add it under `Repository` > `Settings` > `Secrets and variables` > `Actions` > `Secrets` > `New repository secret`:

- Name: `GH_TOKEN`
- Value: the generated token.

### Pages setup

Setup GitHub Pages for the repository.

`Repository` > `Settings` > `Pages` > `Build and deployment`:

**Source**: `Deploy from a branch`.

**Branch**: `gh-pages` `/root` > Click `Save`.

> The `gh-pages` branch is created automatically on the first successful workflow run.

### Custom domain (optional)

If serving from a custom domain (e.g. `kirtan.site`), also add it under `Repository` > `Settings` > `Pages` > `Custom domain`. Make sure `NEXT_PUBLIC_ORIGIN` above matches the deployed URL (including trailing slash) so sitemap / metadata / share URLs point to the right place.




