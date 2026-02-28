import { Command } from "commander";
import { architectAnalyzeCommand } from "./analyze.js";
import { architectSubmitPlanCommand } from "./submit-plan.js";
import { architectGetPlanCommand } from "./get-plan.js";
import { architectReviseCommand } from "./revise.js";

export const architectCommand = new Command("architect")
  .description("Architecture analysis and buildplan management")
  .addCommand(architectAnalyzeCommand)
  .addCommand(architectSubmitPlanCommand)
  .addCommand(architectGetPlanCommand)
  .addCommand(architectReviseCommand);
