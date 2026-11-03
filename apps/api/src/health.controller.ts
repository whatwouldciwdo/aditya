import { Controller, Get } from "@nestjs/common";
import type { HealthResponse } from "@aditya/shared-types";

@Controller()
export class HealthController {
  @Get("health")
  health(): HealthResponse {
    return {
      status: "ok",
      service: "aditya-api",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("ready")
  ready(): HealthResponse {
    return {
      status: "ok",
      service: "aditya-api",
      timestamp: new Date().toISOString(),
    };
  }
}
