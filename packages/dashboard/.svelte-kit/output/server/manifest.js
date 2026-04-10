export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.BlRJD7MO.js",app:"_app/immutable/entry/app.COpKeggr.js",imports:["_app/immutable/entry/start.BlRJD7MO.js","_app/immutable/chunks/BTIzKDQG.js","_app/immutable/chunks/Dz8C_YFp.js","_app/immutable/entry/app.COpKeggr.js","_app/immutable/chunks/Dz8C_YFp.js","_app/immutable/chunks/D9FeBKZB.js","_app/immutable/chunks/DbyWjZEb.js","_app/immutable/chunks/BKC1xKxk.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
