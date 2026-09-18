import { createServerFn } from "@tanstack/react-start";
import { deliverConvertLead, parseConvertInput, type ConvertResult } from "./convert.ts";

/** Server-only. CONVERT_WEBHOOK_URL never reaches the browser. No auth. No processor. */
export const submitConvertLead = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseConvertInput(input))
  .handler(async ({ data }): Promise<ConvertResult> => {
    return deliverConvertLead(data, {
      CONVERT_WEBHOOK_URL: typeof process === "undefined" ? undefined : process.env.CONVERT_WEBHOOK_URL,
    });
  });
