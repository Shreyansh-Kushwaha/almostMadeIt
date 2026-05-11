# Render uses this Dockerfile for the api-server service (see render.yaml).
#
# Base: Playwright's official image, which ships Node 22 + Chromium + every
# OS lib Chromium needs already installed. Eliminates the whole class of
# "Executable doesn't exist" / "libatk-1.0.so.0 missing" failures the
# native Node runtime kept producing.

FROM mcr.microsoft.com/playwright:v1.59.1-noble

# Install pnpm directly instead of using corepack. The version of corepack
# bundled with Node 22 in the Playwright Noble image has stale signing keys
# and fails to fetch pnpm with "Cannot find matching keyid". Pinning the
# version with `npm install -g` sidesteps the signature check entirely.
# Keep this version in sync with packageManager in package.json.
RUN npm install -g pnpm@10.23.0

WORKDIR /app

# Copy everything; the workspace has many package.json files scattered across
# artifacts/* and lib/*, so trying to pre-copy just package.jsons for cache
# optimization isn't worth the complexity for a single-service build.
COPY . .

# Browsers are already in the base image at /ms-playwright — skip the npm
# package's postinstall download to keep the build fast.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Install all workspace deps, then bundle the api-server to dist/index.mjs.
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server run build

ENV NODE_ENV=production

# Render injects $PORT; the api-server listens on it. Default to 8080 for
# local `docker run` testing.
ENV PORT=8080
EXPOSE 8080

WORKDIR /app/artifacts/api-server
CMD ["pnpm", "run", "start"]
