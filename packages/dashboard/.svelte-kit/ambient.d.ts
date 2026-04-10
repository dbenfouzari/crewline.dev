
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/private';
 * 
 * console.log(ENVIRONMENT); // => "production"
 * console.log(PUBLIC_BASE_URL); // => throws error during build
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/private' {
	export const TERM: string;
	export const GIT_EDITOR: string;
	export const OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: string;
	export const ASDF_INSTALL_TYPE: string;
	export const COMMAND_MODE: string;
	export const LANG: string;
	export const OLLAMA_API_KEY: string;
	export const TERMINFO: string;
	export const TERM_PROGRAM: string;
	export const COREPACK_ENABLE_AUTO_PIN: string;
	export const DATABASE_PATH: string;
	export const HOMEBREW_PREFIX: string;
	export const CLAUDECODE: string;
	export const SECURITYSESSIONID: string;
	export const GHOSTTY_RESOURCES_DIR: string;
	export const npm_package_name: string;
	export const OSLogRateLimit: string;
	export const EDITOR: string;
	export const GOROOT: string;
	export const GHOSTTY_BIN_DIR: string;
	export const LESS: string;
	export const _: string;
	export const npm_execpath: string;
	export const OLDPWD: string;
	export const GITHUB_WEBHOOK_SECRET: string;
	export const HOME: string;
	export const USER: string;
	export const __CF_USER_TEXT_ENCODING: string;
	export const MANPATH: string;
	export const npm_lifecycle_script: string;
	export const GOPATH: string;
	export const PATH: string;
	export const TERM_PROGRAM_VERSION: string;
	export const SSH_AUTH_SOCK: string;
	export const GOBIN: string;
	export const LOGNAME: string;
	export const PORT: string;
	export const STARSHIP_SESSION_KEY: string;
	export const ASDF_INSTALL_PATH: string;
	export const INFOPATH: string;
	export const ZSH: string;
	export const npm_lifecycle_event: string;
	export const ASDF_INSTALL_VERSION: string;
	export const XPC_FLAGS: string;
	export const npm_config_local_prefix: string;
	export const PWD: string;
	export const LaunchInstanceID: string;
	export const ASDF_DATA_DIR: string;
	export const HOMEBREW_CELLAR: string;
	export const PAGER: string;
	export const npm_package_json: string;
	export const npm_command: string;
	export const NODE: string;
	export const LS_COLORS: string;
	export const TMPDIR: string;
	export const CLAUDE_CODE_ENTRYPOINT: string;
	export const XDG_DATA_DIRS: string;
	export const npm_config_user_agent: string;
	export const __CFBundleIdentifier: string;
	export const npm_package_version: string;
	export const SHLVL: string;
	export const SHELL: string;
	export const LSCOLORS: string;
	export const COLORTERM: string;
	export const NoDefaultCurrentDirectoryInExePath: string;
	export const npm_node_execpath: string;
	export const GHOSTTY_SHELL_FEATURES: string;
	export const STARSHIP_SHELL: string;
	export const HOMEBREW_REPOSITORY: string;
	export const XPC_SERVICE_NAME: string;
	export const NODE_ENV: string;
}

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/public';
 * 
 * console.log(ENVIRONMENT); // => throws error during build
 * console.log(PUBLIC_BASE_URL); // => "http://site.com"
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * 
 * console.log(env.ENVIRONMENT); // => "production"
 * console.log(env.PUBLIC_BASE_URL); // => undefined
 * ```
 */
declare module '$env/dynamic/private' {
	export const env: {
		TERM: string;
		GIT_EDITOR: string;
		OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: string;
		ASDF_INSTALL_TYPE: string;
		COMMAND_MODE: string;
		LANG: string;
		OLLAMA_API_KEY: string;
		TERMINFO: string;
		TERM_PROGRAM: string;
		COREPACK_ENABLE_AUTO_PIN: string;
		DATABASE_PATH: string;
		HOMEBREW_PREFIX: string;
		CLAUDECODE: string;
		SECURITYSESSIONID: string;
		GHOSTTY_RESOURCES_DIR: string;
		npm_package_name: string;
		OSLogRateLimit: string;
		EDITOR: string;
		GOROOT: string;
		GHOSTTY_BIN_DIR: string;
		LESS: string;
		_: string;
		npm_execpath: string;
		OLDPWD: string;
		GITHUB_WEBHOOK_SECRET: string;
		HOME: string;
		USER: string;
		__CF_USER_TEXT_ENCODING: string;
		MANPATH: string;
		npm_lifecycle_script: string;
		GOPATH: string;
		PATH: string;
		TERM_PROGRAM_VERSION: string;
		SSH_AUTH_SOCK: string;
		GOBIN: string;
		LOGNAME: string;
		PORT: string;
		STARSHIP_SESSION_KEY: string;
		ASDF_INSTALL_PATH: string;
		INFOPATH: string;
		ZSH: string;
		npm_lifecycle_event: string;
		ASDF_INSTALL_VERSION: string;
		XPC_FLAGS: string;
		npm_config_local_prefix: string;
		PWD: string;
		LaunchInstanceID: string;
		ASDF_DATA_DIR: string;
		HOMEBREW_CELLAR: string;
		PAGER: string;
		npm_package_json: string;
		npm_command: string;
		NODE: string;
		LS_COLORS: string;
		TMPDIR: string;
		CLAUDE_CODE_ENTRYPOINT: string;
		XDG_DATA_DIRS: string;
		npm_config_user_agent: string;
		__CFBundleIdentifier: string;
		npm_package_version: string;
		SHLVL: string;
		SHELL: string;
		LSCOLORS: string;
		COLORTERM: string;
		NoDefaultCurrentDirectoryInExePath: string;
		npm_node_execpath: string;
		GHOSTTY_SHELL_FEATURES: string;
		STARSHIP_SHELL: string;
		HOMEBREW_REPOSITORY: string;
		XPC_SERVICE_NAME: string;
		NODE_ENV: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://example.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.ENVIRONMENT); // => undefined, not public
 * console.log(env.PUBLIC_BASE_URL); // => "http://example.com"
 * ```
 * 
 * ```
 * 
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
