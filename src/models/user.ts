import { mongoose } from "../config/db";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "member"],
      default: "member",
    },
    organizations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
      },
    ],
    resetPasswordToken: String,
    resetPasswordExpires: Number,
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(
      error instanceof Error
        ? error
        : new Error("Unknown error during password hashing")
    );
  }
});

userSchema.methods.verifyPassword = async function (password: string) {
  return bcrypt.compare(password, this.password);
};

export const User = mongoose.model("User", userSchema);
