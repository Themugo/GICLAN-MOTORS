import { createModel } from "./_base.js";

const model = createModel("ReconciliationReport");

model.generateReportId = () =>
  `REC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export default model;
