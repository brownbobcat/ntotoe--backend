import { mongoose } from "../config/db";

export const columnSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  tasks: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    },
  ],
  order: {
    type: Number,
    default: 0,
  },
});

export const Column = mongoose.model("Column", columnSchema);
