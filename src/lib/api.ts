// Shared wrapper for authenticated JSON API routes.
// Gives every route the same behavior: 401 when signed out, readable error messages,
// and no raw stack traces or HTML error pages reaching the browser.
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { currentGuide } from "./auth";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

type Handler<P> = (req: NextRequest, guideId: string, params: P) => Promise<Response>;

export function route<P = Record<string, never>>(handler: Handler<P>) {
  return async (req: NextRequest, ctx: { params: Promise<P> }) => {
    try {
      const guide = await currentGuide();
      if (!guide) return fail(401, "You've been signed out. Sign in again to continue.");
      return await handler(req, guide.id, await ctx.params);
    } catch (e) {
      if (e instanceof HttpError) return fail(e.status, e.message);
      if (e instanceof ZodError) return fail(400, zodMessage(e));
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2002") return fail(409, "That already exists.");
        if (e.code === "P2025") return fail(404, "That record no longer exists.");
        if (e.code === "P2003") return fail(409, "That's still in use, so it can't be removed.");
      }
      console.error(`[api] ${req.method} ${req.nextUrl.pathname}`, e);
      return fail(500, "Something went wrong on our end. Try again in a moment.");
    }
  };
}

/** Parse and validate a JSON body. Throws a 400 with a plain-language message. */
export async function body<S extends ZodTypeAny>(req: NextRequest, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "The request was empty or malformed.");
  }
  return schema.parse(raw);
}

function zodMessage(e: ZodError): string {
  const issue = e.issues[0];
  if (!issue) return "Check the form and try again.";
  const field = issue.path.length ? String(issue.path[issue.path.length - 1]) : "";
  // Custom messages (set in the schema) are already written for people.
  if (issue.code === "custom" || !/^(Required|Invalid|Expected|String|Number|Array)/.test(issue.message)) return issue.message;
  return field ? `Check the "${field}" field and try again.` : "Check the form and try again.";
}
