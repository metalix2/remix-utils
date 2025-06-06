/**
 * The session middleware let's you save a session object in the Router context
 * so you can access it in any loader and ensure you're always working with the
 * same Session instance.
 *
 * ```ts
 * import { unstable_createSessionMiddleware } from "remix-utils/middleware/session";
 * ```
 *
 * To use it, you need to create a session storage object and pass it to the
 * middleware.
 *
 * ```ts
 * import { createCookieSessionStorage } from "react-router";
 *
 * let sessionStorage = createCookieSessionStorage({
 *   cookie: createCookie("session", { path: "/", sameSite: "lax" }),
 * });
 *
 * let [sessionMiddleware, getSession] =
 *   unstable_createSessionMiddleware(sessionStorage);
 * ```
 *
 * Then you can use the `sessionMiddleware` in your `app/root.tsx` function.
 *
 * ```ts
 * import { sessionMiddleware } from "~/middleware/session.server";
 *
 * export const unstable_middleware = [sessionMiddleware];
 * ```
 *
 * And you can use the `getSession` function in your loaders to get the session
 * object.
 *
 * ```ts
 * import { getSession } from "~/middleware/session.server";
 *
 * export async function loader({ context }: Route.LoaderArgs) {
 *   let session = await getSession(context);
 *   let user = await getUser();
 *   session.set("user", user);
 *   return json({ user });
 * }
 * ```
 *
 * By default the middleware will automaticaly commit the session at the end of
 * the request, but you can customize this behavior by passing a second
 * argument to the `unstable_createSessionMiddleware` function.
 *
 * ```ts
 * let [sessionMiddleware, getSession] = unstable_createSessionMiddleware(
 *   sessionStorage,
 *   shouldCommit
 * );
 * ```
 *
 * The `shouldCommit` function will be called at the end of the request with
 * the previous session data and the session data before the request, if it
 * returns `true` the session will be committed, if it returns `false` the
 * session will be discarded.
 *
 * If you want to commit the session only if the session data changed you can
 * use a library like `dequal` to compare the session data.
 *
 * ```ts
 * import { dequal } from "dequal";
 *
 * let [sessionMiddleware, getSession] = unstable_createSessionMiddleware(
 *   sessionStorage,
 *   (previous, next) => !dequal(previous, next) // Only commit if session changed
 * );
 * ```
 *
 * Or you can use a custom function to compare the session data, maybe only if
 * some specific fields changed.
 *
 * ```ts
 * let [sessionMiddleware, getSession] = unstable_createSessionMiddleware(
 *   sessionStorage,
 *   (previous, next) => {
 *     return current.user.id !== previous.user.id;
 *   }
 * );
 * ```
 * @author [Sergio Xalambrí](https://sergiodxa.com)
 * @module Middleware/Session
 */
import type {
	Session,
	SessionData,
	SessionStorage,
	unstable_MiddlewareFunction,
} from "react-router";

import { unstable_createContext } from "react-router";
import type { unstable_MiddlewareGetter } from "./utils.js";

/**
 * Creates a session middleware that uses the provided session storage object
 * to manage session data.
 *
 * The session middleware will read the session data from the request cookies,
 * and store it in the context for the rest of the middleware or loaders and
 * actions to use.
 *
 * After the middleware chain is done, the session data will be compared to the
 * initial data, and if it changed, the session will be commited to the storage
 * and a Set-Cookie header will be added to the response.
 *
 * This middleware also helps implement rolling sessions by setting the session
 * cookie on every response.
 *
 * @param sessionStorage The session storage object used by the middleware
 * @param shouldCommit A function that compares the previous and next session data
 * to determine if it changed and needs to be commited. Defaults to a function that always returns true.
 * @returns The session middleware and a function to get the session from the context
 *
 * @example
 * // app/middlewares/session.ts
 * import { sessionStorage } from "~/session";
 * import { unstable_createSessionMiddleware } from "remix-utils";
 *
 * export const [sessionMiddleware, getSession] =
 *   unstable_createSessionMiddleware(sessionStorage);
 *
 * // app/root.tsx
 * import { sessionMiddleware } from "~/middlewares/session";
 * export const unstable_middleware = [sessionMiddleware];
 *
 * // app/routes/_index.tsx
 * import { getSession } from "~/middlewares/session";
 *
 * export async function loader({ context }: Route.LoaderArgs) {
 *   let session = getSession(context);
 *   session.set("key", "value"); // This will be commited automatically
 *   return { data: session.get("data") };
 * }
 */
export function unstable_createSessionMiddleware<
	Data = SessionData,
	FlashData = Data,
>(
	sessionStorage: SessionStorage<Data, FlashData>,
	shouldCommit: unstable_createSessionMiddleware.ShouldCommitFunction<Data> = defaultShouldCommit,
): unstable_createSessionMiddleware.ReturnType<Data, FlashData> {
	let sessionContext = unstable_createContext<Session<Data, FlashData>>();

	return [
		async function middleware({ request, context }, next) {
			let session = await sessionStorage.getSession(
				request.headers.get("Cookie"),
			);

			let initialData = structuredClone(session.data);

			context.set(sessionContext, session);

			let response = await next();

			if (shouldCommit(initialData, structuredClone(session.data))) {
				response.headers.append(
					"Set-Cookie",
					await sessionStorage.commitSession(session),
				);
			}

			return response;
		},
		function getSession(context) {
			return context.get(sessionContext);
		},
	];
}

export namespace unstable_createSessionMiddleware {
	export type ShouldCommitFunction<Data> = (
		prev: Partial<Data>,
		next: Partial<Data>,
	) => boolean;

	export type ReturnType<Data, FlashData> = [
		unstable_MiddlewareFunction<Response>,
		unstable_MiddlewareGetter<Session<Data, FlashData>>,
	];
}

function defaultShouldCommit() {
	return true;
}
