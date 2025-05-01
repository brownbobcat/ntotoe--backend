import { mongoose } from "../config/db";
import { columnSchema } from "./column";

const boardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    columns: [columnSchema],
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Board = mongoose.model("Board", boardSchema);
