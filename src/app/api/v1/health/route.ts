import { NextResponse } from "next/server";
import { createSuccessResponse } from "@/lib/api-response";

/**
 * @api {get} /api/v1/health Get API Health Status
 * @apiName GetHealth
 * @apiGroup System
 * @apiVersion 1.0.0
 * 
 * @apiSuccess {Boolean} success Whether the request was successful.
 * @apiSuccess {Object} data Health data.
 * @apiSuccess {String} data.status Current status (HEALTHY).
 * @apiSuccess {String} data.environment Current environment.
 */
export async function GET() {
  return NextResponse.json(
    createSuccessResponse({
      status: "HEALTHY",
      environment: process.env.NODE_ENV,
      service: "smartmeet-api",
    })
  );
}
