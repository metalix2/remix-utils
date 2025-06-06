import { describe, expect, test } from "bun:test";
import type { EntryContext } from "react-router";
import { preloadRouteAssets } from "./preload-route-assets";

// TODO Fix this
describe(preloadRouteAssets, () => {
	let context: EntryContext = {
		isSpaMode: false,
		manifest: {
			url: "/manifest.js",
			routes: {
				root: {
					hasAction: false,
					hasClientAction: false,
					hasClientLoader: false,
					hasErrorBoundary: false,
					hasLoader: false,
					id: "root",
					module: "/root.js",
					imports: ["/chunk-3.js", "/chunk-4.js"],
				},
				"routes/index": {
					hasAction: false,
					hasClientAction: false,
					hasClientLoader: false,
					hasErrorBoundary: false,
					hasLoader: false,
					id: "routes/index",
					imports: ["/chunk-5.js"],
					module: "/routes/index.js",
				},
			},
			version: "latest",
			entry: {
				imports: ["/chunk-1.js", "/chunk-2.js"],
				module: "/entry.client.js",
			},
		},
		routeModules: {
			root: {
				default() {
					return null;
				},
				links() {
					return [{ rel: "stylesheet", href: "/styles.css" }];
				},
			},
			"routes/index": {
				default() {
					return null;
				},
				links: undefined,
			},
		},
		future: {
			v2_meta: false,
			v2_dev: false,
			v2_errorBoundary: false,
			v2_headers: false,
			v2_normalizeFormMethod: false,
			v2_routeConvention: false,
			unstable_postcss: false,
			unstable_tailwind: false,
		},
		staticHandlerContext: {
			actionData: {},
			actionHeaders: {},
			basename: "/",
			errors: {},
			loaderData: {},
			loaderHeaders: {},
			location: {
				hash: "hash",
				key: "key",
				pathname: "/",
				search: "",
				state: null,
			},
			matches: [
				{
					params: {},
					pathname: "/",
					pathnameBase: "/",
					route: {
						id: "root",
					},
				},
				{
					params: {},
					pathname: "/",
					pathnameBase: "/",
					route: {
						id: "routes/index",
					},
				},
			],
			statusCode: 200,
		},
		serializeError(error) {
			return { message: error.message, stack: error.stack };
		},
	};

	test("should add the Link headers", () => {
		let headers = new Headers();

		preloadRouteAssets(context, headers);

		expect(headers.get("link")).toMatchSnapshot(
			`"</styles.css>; rel=preload; as=style, </manifest.js>; rel=preload; as=script; crossorigin=anonymous, </entry.client.js>; rel=preload; as=script; crossorigin=anonymous, </chunk-1.js>; rel=preload; as=script; crossorigin=anonymous, </chunk-2.js>; rel=preload; as=script; crossorigin=anonymous, </root.js>; rel=preload; as=script; crossorigin=anonymous, </chunk-3.js>; rel=preload; as=script; crossorigin=anonymous, </chunk-4.js>; rel=preload; as=script; crossorigin=anonymous, </routes/index.js>; rel=preload; as=script; crossorigin=anonymous, </chunk-5.js>; rel=preload; as=script; crossorigin=anonymous"`,
		);
	});

	test("should respect manually added Link headers", () => {
		let headers = new Headers();
		headers.set("Link", "</custom.js>; rel=preload; as=script");
		preloadRouteAssets(context, headers);
		expect(headers.get("link")).toMatchSnapshot(
			`"</custom.js>; rel=preload; as=script, </styles.css>; rel=preload; as=style, </manifest.js>; rel=preload; as=script; crossorigin=anonymous, </entry.client.js>; rel=preload; as=script; crossorigin=anonymous, </chunk-1.js>; rel=preload; as=script; crossorigin=anonymous, </chunk-2.js>; rel=preload; as=script; crossorigin=anonymous, </root.js>; rel=preload; as=script; crossorigin=anonymous, </chunk-3.js>; rel=preload; as=script; crossorigin=anonymous, </chunk-4.js>; rel=preload; as=script; crossorigin=anonymous, </routes/index.js>; rel=preload; as=script; crossorigin=anonymous, </chunk-5.js>; rel=preload; as=script; crossorigin=anonymous"`,
		);
	});
});
