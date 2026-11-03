import { Module } from "@nestjs/common";

import { CalculationsController } from "./calculations.controller.js";
import { HealthController } from "./health.controller.js";

@Module({
  controllers: [HealthController, CalculationsController],
})
export class AppModule {}
